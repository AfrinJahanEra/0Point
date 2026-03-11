# contest/views.py
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta, timezone
from mongoengine.errors import ValidationError as MEValidationError
import pytz
from .broadcast import broadcast_contest_update
from .models import Contest, ContestProblem, ContestRegistration, TestCase, TestContest, ContestScreenRecording
from .serializers import ContestCreateSerializer, TestContestCreateSerializer
from .utils.auth import get_user_from_request
from account.models import Account
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from mongoengine.queryset.visitor import Q
from contest.models import Contest
from submission.models import Submission
from account.models import Account
from contest.broadcast import broadcast_global_update
from datetime import datetime


class UserProblemStatusAPIView(APIView):
    """Get user's problem status for a contest"""
    
    def get(self, request, contest_id):
        user = get_user_from_request(request)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Initialize status for all problems
        problem_statuses = {}
        for problem in contest.problems:
            problem_statuses[problem.index] = {
                "status": "unsolved",
                "attempts": 0,
                "solved": False,
                "last_submission": None,
                "first_accepted": None,
                "submission_count": 0,
                "accepted_count": 0,
                "points": getattr(problem, 'points', 0) or 0  # ADD THIS LINE
            }
        
        # If user is logged in, fetch their actual submission data
        if user:
            # Get all submissions by this user for this contest
            submissions = Submission.objects(
                contest=contest,
                user=user
            ).order_by('submitted_at')
            
            # Process each submission
            for submission in submissions:
                problem_index = submission.problem_index
                if problem_index not in problem_statuses:
                    continue
                
                status_data = problem_statuses[problem_index]
                status_data["attempts"] += 1
                status_data["submission_count"] += 1
                status_data["last_submission"] = submission.submitted_at
                
                # Check if this submission is accepted
                if submission.verdict in ["AC", "ACCEPTED"]:
                    status_data["accepted_count"] += 1
                    
                    # Mark as solved
                    if not status_data["solved"]:
                        status_data["solved"] = True
                        status_data["status"] = "solved"
                        status_data["first_accepted"] = submission.submitted_at
                        
                        # Calculate contest time for first accepted
                        if submission.contest_time:
                            status_data["contest_time"] = submission.contest_time
                        else:
                            try:
                                if contest.start_time and submission.submitted_at:
                                    dhaka_tz = pytz.timezone('Asia/Dhaka')
                                    if contest.start_time.tzinfo is None:
                                        start_time_dhaka = dhaka_tz.localize(contest.start_time)
                                    else:
                                        start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
                                    if submission.submitted_at.tzinfo is None:
                                        submitted_at_dhaka = dhaka_tz.localize(submission.submitted_at)
                                    else:
                                        submitted_at_dhaka = submission.submitted_at.astimezone(dhaka_tz)
                                    time_diff = (submitted_at_dhaka - start_time_dhaka).total_seconds() / 60.0
                                    status_data["contest_time"] = time_diff
                            except Exception:
                                status_data["contest_time"] = None
                else:
                    if not status_data["solved"] and status_data["status"] == "unsolved":
                        status_data["status"] = "attempted"

        payload = {
            "event": "problem_status",
            "contest_id": str(contest.id),
            "problem_statuses": problem_statuses,
        }

        broadcast_contest_update(contest_id, payload)
        
        return Response({
            "contest_id": str(contest.id),
            "problem_statuses": problem_statuses,
            "user_id": str(user.id) if user else None,
            "total_solved": sum(1 for status in problem_statuses.values() if status["solved"]),
            "total_attempted": sum(1 for status in problem_statuses.values() if status["status"] in ["attempted", "solved"])
        })
    
class ContestProblemTutorialAPIView(APIView):
    """
    API to manage tutorials for contest problems
    """
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request, contest_id, problem_index):
        """Get tutorial for a problem"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Find the problem
        problem = None
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Check access permissions
        user = get_user_from_request(request)
        can_access = False
        
        if get_contest_status(contest) == "past":
            can_access = True
        elif get_contest_status(contest) == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif get_contest_status(contest) in ["live", "upcoming", "test"]:
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
                # Allow creator to access even if not registered
                if not can_access and user and contest.created_by and str(contest.created_by.id) == str(user.id):
                    can_access = True
        
        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this tutorial"
            }, status=403)
        
        # Check if editorial is published
        if get_contest_status(contest) in ["live", "upcoming", "test"] and not contest.editorial_published:
            # Only creator can access tutorial before editorial is published
            if not (user and contest.created_by and str(contest.created_by.id) == str(user.id)):
                return Response({
                    "error": "Editorial not published",
                    "message": "The tutorial will be available after the contest ends"
                }, status=403)
        
        return Response({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "problem_index": problem.index,
            "problem_title": problem.title,
            "tutorial": problem.tutorial or "",
            "created_at": contest.start_time.isoformat() if contest.start_time else None,
            "editorial_published": getattr(contest, 'editorial_published', False)
        })
    
    def put(self, request, contest_id, problem_index):
        """Update tutorial for a problem (creator only)"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is the creator
        if not contest.created_by or str(contest.created_by.id) != str(user.id):
            return Response({"error": "Only contest creator can edit tutorials"}, status=403)
        
        # Find the problem
        problem_idx = -1
        for idx, p in enumerate(contest.problems):
            if p.index == problem_index.upper():
                problem_idx = idx
                break
        
        if problem_idx == -1:
            return Response({"error": "Problem not found"}, status=404)
        
        # Get tutorial content
        tutorial_content = request.data.get('tutorial', '').strip()
        
        # Validate tutorial content (optional)
        if len(tutorial_content) > 10000:  # Limit tutorial size
            return Response({"error": "Tutorial is too long (max 10000 characters)"}, status=400)
        
        # Update the tutorial
        contest.problems[problem_idx].tutorial = tutorial_content
        
        try:
            contest.save()
            return Response({
                "message": "Tutorial updated successfully",
                "contest_id": str(contest.id),
                "problem_index": problem_index,
                "tutorial_length": len(tutorial_content)
            })
        except Exception as e:
            return Response({"error": f"Failed to save tutorial: {str(e)}"}, status=400)
    
    def patch(self, request, contest_id, problem_index):
        """Partial update of tutorial"""
        return self.put(request, contest_id, problem_index)  # Same as PUT for now


class ContestInsideAPIView(APIView):
    """
    Unified endpoint: returns contest info + problems list + user problem statuses
    + announcements in a single DB round-trip.
    Replaces 4 separate requests from ContestInside.jsx.
    """
    _TTL = 30  # seconds for shared contest/problems cache

    def get(self, request, contest_id):
        from django.core.cache import cache
        import pytz
        from datetime import datetime

        user = get_user_from_request(request)

        # ── 1. Contest + problems (shared, short TTL) ───────────────────────
        pub_key = f'contest_inside_pub_{contest_id}'
        pub_data = cache.get(pub_key)

        if pub_data is None:
            try:
                contest = Contest.objects.get(id=contest_id)
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)

            contest_status = get_contest_status(contest)
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            now = datetime.now(dhaka_tz)

            problems_list = []
            for idx, p in enumerate(contest.problems):
                problems_list.append({
                    "id": idx + 1,
                    "problem_id": p.index,
                    "title": p.title,
                    "slug": f"problem-{p.index.lower()}",
                    "code": p.index,
                    "difficulty": p.difficulty or "Medium",
                    "time_limit": p.time_limit_seconds,
                    "memory_limit": p.memory_limit_mb,
                    "tags": list(p.tags or []),
                    "points": getattr(p, 'points', 0) or 0,
                })

            announcements = []
            try:
                from announcement.models import Announcement
                for ann in Announcement.objects(contest=contest).order_by('-created_at')[:20]:
                    announcements.append({
                        "id": str(ann.id),
                        "text": ann.text,
                        "topic": ann.topic or '',
                        "problem_index": ann.problem_index or '',
                        "is_important": ann.is_important,
                        "author": ann.author.username if ann.author else 'Admin',
                        "created_at": ann.created_at.isoformat() if ann.created_at else None,
                    })
            except Exception:
                pass

            pub_data = {
                "id": str(contest.id),
                "title": contest.title,
                "description": contest.description or '',
                "start_time": contest.start_time.isoformat() if contest.start_time else None,
                "duration": contest.duration,
                "type": contest.type,
                "platform": contest.platform,
                "status": contest_status,
                "visibility": contest.visibility,
                "registration_required": contest.registration_required,
                "require_screen_recording": contest.require_screen_recording,
                "participants": ContestRegistration.objects(contest=contest).count(),
                "problems": problems_list,
                "announcements": announcements,
                "created_by_id": str(contest.created_by.id) if contest.created_by else None,
            }
            cache.set(pub_key, pub_data, timeout=self._TTL)

        # ── 2. Access check ─────────────────────────────────────────────────
        contest_status = pub_data['status']
        created_by_id  = pub_data.get('created_by_id')
        user_id        = str(user.id) if user else None
        is_creator     = user_id and created_by_id == user_id
        can_access     = False

        is_registered = False
        if contest_status == 'past':
            can_access = True
            is_registered = True
        elif contest_status == 'draft':
            can_access = bool(is_creator)
            is_registered = bool(is_creator)
        elif contest_status in ('live', 'upcoming', 'test'):
            if user:
                try:
                    from bson import ObjectId
                    reg = ContestRegistration.objects(
                        user=user, contest=ObjectId(contest_id)
                    ).first()
                    is_registered = bool(reg) or bool(is_creator)
                    can_access = is_registered
                except Exception:
                    can_access = bool(is_creator)
                    is_registered = bool(is_creator)

        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest",
                "contest_status": contest_status,
                "can_register": contest_status in ("live", "upcoming"),
            }, status=403)

        # ── 3. Per-user problem statuses (never cached publicly) ────────────
        problem_statuses = {p['code']: {
            "status": "unsolved", "attempts": 0, "solved": False,
            "submission_count": 0, "accepted_count": 0,
            "last_submission": None, "first_accepted": None,
            "points": p['points'],
        } for p in pub_data['problems']}

        if user:
            try:
                contest_obj = Contest.objects.get(id=contest_id)
                submissions = Submission.objects(
                    contest=contest_obj, user=user
                ).only('problem_index', 'verdict', 'submitted_at', 'contest_time').order_by('submitted_at')

                dhaka_tz = pytz.timezone('Asia/Dhaka')
                for sub in submissions:
                    pidx = sub.problem_index
                    if pidx not in problem_statuses:
                        continue
                    sd = problem_statuses[pidx]
                    sd['attempts'] += 1
                    sd['submission_count'] += 1
                    sd['last_submission'] = sub.submitted_at.isoformat() if sub.submitted_at else None
                    if sub.verdict in ('AC', 'ACCEPTED'):
                        sd['accepted_count'] += 1
                        if not sd['solved']:
                            sd['solved'] = True
                            sd['status'] = 'solved'
                            sd['first_accepted'] = sub.submitted_at.isoformat() if sub.submitted_at else None
                            if sub.contest_time:
                                sd['contest_time'] = sub.contest_time
                    elif not sd['solved'] and sd['status'] == 'unsolved':
                        sd['status'] = 'attempted'
            except Exception:
                pass

        # ── 4. Virtual contest check (lightweight) ──────────────────────────
        has_virtual    = False
        virtual_id     = None
        if user:
            try:
                from virtual.models import VirtualContest
                from bson import ObjectId
                vc = VirtualContest.objects(
                    user=user,
                    original_contest=ObjectId(contest_id),
                    is_completed=False
                ).only('id').first()
                if vc:
                    has_virtual = True
                    virtual_id  = str(vc.id)
            except Exception:
                pass

        return Response({
            "contest": {
                **pub_data,
                "is_creator": bool(is_creator),
                "access": {
                    "can_access": can_access,
                    "is_registered": is_registered,
                    "can_register": contest_status in ("live", "upcoming"),
                }
            },
            "problems": pub_data['problems'],
            "problem_statuses": problem_statuses,
            "announcements": pub_data['announcements'],
            "is_creator": bool(is_creator),
            "has_virtual_contest": has_virtual,
            "virtual_contest_id": virtual_id,
            "total_solved": sum(1 for s in problem_statuses.values() if s['solved']),
            "total_attempted": sum(1 for s in problem_statuses.values() if s['status'] in ('attempted', 'solved')),
        })


class ContestProblemsAPIView(APIView):
    _TTL = 30  # shared cache for problem list (30s)

    def get(self, request, contest_id):
        from django.core.cache import cache

        user = get_user_from_request(request)

        # ── 1. Shared cache for problems list + contest info ──────────────────
        pub_key  = f'contest_problems_pub_{contest_id}'
        pub_data = cache.get(pub_key)

        if pub_data is None:
            try:
                contest = Contest.objects.get(id=contest_id)
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)
            except Exception as e:
                return Response({"error": f"Server error: {str(e)}"}, status=500)

            contest_status    = get_contest_status(contest)
            participant_count = ContestRegistration.objects(contest=contest).count()

            problems_list = []
            for idx, problem in enumerate(contest.problems):
                problems_list.append({
                    "id":            idx + 1,
                    "problem_id":    problem.index,
                    "title":         problem.title,
                    "slug":          f"problem-{problem.index.lower()}",
                    "code":          problem.index,
                    "difficulty":    problem.difficulty or "Medium",
                    "time_limit":    problem.time_limit_seconds,
                    "memory_limit":  problem.memory_limit_mb,
                    "tags":          list(problem.tags or []),
                    "points":        getattr(problem, 'points', 0) or 0,
                    "solved_count":  0,
                    "attempted_count": 0,
                    "status":        "unsolved",
                })

            pub_data = {
                "problems": problems_list,
                "contest_info": {
                    "id":             str(contest.id),
                    "title":          contest.title,
                    "status":         contest_status,
                    "start_time":     contest.start_time.isoformat() if contest.start_time else None,
                    "duration":       contest.duration,
                    "platform":       contest.platform,
                    "type":           contest.type,
                    "description":    contest.description,
                    "total_problems": len(contest.problems),
                    "participants":   participant_count,
                },
                "_created_by_id": str(contest.created_by.id) if contest.created_by else None,
                "_contest_status": contest_status,
            }
            cache.set(pub_key, pub_data, timeout=self._TTL)

        # ── 2. Access check (uses cached data, no extra DB hit) ───────────────
        contest_status = pub_data['_contest_status']
        created_by_id  = pub_data['_created_by_id']
        user_id        = str(user.id) if user else None
        is_creator     = bool(user_id and created_by_id == user_id)
        can_access     = False

        if contest_status == 'past':
            can_access = True
        elif contest_status == 'draft':
            can_access = is_creator
        elif contest_status in ('live', 'upcoming', 'test'):
            if user:
                try:
                    from bson import ObjectId
                    reg = ContestRegistration.objects(
                        user=user, contest=ObjectId(contest_id)
                    ).first()
                    can_access = bool(reg) or is_creator
                except Exception:
                    can_access = is_creator

        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest",
                "contest_status": contest_status,
                "can_register": contest_status in ("live", "upcoming"),
            }, status=403)

        # ── 3. Check if full details requested (for edit mode) ────────────────
        full_details = request.query_params.get('full', 'false').lower() == 'true'

        if full_details and is_creator:
            # Return full problem details for editing
            try:
                contest = Contest.objects.get(id=contest_id)
                full_problems = []
                for problem in contest.problems:
                    full_problems.append({
                        "id": problem.index,
                        "problem_id": problem.index,
                        "title": problem.title,
                        "code": problem.index,
                        "difficulty": problem.difficulty or "Medium",
                        "time_limit": problem.time_limit_seconds,
                        "memory_limit": problem.memory_limit_mb,
                        "tags": list(problem.tags or []),
                        "points": getattr(problem, 'points', 0) or 0,
                        "statement": problem.statement or '',
                        "tutorial": problem.tutorial or '',
                        "test_cases": [
                            {
                                "input": tc.input or '',
                                "output": tc.output or '',
                                "explanation": tc.explanation or ''
                            }
                            for tc in (problem.test_cases or [])
                        ],
                    })
                return Response({
                    "problems": full_problems,
                    "contest_info": pub_data['contest_info'],
                    "access_granted": can_access,
                })
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)

        return Response({
            "problems":      pub_data['problems'],
            "contest_info":  pub_data['contest_info'],
            "access_granted": can_access,
        })
    
def update_contest_schema():
    """Add editorial_published field to existing contests"""
    for contest in Contest.objects.all():
        if not hasattr(contest, 'editorial_published'):
            contest.editorial_published = False
            contest.save()
    print("Schema updated successfully")

class ContestProblemDetailAPIView(APIView):
    _TTL = 60  # problem data rarely changes during a contest

    def get(self, request, contest_id, problem_index):
        from django.core.cache import cache

        user = get_user_from_request(request)
        problem_index_upper = problem_index.upper()

        # ── 1. Shared cache: contest meta + problem data (no user info) ────────
        pub_key  = f'contest_problem_pub_{contest_id}_{problem_index_upper}'
        pub_data = cache.get(pub_key)

        if pub_data is None:
            try:
                contest = Contest.objects.get(id=contest_id)
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)

            # Find the problem
            problem = None
            for p in contest.problems:
                if p.index == problem_index_upper:
                    problem = p
                    break

            if not problem:
                return Response({"error": "Problem not found"}, status=404)

            contest_status   = get_contest_status(contest)
            created_by_id    = str(contest.created_by.id) if contest.created_by else None

            # Sample test cases (public)
            sample_cases = []
            all_cases    = []
            for tc in problem.test_cases:
                if tc.sample and not getattr(tc, 'hidden', False):
                    sample_cases.append({
                        "input":       tc.input,
                        "output":      tc.output,
                        "explanation": tc.explanation,
                    })
                all_cases.append({
                    "input":       tc.input,
                    "output":      tc.output,
                    "explanation": tc.explanation,
                    "sample":      tc.sample,
                    "hidden":      getattr(tc, 'hidden', False),
                })

            editorial_published = getattr(contest, 'editorial_published', False)

            pub_data = {
                "contest_id":       str(contest.id),
                "contest_title":    contest.title,
                "contest_status":   contest_status,
                "contest_platform": contest.platform,
                "contest_type":     contest.type,
                "problem_index":    problem.index,
                "problem_code":     problem.index,
                "title":            problem.title,
                "statement":        problem.statement,
                "input_format":     "",
                "output_format":    "",
                "constraints":      "",
                "time_limit":       problem.time_limit_seconds,
                "memory_limit":     problem.memory_limit_mb,
                "difficulty":       problem.difficulty or "Medium",
                "tags":             list(problem.tags or []),
                "tutorial":         problem.tutorial or "",
                "points":           getattr(problem, 'points', 0) or 0,
                "sample_test_cases": sample_cases,
                "_all_test_cases":   all_cases,  # only sent to creator
                "_created_by_id":    created_by_id,
                "_editorial_published": editorial_published,
                "solved_count":     0,
                "attempted_count":  0,
                "accuracy":         "0%",
            }
            cache.set(pub_key, pub_data, timeout=self._TTL)

        # ── 2. Access check (uses cached data) ──────────────────────────────
        contest_status    = pub_data['contest_status']
        created_by_id     = pub_data['_created_by_id']
        user_id           = str(user.id) if user else None
        is_creator        = bool(user_id and created_by_id == user_id)
        can_access        = False
        needs_registration = False

        if contest_status == 'past':
            can_access = True
        elif contest_status == 'draft':
            can_access = is_creator
        elif contest_status in ('live', 'upcoming', 'test'):
            if user:
                try:
                    from bson import ObjectId
                    reg = ContestRegistration.objects(
                        user=user, contest=ObjectId(contest_id)
                    ).first()
                    can_access = bool(reg) or is_creator
                    if not can_access:
                        needs_registration = True
                except Exception:
                    can_access = is_creator
            else:
                needs_registration = True

        if not can_access:
            return Response({
                "error": "Registration required" if needs_registration else "Access denied",
                "message": "You need to register for this contest to access this problem",
                "contest_status": contest_status,
                "can_register": contest_status in ("live", "upcoming"),
            }, status=403)

        # ── 3. Build response (hide private fields) ────────────────────────
        editorial_published = pub_data['_editorial_published']
        tutorial_available  = False
        if pub_data['tutorial'].strip():
            if contest_status == 'past':
                tutorial_available = True
            elif is_creator:
                tutorial_available = True
            elif editorial_published:
                tutorial_available = True

        result = {k: v for k, v in pub_data.items() if not k.startswith('_')}
        result['tutorial_available'] = tutorial_available
        # Only send full test cases to creator
        result['test_cases'] = pub_data['_all_test_cases'] if is_creator else []

        return Response(result)

class ContestUpdateAPIView(APIView):
    def patch(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            contest = Contest.objects.get(id=contest_id, created_by=user)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found or access denied"}, status=404)

        # Only allow updates for drafts
        if contest.status != "draft":
            return Response({"error": "Only draft contests can be updated"}, status=400)

        serializer = ContestCreateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # Update contest fields
        updated_data = serializer.validated_data
        
        # Update basic fields
        for field in ['title', 'description', 'start_time', 'duration', 'type', 'platform', 'status']:  # ADD 'status' here
            if field in updated_data:
                setattr(contest, field, updated_data[field])
        
        # Also update contest settings fields if provided
        for field in ['visibility', 'registration_required', 'email_notifications', 
                     'leaderboard_public', 'allow_practice', 'rating_changes']:
            if field in updated_data:
                setattr(contest, field, updated_data[field])

        # Update problems if provided
        if 'problems' in updated_data:
            # Create a map of existing problems by index for easy lookup
            existing_problems = {p.index: p for p in contest.problems}
            
            new_problems = []
            for problem_data in updated_data['problems']:
                problem_index = problem_data.get('index')
                
                if problem_index in existing_problems:
                    # Update existing problem
                    existing_problem = existing_problems[problem_index]
                    
                    # Preserve tutorial if not provided in update
                    if 'tutorial' not in problem_data and hasattr(existing_problem, 'tutorial'):
                        problem_data['tutorial'] = existing_problem.tutorial
                    
                    test_cases_data = problem_data.pop('test_cases', [])
                    tutorial = problem_data.pop('tutorial', existing_problem.tutorial if hasattr(existing_problem, 'tutorial') else '')
                    
                    testcases = [TestCase(**tc) for tc in test_cases_data]
                    
                    # Update the existing problem's fields
                    for key, value in problem_data.items():
                        setattr(existing_problem, key, value)
                    
                    existing_problem.test_cases = testcases
                    existing_problem.tutorial = tutorial
                    new_problems.append(existing_problem)
                else:
                    # Create new problem
                    test_cases_data = problem_data.pop('test_cases', [])
                    tutorial = problem_data.pop('tutorial', '')
                    
                    testcases = [TestCase(**tc) for tc in test_cases_data]
                    
                    problem = ContestProblem(
                        **problem_data,
                        test_cases=testcases,
                        tutorial=tutorial
                    )
                    new_problems.append(problem)
            
            contest.problems = new_problems

        # Update editorial published status if provided
        if 'editorial_published' in updated_data:
            contest.editorial_published = updated_data['editorial_published']

        # Update test contest fields
        if 'testers' in updated_data:
            contest.testers = updated_data['testers']
        if 'test_start_time' in updated_data:
            contest.test_start_time = updated_data['test_start_time']

        try:
            contest.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        # Invalidate user's draft cache so Contests page shows the updated draft
        try:
            from django.core.cache import cache
            from utils.cache_keys import invalidate_contest
            invalidate_contest(str(contest.id), str(user.id))
        except Exception:
            pass

        return Response({
            "message": "Contest updated successfully",
            "id": str(contest.id),
            "status": contest.status,
            "problems_updated": len(contest.problems)
        })

class ContestPublishAPIView(APIView):
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            contest = Contest.objects.get(id=contest_id, created_by=user)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found or access denied"}, status=404)

        # Get current status
        current_status = get_contest_status(contest)
        
        # FIRST, update the contest with request data
        # Update start_time if provided
        if 'start_time' in request.data:
            try:
                contest.start_time = datetime.fromisoformat(request.data['start_time'].replace('Z', '+00:00'))
            except Exception as e:
                return Response({"error": f"Invalid start_time format: {str(e)}"}, status=400)
        
        # Update duration if provided
        if 'duration' in request.data:
            contest.duration = request.data['duration']
        
        # Update type if provided
        if 'type' in request.data:
            contest.type = request.data['type']
        
        # Update platform if provided
        if 'platform' in request.data:
            contest.platform = request.data['platform']
        
        # Update problems if provided (though usually they're already there)
        if 'problems' in request.data and request.data['problems']:
            # Handle problems update similar to ContestUpdateAPIView
            existing_problems = {p.index: p for p in contest.problems}
            new_problems = []
            
            for problem_data in request.data['problems']:
                problem_index = problem_data.get('index')
                
                if problem_index in existing_problems:
                    # Update existing problem
                    existing_problem = existing_problems[problem_index]
                    
                    # Preserve tutorial if not provided
                    if 'tutorial' not in problem_data and hasattr(existing_problem, 'tutorial'):
                        problem_data['tutorial'] = existing_problem.tutorial
                    
                    test_cases_data = problem_data.pop('test_cases', [])
                    tutorial = problem_data.pop('tutorial', existing_problem.tutorial if hasattr(existing_problem, 'tutorial') else '')
                    
                    testcases = [TestCase(**tc) for tc in test_cases_data]
                    
                    # Update fields
                    for key, value in problem_data.items():
                        setattr(existing_problem, key, value)
                    
                    existing_problem.test_cases = testcases
                    existing_problem.tutorial = tutorial
                    new_problems.append(existing_problem)
                else:
                    # Create new problem
                    test_cases_data = problem_data.pop('test_cases', [])
                    tutorial = problem_data.pop('tutorial', '')
                    
                    testcases = [TestCase(**tc) for tc in test_cases_data]
                    
                    problem = ContestProblem(
                        **problem_data,
                        test_cases=testcases,
                        tutorial=tutorial
                    )
                    new_problems.append(problem)
            
            contest.problems = new_problems
        
        # NOW check if contest can be made active
        if current_status == "draft":
            required_fields = ["start_time", "duration", "type", "platform", "problems"]
            missing_fields = [f for f in required_fields if not getattr(contest, f)]
            if missing_fields:
                return Response({"error": f"Missing fields to make contest active: {missing_fields}"}, status=400)
            
            # Check if user wants to convert to test contest
            convert_to_test = request.data.get("convert_to_test", False)
            
            if convert_to_test:
                testers = request.data.get("testers", [])
                test_start_time = request.data.get("testStartTime")
                
                if not testers or not test_start_time:
                    return Response({"error": "Test contest requires testers and test start time"}, status=400)
                
                try:
                    if isinstance(test_start_time, str):
                        contest.test_start_time = datetime.fromisoformat(test_start_time.replace('Z', '+00:00'))
                except Exception as e:
                    return Response({"error": f"Invalid test start time format: {str(e)}"}, status=400)
                
                contest.testers = testers
                # Set status to "test" for test contests
                contest.status = "test"
            else:
                # Set status to "upcoming" for regular published contests
                contest.status = "upcoming"
        
        # Update editorial published status if provided
        if 'editorial_published' in request.data:
            contest.editorial_published = request.data['editorial_published']
        
        try:
            contest.save()
            
            # Invalidate caches: draft is now published, move it to public list
            try:
                from django.core.cache import cache
                from utils.cache_keys import invalidate_contest
                invalidate_contest(str(contest.id), str(user.id))
            except Exception:
                pass
            
            # Get updated status - now it should be "upcoming" or "test"
            updated_status = get_contest_status(contest)
            
            return Response({
                "message": f"Contest published successfully", 
                "id": str(contest.id),
                "status": updated_status,
                "stored_status": contest.status,  # Also return the stored status
                "editorial_published": contest.editorial_published,
                "is_draft": updated_status == "draft",
                "is_test": updated_status == "test"
            })
        except Exception as e:
            return Response({"error": f"Failed to save contest: {str(e)}"}, status=400)
        
def get_contest_status(contest):

    is_test_contest = hasattr(contest, 'original_contest')
    
    if is_test_contest:
        dhaka_tz = pytz.timezone('Asia/Dhaka')
        now = datetime.now(dhaka_tz)

        start_time = contest.test_start_time

        if start_time.tzinfo is None:
            start_time = dhaka_tz.localize(start_time)
        elif str(start_time.tzinfo) != 'Asia/Dhaka':
            start_time = start_time.astimezone(dhaka_tz)

        duration_minutes = contest.duration * 60 if contest.duration else 0
        end_time = start_time + timedelta(minutes=duration_minutes)

        if now < start_time:
            return "upcoming"
        elif start_time <= now <= end_time:
            return "live"
        else:
            return "past"

    if hasattr(contest, 'status') and contest.status == "draft":
        return "draft"
    

    # Check for test contests first
    if hasattr(contest, 'test_start_time') and contest.test_start_time:
        dhaka_tz = pytz.timezone('Asia/Dhaka')
        now = datetime.now(dhaka_tz)
        test_start_time = contest.test_start_time
        
        # Ensure test_start_time is in Dhaka timezone
        if test_start_time.tzinfo is None:
            test_start_time = dhaka_tz.localize(test_start_time)
        elif str(test_start_time.tzinfo) != 'Asia/Dhaka':
            test_start_time = test_start_time.astimezone(dhaka_tz)
        
        # Check if it's a test contest - use contest.duration for test duration
        # Convert duration from hours to minutes
        duration_hours = contest.duration if contest.duration else 0
        duration_minutes = duration_hours * 60
        test_end_time = test_start_time + timedelta(minutes=duration_minutes)
        
        if now < test_start_time:
            calculated_status = "upcoming"
        elif test_start_time <= now <= test_end_time:
            calculated_status = "test"
        else:
            calculated_status = "past"
    else:
        # Check if contest has all required fields
        required_fields = [
            contest.start_time is not None,
            contest.duration is not None,
            contest.type is not None,
            contest.platform is not None,
            contest.problems is not None and len(contest.problems) > 0
        ]
        
        # If any required field is missing, it's a draft
        if not all(required_fields):
            calculated_status = "draft"
        else:
            # Use Asia/Dhaka timezone
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            
            # Current time in Dhaka
            now = datetime.now(dhaka_tz)
            
            if not contest.start_time:
                calculated_status = "draft"
            else:
                start_time = contest.start_time
                
                # Ensure start_time is in Dhaka timezone
                if start_time.tzinfo is None:
                    start_time = dhaka_tz.localize(start_time)
                elif str(start_time.tzinfo) != 'Asia/Dhaka':
                    start_time = start_time.astimezone(dhaka_tz)
                
                # Convert duration from hours to minutes
                duration_hours = contest.duration if contest.duration else 0
                duration_minutes = duration_hours * 60
                
                # Calculate end time
                end_time = start_time + timedelta(minutes=duration_minutes)
                
                # Determine status based on current time
                if now < start_time:
                    calculated_status = "upcoming"
                elif start_time <= now <= end_time:
                    calculated_status = "live"
                else:
                    calculated_status = "past"
    
    # Update the contest status in database if it has changed and it's not a draft
    if (hasattr(contest, 'status') and 
        contest.status != calculated_status and 
        contest.status != "draft"):
        
        # Only update if the new status is different and we're moving forward in time
        # (upcoming -> live, live -> past, upcoming -> past, etc.)
        status_order = {"draft": 0, "upcoming": 1, "live": 2, "test": 2, "past": 3}
        current_order = status_order.get(contest.status, -1)
        new_order = status_order.get(calculated_status, -1)
        
        if new_order > current_order:
            try:
                contest.status = calculated_status
                contest.save()
            except Exception:
                pass  # Don't fail, just continue with calculated status
    
    return calculated_status

class ContestListCreateAPIView(APIView):
    _TTL_PUBLIC = 30  # 30 s shared cache for published contests

    def get(self, request):
        from django.core.cache import cache
        from utils.cache_keys import CK, TTL_CONTEST_LIST
        user = get_user_from_request(request)
        user_id = str(user.id) if user else None

        # ── Shared public cache (anonymous / all users) ─────────────────────
        pub_key  = CK.contest_list()
        pub_data = cache.get(pub_key)

        try:
            # Get all contests (no status filter needed now)
            contests = Contest.objects.all().order_by("-start_time").limit(200)

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("-test_start_time").limit(50)
            
            data = []

            for c in contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                # Filter out drafts for non-creators
                if status_value == "draft":
                    if not user or not c.created_by or str(c.created_by.id) != str(user.id):
                        continue
                
                participant_count = ContestRegistration.objects(contest=c).count()
                
                is_creator = user and c.created_by and str(c.created_by.id) == str(user.id)

                data.append({
                    "id": str(c.id),
                    "title": c.title,
                    "description": c.description,
                    "start_time": c.start_time.isoformat() if c.start_time else None,
                    "duration": c.duration,
                    "type": c.type,
                    "platform": c.platform,
                    "created_by": str(c.created_by.id) if c.created_by else None,
                    "is_creator": is_creator,
                    "status": status_value,  # Use calculated status
                    "participants": participant_count,
                })

            for tc in test_contests:
                status_value = get_contest_status(tc)
                
                participant_count = ContestRegistration.objects(contest=tc).count()
                
                data.append({
                    "id": str(tc.id),
                    "title": f"[TEST] {tc.title}",
                    "description": tc.description,
                    "start_time": tc.test_start_time.isoformat() if tc.test_start_time else None,
                    "duration": tc.duration,
                    "type": tc.type,
                    "platform": tc.platform,
                    "created_by": str(tc.created_by.id) if tc.created_by else None,
                    "is_creator": user and tc.created_by and str(tc.created_by.id) == str(user.id),
                    "status": status_value,
                    "participants": participant_count,
                    "is_test_contest": True,  # Flag to identify test contests
                    "original_contest_id": str(tc.original_contest.id) if tc.original_contest else None,
                    "testers_count": len(tc.testers)
                })

            # Broadcast update
            broadcast_global_update({
                "event": "contest_list_update",
                "contests": data,
            })

            # Cache the public (non-draft) portion for fast subsequent reads
            try:
                public_only = [c for c in data if c.get('status') != 'draft']
                cache.set(pub_key, public_only, timeout=TTL_CONTEST_LIST)
            except Exception:
                pass

            return Response({"contests": data})
        except Exception as e:
            # Return empty contests list if database is unavailable
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)


class UpcomingContestListCreateAPIView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get upcoming contests only - limit for performance
            all_contests = Contest.objects.all().order_by("start_time").limit(50)

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("test_start_time").limit(20)
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                # Only include upcoming contests
                if status_value != "upcoming":
                    continue
                
                # Filter out drafts for non-creators
                if status_value == "draft":
                    if not user or not c.created_by or str(c.created_by.id) != str(user.id):
                        continue
                
                # Skip participant count for performance
                participant_count = getattr(c, 'participant_count', 0) or 0
                
                is_creator = user and c.created_by and str(c.created_by.id) == str(user.id)

                data.append({
                    "id": str(c.id),
                    "title": c.title,
                    "description": c.description,
                    "start_time": c.start_time.isoformat() if c.start_time else None,
                    "duration": c.duration,
                    "type": c.type,
                    "platform": c.platform,
                    "created_by": str(c.created_by.id) if c.created_by else None,
                    "is_creator": is_creator,
                    "status": status_value,
                    "participants": participant_count,
                })

            for tc in test_contests:
                status_value = get_contest_status(tc)
                
                # Only include upcoming test contests
                if status_value != "upcoming":
                    continue
                
                participant_count = getattr(tc, 'participant_count', 0) or 0
                
                data.append({
                    "id": str(tc.id),
                    "title": f"[TEST] {tc.title}",
                    "description": tc.description,
                    "start_time": tc.test_start_time.isoformat() if tc.test_start_time else None,
                    "duration": tc.duration,
                    "type": tc.type,
                    "platform": tc.platform,
                    "created_by": str(tc.created_by.id) if tc.created_by else None,
                    "is_creator": user and tc.created_by and str(tc.created_by.id) == str(user.id),
                    "status": status_value,
                    "participants": participant_count,
                    "is_test_contest": True,
                    "original_contest_id": str(tc.original_contest.id) if tc.original_contest else None,
                    "testers_count": len(tc.testers)
                })

            return Response({"contests": data})
        except Exception as e:
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)



class SoonestUpcomingContestView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get all contests
            all_contests = Contest.objects.all().order_by("start_time")
            
            # Find the soonest upcoming contest
            soonest_contest = None
            
            for c in all_contests:
                status_value = get_contest_status(c)
                if status_value == "upcoming":
                    soonest_contest = c
                    break
            
            if not soonest_contest:
                return Response({
                    "has_contest": False,
                    "message": "No upcoming contests"
                }, status=status.HTTP_200_OK)
            
            # Calculate time until contest starts
            from datetime import datetime, timezone
            
            # Make sure start_time is timezone-aware
            if soonest_contest.start_time.tzinfo is None:
                # If start_time is naive, assume it's UTC and make it aware
                start_time = soonest_contest.start_time.replace(tzinfo=timezone.utc)
            else:
                start_time = soonest_contest.start_time
            
            now = datetime.now(timezone.utc)
            time_until = start_time - now
            
            # Extract days, hours, minutes, seconds
            days = time_until.days
            hours = time_until.seconds // 3600
            minutes = (time_until.seconds % 3600) // 60
            seconds = time_until.seconds % 60
            
            return Response({
                "has_contest": True,
                "contest_id": str(soonest_contest.id),
                "title": soonest_contest.title,
                "start_time": soonest_contest.start_time.isoformat() if soonest_contest.start_time else None,
                "time_until": {
                    "days": max(0, days),
                    "hours": max(0, hours),
                    "minutes": max(0, minutes),
                    "seconds": max(0, seconds)
                },
                "duration": soonest_contest.duration,
                "type": soonest_contest.type,
                "platform": soonest_contest.platform,
                "participants": ContestRegistration.objects(contest=soonest_contest).count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            return Response({
                "has_contest": False,
                "error": f"Failed to fetch contest data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PastContestsListCreateView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get past contests only - limit to 50 for performance
            all_contests = Contest.objects.all().order_by("-start_time").limit(50)

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("-test_start_time").limit(20)
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                # Only include past/completed contests
                if status_value != "completed" and status_value != "past":
                    continue
                
                # Filter out drafts for non-creators
                if status_value == "draft":
                    if not user or not c.created_by or str(c.created_by.id) != str(user.id):
                        continue
                
                # Skip participant count for performance - use cached value if available
                participant_count = getattr(c, 'participant_count', 0) or 0
                
                is_creator = user and c.created_by and str(c.created_by.id) == str(user.id)

                data.append({
                    "id": str(c.id),
                    "title": c.title,
                    "description": c.description,
                    "start_time": c.start_time.isoformat() if c.start_time else None,
                    "duration": c.duration,
                    "type": c.type,
                    "platform": c.platform,
                    "created_by": str(c.created_by.id) if c.created_by else None,
                    "is_creator": is_creator,
                    "status": status_value,
                    "participants": participant_count,
                })

            for tc in test_contests:
                status_value = get_contest_status(tc)
                
                # Only include past test contests
                if status_value != "completed" and status_value != "past":
                    continue
                
                participant_count = getattr(tc, 'participant_count', 0) or 0
                
                data.append({
                    "id": str(tc.id),
                    "title": f"[TEST] {tc.title}",
                    "description": tc.description,
                    "start_time": tc.test_start_time.isoformat() if tc.test_start_time else None,
                    "duration": tc.duration,
                    "type": tc.type,
                    "platform": tc.platform,
                    "created_by": str(tc.created_by.id) if tc.created_by else None,
                    "is_creator": user and tc.created_by and str(tc.created_by.id) == str(user.id),
                    "status": status_value,
                    "participants": participant_count,
                    "is_test_contest": True,
                    "original_contest_id": str(tc.original_contest.id) if tc.original_contest else None,
                    "testers_count": len(tc.testers)
                })

            return Response({"contests": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)

class LiveContestsView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get live contests only - limit for performance
            all_contests = Contest.objects.all().order_by("-start_time").limit(50)

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("-test_start_time").limit(20)
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                # Only include live/ongoing contests
                if status_value != "ongoing" and status_value != "live":
                    continue
                
                # Filter out drafts for non-creators
                if status_value == "draft":
                    if not user or not c.created_by or str(c.created_by.id) != str(user.id):
                        continue
                
                # Skip participant count for performance
                participant_count = getattr(c, 'participant_count', 0) or 0
                
                is_creator = user and c.created_by and str(c.created_by.id) == str(user.id)

                data.append({
                    "id": str(c.id),
                    "title": c.title,
                    "description": c.description,
                    "start_time": c.start_time.isoformat() if c.start_time else None,
                    "duration": c.duration,
                    "type": c.type,
                    "platform": c.platform,
                    "created_by": str(c.created_by.id) if c.created_by else None,
                    "is_creator": is_creator,
                    "status": status_value,
                    "participants": participant_count,
                })

            for tc in test_contests:
                status_value = get_contest_status(tc)
                
                # Only include live test contests
                if status_value != "ongoing" and status_value != "live":
                    continue
                
                participant_count = getattr(tc, 'participant_count', 0) or 0
                
                data.append({
                    "id": str(tc.id),
                    "title": f"[TEST] {tc.title}",
                    "description": tc.description,
                    "start_time": tc.test_start_time.isoformat() if tc.test_start_time else None,
                    "duration": tc.duration,
                    "type": tc.type,
                    "platform": tc.platform,
                    "created_by": str(tc.created_by.id) if tc.created_by else None,
                    "is_creator": user and tc.created_by and str(tc.created_by.id) == str(user.id),
                    "status": status_value,
                    "participants": participant_count,
                    "is_test_contest": True,
                    "original_contest_id": str(tc.original_contest.id) if tc.original_contest else None,
                    "testers_count": len(tc.testers)
                })

            return Response({"contests": data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)

class ContestFullCreateAPIView(APIView):
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = ContestCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        rating = getattr(user, "rating", None)
        try:
            rating_value = int(rating) if rating is not None else None
        except:
            rating_value = None

        if rating_value is not None and rating_value < 1500:
            return Response({"error": "Rating >= 1500 needed to create contests"}, status=403)

        # Build contest
        contest = serializer.create(serializer.validated_data)
        contest.created_by = user
        
        # Check if this should be a test contest
        is_test_contest = request.data.get("is_test_contest", False)
        
        if is_test_contest:
            # Handle test contest specific fields
            testers = request.data.get("testers", [])
            test_start_time = request.data.get("test_start_time")
            
            if not testers or not test_start_time:
                return Response({"error": "Test contest requires testers and test_start_time"}, status=400)
            
            contest.testers = testers
            try:
                contest.test_start_time = datetime.fromisoformat(test_start_time.replace('Z', '+00:00'))
            except Exception as e:
                return Response({"error": f"Invalid test_start_time format: {str(e)}"}, status=400)
        
        # Set editorial published if provided
        if 'editorial_published' in request.data:
            contest.editorial_published = request.data['editorial_published']

        try:
            contest.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        # Invalidate user's draft cache so Contests page shows the new draft
        try:
            from django.core.cache import cache
            from utils.cache_keys import CK
            cache.delete(CK.contest_drafts(str(user.id)))
            cache.delete(CK.contest_list())
        except Exception:
            pass

        return Response({
            "message": f"Contest created successfully",
            "id": str(contest.id),
            "status": contest.status,
            "editorial_published": contest.editorial_published,
            "is_draft": contest.status == "draft"
        }, status=201)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Contest, ContestRegistration
from .utils.auth import get_user_from_request

class ContestRegisterAPIView(APIView):
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        except Exception as e:
            return Response({"error": "Database temporarily unavailable"}, status=503)
        
        # Check if contest is in a state that allows registration
        try:
            if get_contest_status(contest) not in ["live", "upcoming"]:
                return Response({"error": "Registration is closed for this contest"}, status=400)
            
            # Check if already registered
            existing = ContestRegistration.objects(user=user, contest=contest).first()
            if existing:
                return Response({"message": "Already registered"}, status=200)

            # Create registration
            registration = ContestRegistration(user=user, contest=contest)
            try:
                registration.save()
            except Exception as e:
                return Response({"error": str(e)}, status=400)

            # Invalidate per-user registration cache so next detail call reflects the new status
            from django.core.cache import cache
            from utils.cache_keys import CK
            cache.delete(CK.contest_registration(str(contest.id), str(user.id)))

            return Response({"message": "Successfully registered"}, status=201)
        except Exception as e:
            return Response({"error": "Database temporarily unavailable"}, status=503)

class ContestDetailAPIView(APIView):
    _PUBLIC_TTL = 60   # 60 s — shared across all users
    _USER_TTL   = 30   # 30 s — per-user registration overlay

    def get(self, request, contest_id):
        from django.core.cache import cache

        user = get_user_from_request(request)

        # ── 1. Public (shared) cache ──────────────────────────────────────────
        pub_key    = f'contest_detail_{contest_id}'
        pub_data   = cache.get(pub_key)

        if pub_data is None:
            try:
                c = Contest.objects.get(id=contest_id)
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)
            except Exception as e:
                return Response({"error": "Database temporarily unavailable"}, status=503)

            try:
                status_value    = get_contest_status(c)
                participant_count = ContestRegistration.objects(contest=c).count()

                pub_data = {
                    "id":               str(c.id),
                    "title":            c.title,
                    "description":      c.description or "",
                    "start_time":       c.start_time.isoformat() if c.start_time else None,
                    "duration":         c.duration,
                    "duration_minutes": c.duration * 60 if c.duration else None,
                    "type":             c.type,
                    "platform":         c.platform,
                    "status":           status_value,
                    "participants":     participant_count,
                    "problems_count":   len(c.problems) if c.problems else 0,
                    "created_by": {
                        "id":    str(c.created_by.id)    if c.created_by else None,
                        "name":  c.created_by.name       if c.created_by else None,
                        "email": c.created_by.email      if c.created_by else None,
                    } if c.created_by else None,
                    "editorial_published": getattr(c, 'editorial_published', False),
                    "_created_by_id": str(c.created_by.id) if c.created_by else None,
                }
                cache.set(pub_key, pub_data, timeout=self._PUBLIC_TTL)
            except Exception as e:
                return Response({"error": "Database temporarily unavailable"}, status=503)

        # ── 2. Per-user overlay (registration + access flags) ─────────────────
        try:
            status_value   = pub_data["status"]
            created_by_id  = pub_data.get("_created_by_id")
            is_creator     = bool(user and created_by_id and str(user.id) == created_by_id)
            is_registered  = False

            if user:
                reg_key       = f'contest_reg_{contest_id}_{user.id}'
                cached_reg    = cache.get(reg_key)
                if cached_reg is None:
                    try:
                        from bson import ObjectId
                        reg = ContestRegistration.objects(user=user, contest=ObjectId(contest_id)).first()
                    except Exception:
                        reg = None
                    cached_reg = bool(reg)
                    cache.set(reg_key, cached_reg, timeout=self._USER_TTL)
                is_registered = cached_reg

            can_access        = False
            needs_registration = False
            if status_value in ("live", "upcoming"):
                can_access         = is_registered or is_creator
                needs_registration = not can_access
            elif status_value == "past":
                can_access = True
            elif status_value == "draft":
                can_access = is_creator

            # Build final response (strip internal key)
            response_data = {k: v for k, v in pub_data.items() if not k.startswith('_')}
            response_data["is_creator"] = is_creator
            response_data["access"] = {
                "can_access":        can_access,
                "needs_registration": needs_registration,
                "is_registered":     is_registered,
                "can_register":      status_value in ["live", "upcoming"],
            }
            return Response(response_data)
        except Exception as e:
            return Response({"error": "Database temporarily unavailable"}, status=503)
        
class MyContestRegistrationsAPIView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        registrations = ContestRegistration.objects(user=user)
        contest_ids = [str(reg.contest.id) for reg in registrations]

        return Response({"registered_contests": contest_ids}, status=200)

class ContestAnnouncementsAPIView(APIView):
    """
    API for contest announcements (creator only)
    """
    def get(self, request, contest_id):
        """Get announcements for a contest"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Fetch actual announcements from the database
        try:
            announcements_list = Announcement.objects.filter(contest=contest).order_by('-created_at')
            
            # Format announcements for response
            announcements_data = []
            for announcement in announcements_list:
                announcements_data.append({
                    "id": str(announcement.id),
                    "text": announcement.text,
                    "problem_index": announcement.problem_index,
                    "author": announcement.author.name if announcement.author else "Unknown",
                    "created_at": announcement.created_at.isoformat() if announcement.created_at else None,
                    "is_important": announcement.is_important,
                    "is_pinned": announcement.is_pinned,
                    "type": announcement.type
                })
            
            return Response({
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "announcements": announcements_data
            })
        except Exception as e:
            return Response({
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "announcements": []
            })
    
    def post(self, request, contest_id):
        """Create an announcement (creator only) - This is now handled by AnnouncementCreateAPIView"""
        return Response({
            "error": "Use /announcements/create/ endpoint for creating announcements"
        }, status=400)
         
# Add these imports at the top of contest/views.py
from announcement.models import Announcement
from announcement.serializers import AnnouncementCreateSerializer, AnnouncementUpdateSerializer

# Add these classes to contest/views.py (add them before or after ContestAnnouncementsAPIView)
class AnnouncementCreateAPIView(APIView):
    """
    POST /contests/announcements/
    Create a new announcement for a contest
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = AnnouncementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data

        try:
            contest = Contest.objects.get(id=data["contest_id"])
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)

        # Only creator, admin, or authorized testers can post announcements
        can_post = False
        
        # Check if user is contest creator
        if contest.created_by and str(contest.created_by.id) == str(user.id):
            can_post = True
        # Check if user is admin
        elif hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
            can_post = True
        # Check if user is a tester (for test contests)
        elif get_contest_status(contest) == "test" and user.email in contest.testers:
            can_post = True
        
        if not can_post:
            return Response({
                "error": "Permission denied. Only contest creator, admin, or testers can post announcements."
            }, status=403)

        # Create announcement
        announcement = Announcement(
            contest=contest,
            author=user,
            text=data["text"].strip(),
            problem_index=data.get("problem_index", "").strip().upper() if data.get("problem_index") else None,
            is_important=data.get("is_important", False),
            is_pinned=data.get("is_pinned", False),
            type=data.get("type", "info")  # info, warning, important, update
        )

        try:
            announcement.save()
        except MEValidationError as e:
            return Response({"error": f"Validation error: {str(e)}"}, status=400)
        except Exception as e:
            return Response({"error": f"Failed to create announcement: {str(e)}"}, status=500)
        
        broadcast_contest_update(data["contest_id"], {
            "event": "announcement",
            "announcement": announcement.to_dict()
        })

        # Return the created announcement
        return Response({
            "message": "Announcement created successfully",
            "announcement": announcement.to_dict()
        }, status=201)
    
class ContestEditorialAPIView(APIView):
    
    def get(self, request, contest_id):
        """Get editorial status and overview for a contest"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        user_id = user.id if user else None
        
        # Determine editorial_published status
        contest_status = get_contest_status(contest)
        if contest_status == "past":
            # For past contests, editorial is always considered published
            editorial_published_status = True
        else:
            editorial_published_status = getattr(contest, 'editorial_published', False)
        
        # Check if editorial can be accessed
        can_access_editorial = False
        access_error = None
        
        if contest_status == "past":
            can_access_editorial = True
        elif contest_status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access_editorial = True
            else:
                access_error = "Editorial not available in draft contests"
        elif contest_status in ["live", "upcoming", "test"]:
            if editorial_published_status:
                can_access_editorial = True
            elif user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access_editorial = True
            else:
                access_error = "Editorial will be available after the contest ends"
        
        # Prepare response
        try:
            # Count problems with tutorials
            problems_with_tutorials = sum(1 for p in contest.problems if p.tutorial and p.tutorial.strip())
            total_problems = len(contest.problems)
            
            # Get all problems with tutorials for detailed view
            problems_with_tutorials_list = []
            for problem in contest.problems:
                has_tutorial = bool(problem.tutorial and problem.tutorial.strip())
                
                problem_data = {
                    "index": problem.index,
                    "title": problem.title,
                    "difficulty": problem.difficulty or "Medium",
                    "tags": problem.tags or [],
                    "points": getattr(problem, 'points', 0) or 0,
                    "has_tutorial": has_tutorial,
                    "tutorial_length": len(problem.tutorial) if has_tutorial else 0,
                    "tutorial_preview": problem.tutorial[:100] + "..." if has_tutorial and len(problem.tutorial) > 100 else (problem.tutorial if has_tutorial else "")
                }
                
                problems_with_tutorials_list.append(problem_data)
            

            # Check if user can publish editorial
            can_publish = contest_status in ["past", "live", "test"] and user and contest.created_by and str(contest.created_by.id) == str(user.id)
            
            if not can_access_editorial:
                return Response({
                    "error": "Access denied",
                    "message": access_error or "You don't have access to the editorial",
                    "contest_id": str(contest.id),
                    "contest_title": contest.title,
                    "contest_status": contest_status,
                    "editorial_published": editorial_published_status,
                    "total_problems": total_problems,
                    "problems_with_tutorials": problems_with_tutorials,
                    "can_publish": can_publish,
                    "can_access": False
                }, status=403)
            
            # Full editorial access granted
            response_data = {
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "contest_status": contest_status,
                "editorial_published": editorial_published_status,
                "total_problems": total_problems,
                "tutorials_available": problems_with_tutorials,
                "problems_with_tutorials": problems_with_tutorials,
                "problems": problems_with_tutorials_list,
                "can_publish": can_publish,
                "can_access": True,
                "created_at": contest.start_time.isoformat() if contest.start_time else None,
                "created_by": {
                    "id": str(contest.created_by.id) if contest.created_by else None,
                    "name": contest.created_by.name if contest.created_by else None
                } if contest.created_by else None
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                "error": f"Error preparing editorial: {str(e)}",
                "can_access": False
            }, status=500)
    
    def post(self, request, contest_id):
        """Publish/unpublish editorial"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is the creator
        if not contest.created_by or str(contest.created_by.id) != str(user.id):
            return Response({"error": "Only contest creator can manage editorial"}, status=403)
        
        # Check if contest status allows publishing/unpublishing
        contest_status = get_contest_status(contest)
        if contest_status not in ["past", "live", "test"]:
            return Response({
                "error": "Editorial can only be managed for past, live, or test contests",
                "contest_status": contest_status
            }, status=400)
        
        action = request.data.get('action', 'publish')
        
        if action == 'publish':
            contest.editorial_published = True
        elif action == 'unpublish':
            contest.editorial_published = False
        else:
            return Response({"error": "Invalid action. Use 'publish' or 'unpublish'"}, status=400)
        
        try:
            contest.save()
            return Response({
                "message": f"Editorial {action}ed successfully",
                "contest_id": str(contest.id),
                "editorial_published": contest.editorial_published,
                "contest_status": get_contest_status(contest)
            })
        except Exception as e:
            return Response({"error": f"Failed to update editorial: {str(e)}"}, status=400)

from .serializers import TestContestCreateSerializer

class ContestPublishTestAPIView(APIView):
    """
    Publish a draft contest as a test contest (creates separate test contest copy)
    """
    
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            # Get original draft contest
            original_contest = Contest.objects.get(id=contest_id, created_by=user)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found or access denied"}, status=404)
        
        # Ensure contest is a draft
        if original_contest.status != "draft":
            return Response({
                "error": "Only draft contests can be published as test",
                "current_status": original_contest.status
            }, status=400)
        
        # Validate test contest data
        serializer = TestContestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        try:
            # Create test contest copy
            test_contest = serializer.create_test_contest(original_contest, serializer.validated_data)
            
            # Save test contest
            test_contest.save()
            
            # Keep original contest as draft (no changes needed)
            # Optionally, you could add a field to track that it has a test version
            if not hasattr(original_contest, 'has_test_version'):
                original_contest.has_test_version = True
                original_contest.save()
            
            # Calculate test contest status based on start time
            test_status = get_contest_status(test_contest)
            test_contest.status = test_status
            test_contest.save()
            
            return Response({
                "message": "Test contest published successfully",
                "test_contest_id": str(test_contest.id),
                "original_contest_id": str(original_contest.id),
                "test_status": test_status,
                "test_start_time": test_contest.test_start_time,
                "testers_count": len(test_contest.testers),
                "problems_count": len(test_contest.problems)
            }, status=201)
            
        except Exception as e:
            return Response({
                "error": f"Failed to create test contest: {str(e)}"
            }, status=400)
        
# contest/views.py - Add these new views

import os
import hashlib
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.core.files.storage import FileSystemStorage
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import MultiPartParser, FileUploadParser
import uuid
# Add this to contest/views.py imports
from django.core.files.storage import default_storage

class ContestRecordingStatusAPIView(APIView):
    """Check if user needs to start recording for a contest"""
    
    def get(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if contest requires recording
        requires_recording = getattr(contest, 'require_screen_recording', True)
        
        # Check if user has already started recording for this contest
        recording_started = False
        recording_record = None
        
        if requires_recording:
            # Check in contest.recordings_started list
            if hasattr(contest, 'recordings_started'):
                recording_started = str(user.id) in contest.recordings_started
            else:
                contest.recordings_started = []
                contest.save()
            
            # Check if there's an active recording record
            recording_record = ContestScreenRecording.objects.filter(
                contest=contest,
                user=user,
                recording_status__in=["recording", "stopped"]
            ).first()
            
            if recording_record:
                recording_started = True
        
        return Response({
            "requires_recording": requires_recording,
            "recording_started": recording_started,
            "recording_id": str(recording_record.id) if recording_record else None,
            "max_duration_minutes": getattr(contest, 'recording_max_duration', 180)
        })

# contest/views.py - Updated StartContestRecordingAPIView with better debugging

class StartContestRecordingAPIView(APIView):
    """Start screen recording for a contest (marks user as started)"""
    
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        except Exception as e:
            return Response({"error": f"Error getting contest: {str(e)}"}, status=500)
        
        # Check if contest requires recording
        requires_recording = getattr(contest, 'require_screen_recording', False)
        
        if not requires_recording:
            return Response({
                "error": "This contest does not require screen recording"
            }, status=400)
        
        # Check if user has already started recording
        recordings_started = getattr(contest, 'recordings_started', [])
        
        if str(user.id) in recordings_started:
            return Response({
                "error": "Recording already started for this contest"
            }, status=400)
        
        # Check if there's an existing recording record
        try:
            existing_recordings = ContestScreenRecording.objects.filter(
                contest=contest,
                user=user
            )
            existing_recording = existing_recordings.filter(
                recording_status__in=["recording", "stopped"]
            ).first()
            
            if existing_recording:
                return Response({
                    "error": "Recording already in progress or completed"
                }, status=400)
        except Exception:
            pass
        
        # Create recording record
        try:
            recording = ContestScreenRecording()
            recording.contest = contest
            recording.user = user
            recording.start_time = datetime.now()
            recording.save()
        except Exception as e:
            # Try alternative save method
            try:
                recording = ContestScreenRecording(
                    contest=contest,
                    user=user,
                    start_time=datetime.now()
                )
                recording.save()
            except Exception as e2:
                return Response({
                    "error": f"Failed to create recording record",
                    "details": str(e),
                    "model_error": str(e2)
                }, status=500)
        
        # Add user to contest's recordings_started list
        try:
            if not hasattr(contest, 'recordings_started'):
                contest.recordings_started = []
            if str(user.id) not in contest.recordings_started:
                contest.recordings_started.append(str(user.id))
                contest.save()
        except Exception:
            pass
        
        # Prepare response
        try:
            recording_id_str = str(recording.id) if hasattr(recording, 'id') else "unknown"
            start_time_iso = recording.start_time.isoformat() if hasattr(recording.start_time, 'isoformat') else datetime.now().isoformat()
            return Response({
                "message": "Recording started successfully",
                "recording_id": recording_id_str,
                "start_time": start_time_iso,
                "contest_id": str(contest.id),
                "user_id": str(user.id)
            })
        except Exception as e:
            return Response({
                "message": "Recording started",
                "recording_id": "check_logs_for_id",
                "details": f"Error in response: {str(e)}"
            })

class UploadContestRecordingAPIView(APIView):
    """Upload completed screen recording"""
    
    parser_classes = [MultiPartParser]
    
    def post(self, request, contest_id, recording_id):
        
        user = get_user_from_request(request)
        if not user:
            print("❌ No user found")
            return Response({"error": "Authentication required"}, status=401)
        
        print(f"✅ User authenticated: {user.id} - {user.email}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            recording = ContestScreenRecording.objects.get(
                id=recording_id,
                contest=contest,
                user=user
            )
            print(f"✅ Found contest: {contest.title}")
            print(f"✅ Found recording: {recording.id}, Status: {recording.recording_status}")
        except Contest.DoesNotExist:
            print("❌ Contest not found")
            return Response({"error": "Contest not found"}, status=404)
        except ContestScreenRecording.DoesNotExist:
            print("❌ Recording not found or access denied")
            return Response({"error": "Not found"}, status=404)
        
        # Check if recording is already completed
        if recording.recording_status == "completed":
            print("❌ Recording already completed")
            return Response({"error": "Recording already completed"}, status=400)
        
        # Get the video file from request
        video_file = request.FILES.get('video')
        if not video_file:
            print("❌ No video file provided")
            return Response({"error": "No video file provided"}, status=400)
        
        # Validate file size (max 500MB)
        max_size = 500 * 1024 * 1024  # 500MB
        if video_file.size > max_size:
            print(f"❌ File too large: {video_file.size} bytes")
            return Response({"error": "File too large (max 500MB)"}, status=400)
        
        # Validate file type
        allowed_extensions = ['.webm', '.mp4', '.mkv']
        file_extension = os.path.splitext(video_file.name)[1].lower()
        if file_extension not in allowed_extensions:
            print(f"❌ Invalid file type: {file_extension}")
            return Response({"error": f"Invalid file type. Allowed: {allowed_extensions}"}, status=400)

        
        # Create directory if it doesn't exist
        if hasattr(settings, 'MEDIA_ROOT'):
            media_root = settings.MEDIA_ROOT
        else:
            # Fallback
            media_root = os.path.join(settings.BASE_DIR, 'media')
        
        recordings_dir = os.path.join(media_root, 'contest_recordings', str(contest_id))

        
        # Create directory
        try:
            os.makedirs(recordings_dir, exist_ok=True)
            print(f"✅ Created/verified directory: {recordings_dir}")
            
            # Test if we can write to the directory
            test_file = os.path.join(recordings_dir, 'test_write.txt')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print(f"✅ Directory is writable")
        except Exception as e:
            print(f"❌ Cannot create/write to directory: {e}")
            return Response({"error": f"Cannot create directory: {str(e)}"}, status=500)
        
        # Generate unique filename
        unique_filename = f"{recording_id}_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
        file_path = os.path.join(recordings_dir, unique_filename)
        
        print(f"\n💾 Saving file:")
        print(f"   Filename: {unique_filename}")
        print(f"   Full path: {file_path}")
        
        # Save the file
        try:
            bytes_written = 0
            with open(file_path, 'wb+') as destination:
                for chunk in video_file.chunks(chunk_size=8192):
                    destination.write(chunk)
                    bytes_written += len(chunk)
            
            if os.path.exists(file_path):
                print(f"   File verified on disk")
            else:
                print(f"❌ File NOT found after saving!")
                return Response({"error": "File not saved properly"}, status=500)
                
        except Exception as e:
            print(f"❌ Failed to save file: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"Failed to save file: {str(e)}"}, status=500)
        
        # Update recording record
        print(f"\n📝 Updating database record...")
        recording.recording_file = file_path
        recording.end_time = datetime.now()
        recording.duration = (recording.end_time - recording.start_time).total_seconds()
        recording.recording_status = "completed"
        recording.file_size = os.path.getsize(file_path)
        recording.video_format = file_extension.lstrip('.')
        
        try:
            recording.save()
            print(f"✅ Database updated successfully")
        except Exception as e:
            print(f"❌ Failed to update recording record: {str(e)}")
            # Clean up the file if saving failed
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({"error": f"Failed to update recording record: {str(e)}"}, status=500)
        
        # Generate URL for frontend
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        video_url = f"{media_url}contest_recordings/{contest_id}/{unique_filename}"
        
        print(f"\n🌐 Access URL:")
        print(f"   Media URL: {media_url}")
        print(f"   Video URL: {video_url}")
        
        # List files in directory for verification
        print(f"\n📁 Files in recordings directory:")
        try:
            files = os.listdir(recordings_dir)
            for f in files:
                filepath = os.path.join(recordings_dir, f)
                size = os.path.getsize(filepath) if os.path.isfile(filepath) else 0
                print(f"   - {f} ({size} bytes)")
        except Exception as e:
            print(f"   Error listing files: {e}")
        
        print(f"=== ✅ UPLOAD COMPLETE ===\n")
        
        return Response({
            "message": "Recording uploaded successfully",
            "recording_id": str(recording.id),
            "file_url": video_url,
            "file_size": recording.file_size,
            "duration": recording.duration,
            "file_path": file_path,  # Add for debugging
        })

# class UploadContestRecordingAPIView(APIView):
#     """Upload completed screen recording"""
    
#     parser_classes = [MultiPartParser]
    
#     def post(self, request, contest_id, recording_id):
#         print(f"\n=== UPLOAD RECORDING DEBUG ===")
#         print(f"Contest ID: {contest_id}")
#         print(f"Recording ID: {recording_id}")
#         print(f"User authenticated: {bool(request.user)}")
#         print(f"Files in request: {list(request.FILES.keys())}")
        
#         user = get_user_from_request(request)
#         if not user:
#             print("DEBUG: No user found")
#             return Response({"error": "Authentication required"}, status=401)
        
#         try:
#             contest = Contest.objects.get(id=contest_id)
#             recording = ContestScreenRecording.objects.get(
#                 id=recording_id,
#                 contest=contest,
#                 user=user
#             )
#             print(f"DEBUG: Found contest and recording")
#         except (Contest.DoesNotExist, ContestScreenRecording.DoesNotExist) as e:
#             print(f"DEBUG: Not found error: {e}")
#             return Response({"error": "Not found"}, status=404)
        
#         # Check if recording is already completed
#         if recording.recording_status == "completed":
#             print(f"DEBUG: Recording already completed")
#             return Response({"error": "Recording already completed"}, status=400)
        
#         # Get the video file from request
#         video_file = request.FILES.get('video')
#         if not video_file:
#             print(f"DEBUG: No video file provided")
#             return Response({"error": "No video file provided"}, status=400)
        
#         print(f"DEBUG: Video file: {video_file.name}, Size: {video_file.size}")
        
#         # Validate file size (max 500MB)
#         max_size = 500 * 1024 * 1024  # 500MB
#         if video_file.size > max_size:
#             print(f"DEBUG: File too large: {video_file.size}")
#             return Response({"error": "File too large (max 500MB)"}, status=400)
        
#         # Validate file type
#         allowed_extensions = ['.webm', '.mp4', '.mkv']
#         file_extension = os.path.splitext(video_file.name)[1].lower()
#         if file_extension not in allowed_extensions:
#             print(f"DEBUG: Invalid file type: {file_extension}")
#             return Response({"error": f"Invalid file type. Allowed: {allowed_extensions}"}, status=400)
        
#         # Create directory if it doesn't exist
#         media_root = getattr(settings, 'MEDIA_ROOT', 'media')
#         recordings_dir = os.path.join(media_root, 'contest_recordings', contest_id)
        
#         # FIX THE TYPO HERE!
#         os.makedirs(recordings_dir, exist_ok=True)  # NOT records_dir!
        
#         print(f"DEBUG: Media root: {media_root}")
#         print(f"DEBUG: Recordings dir: {recordings_dir}")
        
#         # Generate unique filename
#         unique_filename = f"{recording_id}_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
#         file_path = os.path.join(recordings_dir, unique_filename)
        
#         print(f"DEBUG: Saving to: {file_path}")
        
#         # Save the file
#         try:
#             with open(file_path, 'wb+') as destination:
#                 for chunk in video_file.chunks():
#                     destination.write(chunk)
#             print(f"DEBUG: File saved successfully")
#         except Exception as e:
#             print(f"DEBUG: Failed to save file: {str(e)}")
#             return Response({"error": f"Failed to save file: {str(e)}"}, status=500)
        
#         # Update recording record
#         recording.recording_file = file_path
#         recording.end_time = datetime.now()
#         recording.duration = (recording.end_time - recording.start_time).total_seconds()
#         recording.recording_status = "completed"
#         recording.file_size = os.path.getsize(file_path)
#         recording.video_format = file_extension.lstrip('.')
        
#         print(f"DEBUG: Updating recording with file: {file_path}")
        
#         try:
#             recording.save()
#             print(f"DEBUG: Recording saved to database successfully")
#         except Exception as e:
#             print(f"DEBUG: Failed to update recording record: {str(e)}")
#             # Clean up the file if saving failed
#             if os.path.exists(file_path):
#                 os.remove(file_path)
#             return Response({"error": f"Failed to update recording record: {str(e)}"}, status=500)
        
#         # Generate URL for frontend
#         media_url = getattr(settings, 'MEDIA_URL', '/media/')
#         video_url = f"{media_url}contest_recordings/{contest_id}/{unique_filename}"
        
#         print(f"DEBUG: Upload complete. URL: {video_url}")
#         print("=== END DEBUG ===\n")
        
#         return Response({
#             "message": "Recording uploaded successfully",
#             "recording_id": str(recording.id),
#             "file_url": video_url,
#             "file_size": recording.file_size,
#             "duration": recording.duration,
#         })

class StopContestRecordingAPIView(APIView):
    """Mark recording as stopped (without uploading)"""
    
    def post(self, request, contest_id, recording_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
            recording = ContestScreenRecording.objects.get(
                id=recording_id,
                contest=contest,
                user=user
            )
        except (Contest.DoesNotExist, ContestScreenRecording.DoesNotExist):
            return Response({"error": "Not found"}, status=404)
        
        # Update recording status
        if recording.recording_status == "recording":
            recording.recording_status = "stopped"
            recording.end_time = datetime.now()
            if recording.start_time:
                recording.duration = (recording.end_time - recording.start_time).total_seconds()
            
            try:
                recording.save()
                return Response({
                    "message": "Recording stopped",
                    "recording_id": str(recording.id),
                    "duration": recording.duration
                })
            except Exception as e:
                return Response({"error": f"Failed to update recording: {str(e)}"}, status=500)
        else:
            return Response({
                "message": f"Recording already in {recording.recording_status} state"
            })

# contest/views.py - Add admin endpoint to toggle recording requirements

class ContestRecordingSettingsAPIView(APIView):
    """Admin API to manage recording settings for contests"""
    
    def patch(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is admin or contest creator
        is_admin = hasattr(user, 'role') and user.role in ['admin', 'superadmin']
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        
        if not (is_admin or is_creator):
            return Response({"error": "Permission denied"}, status=403)
        
        # Update recording settings
        if 'require_screen_recording' in request.data:
            contest.require_screen_recording = request.data['require_screen_recording']
        
        if 'recording_max_duration' in request.data:
            contest.recording_max_duration = request.data['recording_max_duration']
        
        try:
            contest.save()
            return Response({
                "message": "Recording settings updated",
                "require_screen_recording": contest.require_screen_recording,
                "recording_max_duration": contest.recording_max_duration
            })
        except Exception as e:
            return Response({"error": f"Failed to update settings: {str(e)}"}, status=500)
        
# Add these imports at the top of contest/views.py if not already present
from django.db.models import Q as DjangoQ
from mongoengine.queryset.visitor import Q

# contest/views.py
class ContestRecordingsListAPIView(APIView):
    """Get list of recordings for a specific contest (admin/creator view)"""
    
    def get(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is admin or contest creator
        is_admin = hasattr(user, 'role') and user.role in ['admin', 'superadmin']
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        
        if not (is_admin or is_creator):
            return Response({"error": "Permission denied"}, status=403)
        
        # Get query parameters
        search_query = request.GET.get('search', '').strip()
        user_filter = request.GET.get('user', '').strip()
        status_filter = request.GET.get('status', '').strip()
        date_from = request.GET.get('date_from', '').strip()
        date_to = request.GET.get('date_to', '').strip()
        
        # Build base query - filter by contest
        recordings = ContestScreenRecording.objects.filter(contest=contest)
        
        # Apply filters
        if search_query:
            # Search by user name/email
            users_by_name = Account.objects.filter(
                Q(name__icontains=search_query) | Q(email__icontains=search_query)
            )
            user_ids = [str(u.id) for u in users_by_name]
            recordings = recordings.filter(user__in=user_ids)
        
        if user_filter:
            users = Account.objects.filter(
                Q(name__icontains=user_filter) | 
                Q(email__icontains=user_filter) |
                Q(id=user_filter)
            )
            user_ids = [str(u.id) for u in users]
            recordings = recordings.filter(user__in=user_ids)
        
        if status_filter:
            recordings = recordings.filter(recording_status=status_filter)
        
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                recordings = recordings.filter(start_time__gte=from_date)
            except:
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                recordings = recordings.filter(start_time__lte=to_date)
            except:
                pass
        
        # Order by most recent first
        recordings = recordings.order_by('-start_time')
        
        # Pagination
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        total_count = recordings.count()
        offset = (page - 1) * per_page
        recordings = recordings.skip(offset).limit(per_page)
        
        # Prepare response data
        recordings_list = []
        for recording in recordings:
            try:
                user_account = Account.objects.get(id=recording.user.id)

                # Generate video URL
                video_url = ""
                if recording.recording_file:
                    # Extract filename from path
                    filename = os.path.basename(recording.recording_file)
                    # Use the URL format that actually works
                    video_url = f"http://localhost:8000/media/contest_recordings/{contest_id}/{filename}"
                
                recording_data = {
                    "id": str(recording.id),
                    "contest_id": contest_id,
                    "contest_title": contest.title,
                    "user_id": str(user_account.id),
                    "user_name": user_account.name,
                    "user_email": user_account.email,
                    "start_time": recording.start_time.isoformat() if recording.start_time else None,
                    "end_time": recording.end_time.isoformat() if recording.end_time else None,
                    "duration": recording.duration,
                    "file_size": recording.file_size,
                    "recording_status": recording.recording_status,
                    "video_url": video_url,
                    "video_format": recording.video_format,
                    "file_path": recording.recording_file,
                    "created_at": recording.created_at.isoformat() if recording.created_at else None,
                }
                recordings_list.append(recording_data)
            except Exception as e:
                print(f"Error processing recording {recording.id}: {str(e)}")
                continue
        
        return Response({
            "recordings": recordings_list,
            "contest_info": {
                "id": str(contest.id),
                "title": contest.title,
                "start_time": contest.start_time.isoformat() if contest.start_time else None,
                "duration": contest.duration,
                "created_by": {
                    "id": str(contest.created_by.id) if contest.created_by else None,
                    "name": contest.created_by.name if contest.created_by else None
                }
            },
            "total_count": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page
        })

class ContestUserRecordingsAPIView(APIView):
    """Get recordings for a specific user in a contest"""
    
    def get(self, request, contest_id, user_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is admin, contest creator, OR the user themselves
        is_admin = hasattr(user, 'role') and user.role in ['admin', 'superadmin']
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        is_target_user = str(user.id) == user_id
        
        if not (is_admin or is_creator or is_target_user):
            return Response({"error": "Permission denied"}, status=403)
        
        # Get the target user
        try:
            target_user = Account.objects.get(id=user_id)
        except Account.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        # Get recordings for this user in this contest
        recordings = ContestScreenRecording.objects.filter(
            contest=contest,
            user=target_user
        ).order_by('-start_time')
        
        # Prepare response data
        recordings_list = []
        for recording in recordings:
            # Generate video URL
            video_url = ""
            if recording.recording_file:
                filename = os.path.basename(recording.recording_file)
                video_url = f"http://localhost:8000/media/contest_recordings/{contest_id}/{filename}"
            
            recording_data = {
                "id": str(recording.id),
                "contest_id": contest_id,
                "contest_title": contest.title,
                "user_id": str(target_user.id),
                "user_name": target_user.name,
                "user_email": target_user.email,
                "start_time": recording.start_time.isoformat() if recording.start_time else None,
                "end_time": recording.end_time.isoformat() if recording.end_time else None,
                "duration": recording.duration,
                "file_size": recording.file_size,
                "recording_status": recording.recording_status,
                "video_url": video_url,
                "video_format": recording.video_format,
                "file_path": recording.recording_file,
                "created_at": recording.created_at.isoformat() if recording.created_at else None,
            }
            recordings_list.append(recording_data)
        
        return Response({
            "recordings": recordings_list,
            "contest_info": {
                "id": str(contest.id),
                "title": contest.title,
            },
            "user_info": {
                "id": str(target_user.id),
                "name": target_user.name,
                "email": target_user.email
            },
            "total_count": len(recordings_list)
        })


class HomeDashboardAPIView(APIView):
    """
    GET /home/dashboard/
    Single endpoint that returns all home page data for faster loading.
    Shows ONLY internal 0Point contests (not external platforms).
    Cached with Redis (or LocMem fallback) for fast repeated loads.
    """

    # Cache TTLs (seconds)
    _PUBLIC_TTL  = 120   # 2 min  — unauthenticated, fully cacheable
    _USER_EXTRA_TTL = 60  # 1 min  — per-user registered-contests overlay

    # ------------------------------------------------------------------ helpers
    def _build_payload(self, user, registered_ids):
        """Compute the full dashboard payload.  Heavy DB work lives here."""
        from datetime import datetime
        from blog.models import Blog
        from announcement.models import Announcement
        import pytz

        dhaka_tz = pytz.timezone('Asia/Dhaka')
        now = datetime.now(dhaka_tz)

        upcoming_contests = []
        live_contests = []
        past_contests = []
        soonest_upcoming = None

        # Internal 0Point contests
        try:
            pipeline = [
                {"$match": {"status": {"$ne": "draft"}}},
                {"$sort": {"start_time": 1}},
                {"$limit": 30},
            ]
            for c in Contest.objects.aggregate(pipeline):
                cid   = str(c.get('_id'))
                start = c.get('start_time')
                duration = c.get('duration') or 0

                if start:
                    if start.tzinfo is None:
                        start = dhaka_tz.localize(start)
                    end = start + timedelta(hours=duration)
                    if now < start:
                        status_val = 'upcoming'
                    elif now <= end:
                        status_val = 'live'
                    else:
                        status_val = 'past'
                else:
                    status_val = 'upcoming'

                contest_data = {
                    "id": cid,
                    "title": c.get('title', ''),
                    "description": c.get('description', ''),
                    "start_time": start.isoformat() if start else None,
                    "duration": f"{duration}h" if duration else "N/A",
                    "type": c.get('type', 'individual'),
                    "platform": "0point",
                    "status": status_val,
                    "participants": 0,
                    "is_registered": cid in registered_ids,
                    "is_external": False,
                }

                if status_val == "upcoming":
                    upcoming_contests.append(contest_data)
                    if start and (soonest_upcoming is None
                                  or start < soonest_upcoming.get("_start_raw")):
                        time_until = start - now
                        soonest_upcoming = {
                            "contest_id": cid,
                            "title": c.get('title', ''),
                            "platform": "0point",
                            "start_time": start.isoformat(),
                            "is_registered": cid in registered_ids,
                            "_start_raw": start,
                            "time_until": {
                                "days":    max(0, time_until.days),
                                "hours":   max(0, time_until.seconds // 3600),
                                "minutes": max(0, (time_until.seconds % 3600) // 60),
                                "seconds": max(0, time_until.seconds % 60),
                            },
                        }
                elif status_val == "live":
                    live_contests.append(contest_data)
                else:
                    past_contests.append(contest_data)
        except Exception as e:
            print(f"Internal contests error: {e}")

        # External platform contests
        try:
            from crossPlatform.models import ExternalContest
            platform_map = {
                "codeforces": "cf", "leetcode": "lc",
                "codechef": "cc", "atcoder": "ac",
            }
            pipeline = [
                {"$match": {"status": "upcoming"}},
                {"$sort": {"start_time": 1}},
                {"$limit": 20},
            ]
            for ec in ExternalContest.objects.aggregate(pipeline):
                plat = ec.get('platform', '')
                plat_code = platform_map.get(plat, plat)
                start    = ec.get('start_time')
                dur_sec  = ec.get('duration_seconds', 0) or 0
                upcoming_contests.append({
                    "id": f"external_{plat}_{ec.get('external_id', '')}",
                    "title": ec.get('title', ''),
                    "description": "",
                    "start_time": start.isoformat() if start else None,
                    "duration": ec.get('duration_formatted', '') or f"{dur_sec // 3600}h",
                    "type": "external",
                    "platform": plat_code,
                    "status": "upcoming",
                    "participants": ec.get('participants', 0),
                    "is_registered": False,
                    "is_external": True,
                    "external_url": ec.get('url', ''),
                })
        except Exception as e:
            print(f"External contests error: {e}")

        upcoming_contests.sort(key=lambda x: x["start_time"] or "9999")
        past_contests.sort(key=lambda x: x["start_time"] or "", reverse=True)

        if soonest_upcoming:
            soonest_upcoming.pop("_start_raw", None)

        # Blogs (top 3)
        blogs_data = []
        try:
            for blog in Blog.objects(is_published=True).order_by('-published_at').limit(3):
                blogs_data.append(blog.to_dict())
        except Exception:
            pass

        # Announcements (top 5)
        announcements_data = []
        try:
            for ann in Announcement.objects(contest=None).order_by("-is_pinned", "-created_at").limit(5):
                announcements_data.append(ann.to_dict())
        except Exception:
            pass

        # Leaderboard (top 5)
        leaderboard_data = []
        try:
            rank = 1
            for u in Account.objects(is_deleted=False, is_inactive=False).order_by('-rating').limit(5):
                leaderboard_data.append({
                    "user_id":      str(u.id),
                    "username":     u.name,
                    "total_points": u.rating,
                    "rank":         rank,
                })
                rank += 1
        except Exception:
            pass

        # Contributions (top 5) — single aggregation pipeline, no N+1 queries
        contributions_data = []
        try:
            from account.models import Account as AccountModel
            from blog.models import Blog as BlogModel

            # Count blogs per author in one query
            blog_pipeline = [
                {"$match": {"is_published": True}},
                {"$group": {"_id": "$author", "blogs": {"$sum": 1}}},
            ]
            blog_counts = {str(r["_id"]): r["blogs"] for r in BlogModel.objects.aggregate(blog_pipeline)}

            # Count contests per creator in one query
            contest_pipeline = [
                {"$group": {"_id": "$created_by", "contests": {"$sum": 1}}},
            ]
            contest_counts = {str(r["_id"]): r["contests"] for r in Contest.objects.aggregate(contest_pipeline)}

            # Merge both counts
            all_ids = set(blog_counts) | set(contest_counts)
            ranked = [
                {
                    "user_id": uid,
                    "total_contributions": blog_counts.get(uid, 0) + contest_counts.get(uid, 0),
                }
                for uid in all_ids
            ]
            ranked.sort(key=lambda x: x["total_contributions"], reverse=True)
            top5_ids = [r["user_id"] for r in ranked[:5]]

            # Fetch names for top-5 users only (5 lookups max)
            name_map = {}
            for u in AccountModel.objects(id__in=top5_ids, is_deleted=False).only("id", "name"):
                name_map[str(u.id)] = u.name

            for idx, entry in enumerate(ranked[:5], start=1):
                contributions_data.append({
                    "user_id": entry["user_id"],
                    "name": name_map.get(entry["user_id"], "Unknown"),
                    "total_contributions": entry["total_contributions"],
                    "rank": idx,
                })
        except Exception as e:
            print(f"Contributions error: {e}")

        return {
            "upcoming_contests":     upcoming_contests[:5],
            "live_contests":         live_contests,
            "past_contests":         past_contests[:5],
            "blogs":                 blogs_data,
            "announcements":         announcements_data,
            "leaderboard":           leaderboard_data,
            "contributions":         contributions_data,
            "soonest_contest":       soonest_upcoming,
            "registered_contest_ids": list(registered_ids),
        }

    # ------------------------------------------------------------------ GET
    def get(self, request):
        from django.core.cache import cache

        user = get_user_from_request(request)

        try:
            # --- 1. Try the public (shared) cache first ----------------------
            PUBLIC_KEY  = 'home_dashboard_public'
            public_data = cache.get(PUBLIC_KEY)

            if public_data is None:
                # Full build — this is the slow path (DB queries)
                registered_ids = set()
                payload = self._build_payload(user, registered_ids)
                # Cache the base payload WITHOUT user-specific registration flags
                cache.set(PUBLIC_KEY, payload, timeout=self._PUBLIC_TTL)
            else:
                payload = public_data

            # --- 2. Overlay per-user registration data ----------------------
            if user:
                user_key  = f'home_reg_{user.id}'
                reg_ids   = cache.get(user_key)

                if reg_ids is None:
                    reg_ids = set()
                    try:
                        for r in ContestRegistration.objects.filter(user=user).only('contest'):
                            if r.contest:
                                reg_ids.add(str(r.contest.id))
                    except Exception:
                        pass
                    cache.set(user_key, reg_ids, timeout=self._USER_EXTRA_TTL)

                # Patch is_registered flags in upcoming / past lists
                if reg_ids:
                    for lst in ('upcoming_contests', 'past_contests', 'live_contests'):
                        for item in payload.get(lst, []):
                            item['is_registered'] = item['id'] in reg_ids
                    if payload.get('soonest_contest'):
                        sc_id = payload['soonest_contest'].get('contest_id')
                        payload['soonest_contest']['is_registered'] = sc_id in reg_ids
                    payload['registered_contest_ids'] = list(reg_ids)

            return Response(payload)

        except Exception as e:
            print(f"HomeDashboard error: {e}")
            return Response({
                "upcoming_contests": [],
                "live_contests": [],
                "past_contests": [],
                "blogs": [],
                "announcements": [],
                "leaderboard": [],
                "contributions": [],
                "soonest_contest": None,
                "registered_contest_ids": [],
            })



class ContestsDashboardAPIView(APIView):
    """
    GET /contests/dashboard/
    Single endpoint that returns ALL contest data for faster loading on Contests page.
    Cached with Redis (or LocMem fallback). Per-user registration flags are overlaid
    from a short-lived user-scoped cache key so the shared payload stays clean.
    """

    _PUBLIC_TTL   = 30    # 30 s shared contest list (status is time-sensitive)
    _USER_REG_TTL = 60    # 1 min  per-user registration set

    def _build_contests_payload(self, user_id):
        """Build the full contests list. Run only on cache miss."""
        from crossPlatform.models import ExternalContest
        import pytz
        from datetime import datetime, timedelta

        dhaka_tz = pytz.timezone('Asia/Dhaka')
        now = datetime.now(dhaka_tz)
        platform_map = {"codeforces": "cf", "leetcode": "lc", "codechef": "cc", "atcoder": "ac"}
        all_contests = []

        # Internal contests
        try:
            pipeline = [{"$sort": {"start_time": -1}}, {"$limit": 100}]
            for c in Contest.objects.aggregate(pipeline):
                cid = str(c.get('_id'))
                start = c.get('start_time')
                duration = c.get('duration') or 0
                contest_status = c.get('status', '')
                created_by_id = str(c.get('created_by', '')) if c.get('created_by') else None

                if contest_status == 'draft':
                    # Draft contests are ONLY visible to their creator — never to public cache
                    if user_id and created_by_id == user_id:
                        status_val = 'draft'
                    else:
                        continue  # hide from everyone else
                elif start:
                    if start.tzinfo is None:
                        start = dhaka_tz.localize(start)
                    end = start + timedelta(hours=duration)
                    if now < start:
                        status_val = 'upcoming'
                    elif now <= end:
                        status_val = 'live'
                    else:
                        status_val = 'past'
                else:
                    status_val = 'upcoming'

                all_contests.append({
                    "id": cid,
                    "title": c.get('title', ''),
                    "description": c.get('description', ''),
                    "start_time": start.isoformat() if start else None,
                    "duration": duration,
                    "type": c.get('type', 'individual'),
                    "platform": "IUT",
                    "status": status_val,
                    "participants": 0,
                    "is_registered": False,   # patched per-user below
                    "is_creator": user_id and str(c.get('created_by')) == user_id,
                    "external": False,
                    "is_external": False,
                    "is_test_contest": False,
                })
        except Exception as e:
            print(f"ContestsDashboard internal error: {e}")

        # External contests
        try:
            pipeline = [{"$sort": {"start_time": -1}}, {"$limit": 30}]
            for ec in ExternalContest.objects.aggregate(pipeline):
                plat = ec.get('platform', '')
                plat_code = platform_map.get(plat, plat)
                ext_status = ec.get('status', '')
                if ext_status == 'finished':
                    ext_status = 'past'
                start = ec.get('start_time')
                all_contests.append({
                    "id": f"{plat}-{ec.get('external_id', '')}",
                    "title": ec.get('title', ''),
                    "description": f"{plat_code.upper()} Contest",
                    "start_time": start.isoformat() if start else None,
                    "duration": ec.get('duration_formatted', ''),
                    "duration_seconds": ec.get('duration_seconds', 0),
                    "type": "individual",
                    "platform": plat_code,
                    "status": ext_status,
                    "participants": ec.get('participants', 0),
                    "is_registered": False,
                    "is_creator": False,
                    "external": True,
                    "is_external": True,
                    "is_test_contest": False,
                    "url": ec.get('url', ''),
                })
        except Exception as e:
            print(f"ContestsDashboard external error: {e}")

        # Sort all contests cross-platform by start_time (closest first, nulls last)
        all_contests.sort(key=lambda x: x['start_time'] if x['start_time'] else '9999')

        return all_contests

    def get(self, request):
        from django.core.cache import cache

        try:
            user = get_user_from_request(request)
            user_id = str(user.id) if user else None

            # --- 1. Shared public cache (never contains drafts) -------------
            PUBLIC_KEY = 'contests_dashboard_public'
            public_contests = cache.get(PUBLIC_KEY)

            if public_contests is None:
                # Build without user_id so NO drafts are included in shared cache
                public_contests = self._build_contests_payload(None)
                cache.set(PUBLIC_KEY, public_contests, timeout=self._PUBLIC_TTL)

            # Work on a shallow copy so we don't mutate the cached list
            all_contests = [dict(c) for c in public_contests]

            # --- 2. Inject creator's own drafts (per-user, never cached publicly) ---
            if user:
                draft_key = f'contests_drafts_v2_{user.id}'
                user_drafts = cache.get(draft_key)

                if user_drafts is None:
                    user_drafts = []
                    try:
                        # Use MongoEngine ORM directly — more reliable than raw aggregation
                        for c in Contest.objects(status='draft', created_by=user).order_by('-id')[:50]:
                            user_drafts.append({
                                "id": str(c.id),
                                "title": c.title or '',
                                "description": c.description or '',
                                "start_time": c.start_time.isoformat() if c.start_time else None,
                                "duration": c.duration or 0,
                                "type": c.type or 'individual',
                                "platform": "IUT",
                                "status": "draft",
                                "participants": 0,
                                "is_registered": False,
                                "is_creator": True,
                                "external": False,
                                "is_external": False,
                                "is_test_contest": False,
                            })
                    except Exception as e:
                        print(f"Draft fetch error: {e}")
                    # Always cache (including empty list) — use sentinel '__fetched__' flag
                    cache.set(draft_key, user_drafts if user_drafts else '__empty__', timeout=self._USER_REG_TTL)

                # Normalize sentinel back to empty list
                if user_drafts == '__empty__':
                    user_drafts = []

                all_contests = user_drafts + all_contests

            # --- 3. Per-user registration overlay ---------------------------
            registered_ids = set()
            if user:
                user_key = f'contests_reg_{user.id}'
                registered_ids = cache.get(user_key)

                if registered_ids is None:
                    registered_ids = set()
                    try:
                        for r in ContestRegistration.objects.filter(user=user).only('contest'):
                            if r.contest:
                                registered_ids.add(str(r.contest.id))
                    except Exception:
                        pass
                    cache.set(user_key, registered_ids, timeout=self._USER_REG_TTL)

                if registered_ids:
                    for item in all_contests:
                        item['is_registered'] = item['id'] in registered_ids

            return Response({
                "contests": all_contests,
                "registered_contests": list(registered_ids),
                "total": len(all_contests),
            })

        except Exception as e:
            print(f"ContestsDashboard error: {e}")
            return Response({"contests": [], "registered_contests": [], "total": 0})

