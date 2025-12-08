# contest/views.py
# contest/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta, timezone
from mongoengine.errors import ValidationError as MEValidationError
import pytz

from .models import Contest, ContestProblem, ContestRegistration, TestCase
from .serializers import ContestCreateSerializer
from .utils.auth import get_user_from_request
from account.models import Account

from mongoengine.queryset.visitor import Q

# contest/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import pytz
from mongoengine.queryset.visitor import Q
from contest.models import Contest
from submission.models import Submission
from contest.utils.auth import get_user_from_request
from account.models import Account

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
                "accepted_count": 0
            }
        
        # If user is logged in, fetch their actual submission data
        if user:
            print(f"DEBUG: Fetching submissions for user {user.id} in contest {contest_id}")
            
            # Get all submissions by this user for this contest
            submissions = Submission.objects(
                contest=contest,
                user=user
            ).order_by('submitted_at')
            
            print(f"DEBUG: Found {len(submissions)} submissions")
            
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
                            # Calculate contest time
                            try:
                                if contest.start_time and submission.submitted_at:
                                    # Convert to timezone-aware datetimes
                                    dhaka_tz = pytz.timezone('Asia/Dhaka')
                                    
                                    # Ensure contest start_time is timezone aware
                                    if contest.start_time.tzinfo is None:
                                        start_time_dhaka = dhaka_tz.localize(contest.start_time)
                                    else:
                                        start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
                                    
                                    # Ensure submission time is timezone aware
                                    if submission.submitted_at.tzinfo is None:
                                        submitted_at_dhaka = dhaka_tz.localize(submission.submitted_at)
                                    else:
                                        submitted_at_dhaka = submission.submitted_at.astimezone(dhaka_tz)
                                    
                                    # Calculate time difference in minutes
                                    time_diff = (submitted_at_dhaka - start_time_dhaka).total_seconds() / 60.0
                                    status_data["contest_time"] = time_diff
                            except Exception as e:
                                print(f"DEBUG: Error calculating contest time: {e}")
                                status_data["contest_time"] = None
                else:
                    # If not solved yet, mark as attempted
                    if not status_data["solved"] and status_data["status"] == "unsolved":
                        status_data["status"] = "attempted"
            
            print(f"DEBUG: Final statuses: {problem_statuses}")
        else:
            print(f"DEBUG: User not authenticated, returning default statuses")
        
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
        
        if contest.status == "past":
            can_access = True
        elif contest.status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif contest.status in ["live", "upcoming", "test"]:
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
        if contest.status in ["live", "upcoming", "test"] and not contest.editorial_published:
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
    
class ContestEditorialAPIView(APIView):
    """
    API to manage contest editorial settings
    """
    
    def get(self, request, contest_id):
        """Get editorial status for a contest"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Count problems with tutorials
        problems_with_tutorials = sum(1 for p in contest.problems if p.tutorial and p.tutorial.strip())
        
        return Response({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "editorial_published": getattr(contest, 'editorial_published', False),
            "total_problems": len(contest.problems),
            "problems_with_tutorials": problems_with_tutorials,
            "can_publish": contest.status in ["past", "live", "test"]  # When editorial can be published
        })
    
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
                "editorial_published": contest.editorial_published
            })
        except Exception as e:
            return Response({"error": f"Failed to update editorial: {str(e)}"}, status=400)

class ContestProblemsAPIView(APIView):
    def get(self, request, contest_id):
        print(f"DEBUG: Starting ContestProblemsAPIView for contest: {contest_id}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}, Status: {contest.status}")
        except Contest.DoesNotExist:
            print(f"DEBUG: Contest not found")
            return Response({"error": "Contest not found"}, status=404)
        except Exception as e:
            print(f"DEBUG: Error getting contest: {str(e)}")
            return Response({"error": f"Server error: {str(e)}"}, status=500)
        
        user = get_user_from_request(request)
        user_id = user.id if user else None
        print(f"DEBUG: User ID: {user_id}")
        
        can_access = False
        
        # Determine access based on contest status
        if contest.status == "past":
            # Past contests are accessible to everyone
            can_access = True
            print("DEBUG: Past contest - access granted to all")
        elif contest.status == "draft":
            # Drafts - only accessible to creator
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
                print("DEBUG: Draft contest - creator access")
            else:
                print("DEBUG: Draft contest - access denied")
        elif contest.status in ["live", "upcoming", "test"]:
            # For live/upcoming/test contests, allow access to:
            # 1. Registered users
            # 2. Contest creator
            if user:
                # Check if user is registered
                try:
                    registration = ContestRegistration.objects.filter(
                        user=user, contest=contest
                    ).first()
                    is_registered = registration is not None
                    print(f"DEBUG: Registration check - found: {is_registered}")
                    
                    is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
                    print(f"DEBUG: User is creator: {is_creator}")
                    
                    can_access = is_registered or is_creator
                    print(f"DEBUG: Access granted: {can_access}")
                except Exception as e:
                    print(f"DEBUG: Error checking registration: {str(e)}")
                    return Response({"error": f"Error checking access: {str(e)}"}, status=500)
        
        # If access denied for non-past contests
        if not can_access and contest.status != "past":
            print(f"DEBUG: Access denied for contest status: {contest.status}")
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest",
                "contest_status": contest.status,
                "can_register": contest.status in ["live", "upcoming"]
            }, status=403)
        
        # Prepare problems list
        problems_list = []
        try:
            for idx, problem in enumerate(contest.problems):
                problem_data = {
                    "id": idx + 1,
                    "problem_id": problem.index,
                    "title": problem.title,
                    "slug": f"problem-{problem.index.lower()}",
                    "code": problem.index,
                    "difficulty": problem.difficulty or "Medium",
                    "time_limit": problem.time_limit_seconds,
                    "memory_limit": problem.memory_limit_mb,
                    "tags": problem.tags,
                    "points": 100,
                    "solved_count": 0,
                    "attempted_count": 0,
                    "status": "unsolved"
                }
                problems_list.append(problem_data)
            
            print(f"DEBUG: Prepared {len(problems_list)} problems")
        except Exception as e:
            print(f"DEBUG: Error preparing problems: {str(e)}")
            return Response({"error": f"Error preparing problems: {str(e)}"}, status=500)
        
        # Add contest info
        try:
            participant_count = ContestRegistration.objects(contest=contest).count()
            print(f"DEBUG: Participant count: {participant_count}")
            
            contest_info = {
                "id": str(contest.id),
                "title": contest.title,
                "status": contest.status,
                "start_time": contest.start_time.isoformat() if contest.start_time else None,
                "duration": contest.duration,
                "platform": contest.platform,
                "type": contest.type,
                "description": contest.description,
                "total_problems": len(contest.problems),
                "participants": participant_count
            }
        except Exception as e:
            print(f"DEBUG: Error getting contest info: {str(e)}")
            return Response({"error": f"Error getting contest info: {str(e)}"}, status=500)
        
        print(f"DEBUG: Successfully returning response")
        return Response({
            "problems": problems_list,
            "contest_info": contest_info,  # Optional: if you need contest info elsewhere
            "access_granted": can_access   # Optional
        })
    
def update_contest_schema():
    """Add editorial_published field to existing contests"""
    for contest in Contest.objects.all():
        if not hasattr(contest, 'editorial_published'):
            contest.editorial_published = False
            contest.save()
    print("Schema updated successfully")

class ContestProblemDetailAPIView(APIView):
    def get(self, request, contest_id, problem_index):
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Find the problem by index (A, B, C, etc.)
        problem = None
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Check access (same logic as ContestProblemsAPIView)
        user = get_user_from_request(request)
        can_access = False
        needs_registration = False
        
        if contest.status == "live":
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
                if not can_access:
                    needs_registration = True
            else:
                needs_registration = True
                
        elif contest.status == "upcoming":
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
                if not can_access:
                    needs_registration = True
            else:
                needs_registration = True
                
        elif contest.status == "past":
            can_access = True
        elif contest.status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        
        if not can_access:
            if needs_registration:
                return Response({
                    "error": "Registration required",
                    "message": "You need to register for this contest to access this problem",
                    "contest_status": contest.status,
                    "can_register": True if contest.status in ["live", "upcoming"] else False
                }, status=403)
            else:
                return Response({
                    "error": "Access denied",
                    "message": "You don't have access to this problem"
                }, status=403)
        
        # Prepare problem details
        problem_data = {
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "problem_index": problem.index,
            "problem_code": problem.index,
            "title": problem.title,
            "statement": problem.statement,
            "input_format": "",  # You might want to parse this from statement
            "output_format": "",  # You might want to parse this from statement
            "constraints": "",  # You might want to parse this from statement
            "time_limit": problem.time_limit_seconds,
            "memory_limit": problem.memory_limit_mb,
            "difficulty": problem.difficulty or "Medium",
            "tags": problem.tags,
            "tutorial": problem.tutorial or "",
            "tutorial_available": False,  # Add this
            "points": 100,
            "sample_test_cases": [],
            "test_cases": []  # Only for admins/creators
        }

        tutorial_available = False
        if problem.tutorial and problem.tutorial.strip():
            if contest.status == "past":
                tutorial_available = True
            elif contest.status == "draft":
                if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                    tutorial_available = True
            elif contest.status in ["live", "upcoming", "test"]:
                # During contest, only creator can see tutorial
                if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                    tutorial_available = True
                # Or if editorial is published
                elif getattr(contest, 'editorial_published', False):
                    tutorial_available = True

        problem_data["tutorial_available"] = tutorial_available
        
        # Add sample test cases
        for test_case in problem.test_cases:
            if test_case.sample:  # Only show sample test cases
                problem_data["sample_test_cases"].append({
                    "input": test_case.input,
                    "output": test_case.output,
                    "explanation": test_case.explanation
                })
        
        # Add full test cases if user is creator/admin
        if user and contest.created_by and str(contest.created_by.id) == str(user.id):
            problem_data["test_cases"] = [
                {
                    "input": tc.input,
                    "output": tc.output,
                    "explanation": tc.explanation,
                    "sample": tc.sample
                }
                for tc in problem.test_cases
            ]
        
        # Get problem stats (you'll need to implement this)
        problem_data["solved_count"] = 0  # Implement later
        problem_data["attempted_count"] = 0  # Implement later
        problem_data["accuracy"] = "0%"  # Implement later
        
        return Response(problem_data)  # MAKE SURE THIS LINE RETURNS A RESPONSE!

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
        for field in ['title', 'description', 'start_time', 'duration', 'type', 'platform']:
            if field in updated_data:
                setattr(contest, field, updated_data[field])

        # Update problems if provided - FIXED to preserve existing tutorials
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
        if 'test_duration' in updated_data:
            contest.test_duration = updated_data['test_duration']

        try:
            contest.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

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
            return Response({"error": "Contest not found"}, status=404)

        # Check required fields for publishing
        if contest.status == "draft":
            required_fields = ["start_time", "duration", "type", "platform", "problems"]
            missing_fields = [f for f in required_fields if not getattr(contest, f)]
            if missing_fields:
                return Response({"error": f"Missing fields to publish: {missing_fields}"}, status=400)

        # Get publish type from request
        publish_type = request.data.get("type", "final")
        
        if publish_type == "test":
            testers = request.data.get("testers", [])
            test_start_time = request.data.get("testStartTime")
            test_duration = request.data.get("testDuration")
            
            if not testers or not test_start_time:
                return Response({"error": "Test contest requires testers and test start time"}, status=400)
            
            # Convert test_start_time string to datetime if needed
            try:
                if isinstance(test_start_time, str):
                    test_start_time = datetime.fromisoformat(test_start_time.replace('Z', '+00:00'))
            except Exception as e:
                return Response({"error": f"Invalid test start time format: {str(e)}"}, status=400)
            
            contest.status = "test"
            contest.testers = testers
            contest.test_start_time = test_start_time
            if test_duration:
                contest.test_duration = float(test_duration)
        else:
            contest.status = "upcoming"
        
        # Update editorial published status if provided
        if 'editorial_published' in request.data:
            contest.editorial_published = request.data['editorial_published']
        
        try:
            contest.save()
            return Response({
                "message": "Contest published successfully", 
                "id": str(contest.id),
                "status": contest.status,
                "editorial_published": contest.editorial_published
            })
        except Exception as e:
            return Response({"error": f"Failed to save contest: {str(e)}"}, status=400)
          
from datetime import datetime, timedelta
import pytz

def get_contest_status(contest):
    """
    Calculate contest status based on current time.
    Duration is in hours (not minutes).
    """
    if getattr(contest, "status", "draft") == "draft":
        return {"status": "draft", "participants": 0}
    
    # Use Asia/Dhaka timezone
    dhaka_tz = pytz.timezone('Asia/Dhaka')
    
    # Current time in Dhaka
    now = datetime.now(dhaka_tz)
    start_time = contest.start_time
    
    if not start_time:
        return {"status": "upcoming", "participants": 0}
    
    # Ensure start_time is in Dhaka timezone
    if start_time.tzinfo is None:
        start_time = dhaka_tz.localize(start_time)
    elif str(start_time.tzinfo) != 'Asia/Dhaka':
        start_time = start_time.astimezone(dhaka_tz)
    
    # Convert duration from hours to minutes
    duration_hours = contest.duration if contest.duration else 0
    duration_minutes = duration_hours * 60
    
    if duration_hours > 0:
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        if start_time <= now <= end_time:
            status = "live"
        elif now < start_time:
            status = "upcoming"
        else:
            status = "past"
    else:
        # No duration specified
        status = "past" if now > start_time else "upcoming"
    
    participants = ContestRegistration.objects(contest=contest).count()
    
    return {"status": status, "participants": participants}

class ContestListCreateAPIView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        # If user is authenticated, show their drafts too
        if user:
            # Show all contests except other users' drafts
            contests = Contest.objects.filter(
                Q(status__ne="draft") | Q(created_by=user, status="draft")
            ).order_by("-start_time").limit(200)
        else:
            # For non-authenticated users, hide all drafts
            contests = Contest.objects.filter(status__ne="draft").order_by("-start_time").limit(200)
        
        data = []

        for c in contests:
            # Handle draft status specially
            if c.status == "draft":
                status_value = {"status": "draft", "participants": 0}
            else:
                status_value = get_contest_status(c)
            
            participant_count = ContestRegistration.objects(contest=c).count()
            
            # Check if current user is the creator
            is_creator = user and str(c.created_by.id) == str(user.id) if c.created_by else False

            data.append({
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "start_time": c.start_time.isoformat() if c.start_time else None,
                "duration": c.duration,
                "type": c.type,
                "platform": c.platform,
                "created_by": str(c.created_by.id) if c.created_by else None,
                "is_creator": is_creator,  # Add this field
                "status": status_value["status"],
                "participants": participant_count,
            })

        return Response({"contests": data})

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
        
        # Check if status is provided in request
        status_from_request = request.data.get("status")
        if status_from_request in ["test", "upcoming"]:
            # Validate required fields for publishing
            required_fields = ["start_time", "duration", "type", "platform", "problems"]
            missing_fields = [f for f in required_fields if not getattr(contest, f)]
            if missing_fields:
                return Response({"error": f"Missing fields to publish: {missing_fields}"}, status=400)
            
            contest.status = status_from_request
            
            # Handle test contest specific fields
            if status_from_request == "test":
                testers = request.data.get("testers", [])
                test_start_time = request.data.get("test_start_time")
                test_duration = request.data.get("test_duration")
                
                if not testers or not test_start_time:
                    return Response({"error": "Test contest requires testers and test_start_time"}, status=400)
                
                contest.testers = testers
                try:
                    contest.test_start_time = datetime.fromisoformat(test_start_time.replace('Z', '+00:00'))
                except Exception as e:
                    return Response({"error": f"Invalid test_start_time format: {str(e)}"}, status=400)
                
                if test_duration:
                    contest.test_duration = float(test_duration)
                    
            # Set editorial published if provided
            if 'editorial_published' in request.data:
                contest.editorial_published = request.data['editorial_published']
        else:
            # Default to draft
            contest.status = "draft"
            # Set editorial published if provided (for drafts)
            if 'editorial_published' in request.data:
                contest.editorial_published = request.data['editorial_published']

        # Ensure tutorials are saved for all problems
        if 'problems' in request.data:
            for idx, problem_data in enumerate(request.data['problems']):
                if idx < len(contest.problems) and 'tutorial' in problem_data:
                    contest.problems[idx].tutorial = problem_data['tutorial']

        try:
            contest.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": f"Contest {'published' if contest.status != 'draft' else 'created'} successfully",
            "id": str(contest.id),
            "status": contest.status,
            "editorial_published": contest.editorial_published
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
        
        # Check if contest is in a state that allows registration
        if contest.status not in ["live", "upcoming"]:
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

        return Response({"message": "Successfully registered"}, status=201)

class ContestDetailAPIView(APIView):
    def get(self, request, contest_id):
        try:
            c = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)

        user = get_user_from_request(request)
        
        # Check if user can access
        can_access = False
        needs_registration = False
        is_registered = False
        
        # Check registration status
        if user:
            registration = ContestRegistration.objects(user=user, contest=c).first()
            is_registered = bool(registration)
        
        # Check access based on contest status
        if c.status == "live":
            can_access = is_registered
            if not can_access:
                needs_registration = True
                
        elif c.status == "upcoming":
            can_access = is_registered
            if not can_access:
                needs_registration = True
                
        elif c.status == "past":
            can_access = True
        elif c.status == "draft":
            if user and c.created_by and str(c.created_by.id) == str(user.id):
                can_access = True
        
        # Get contest status with participants count
        status_value = get_contest_status(c)
        participant_count = ContestRegistration.objects(contest=c).count()
        
        # Check if user is creator
        is_creator = user and c.created_by and str(c.created_by.id) == str(user.id)
        
        # Prepare contest data
        contest_data = {
            "id": str(c.id),
            "title": c.title,
            "description": c.description or "",
            "start_time": c.start_time.isoformat() if c.start_time else None,
            "duration": c.duration,  # This is in hours
            "duration_minutes": c.duration * 60 if c.duration else None,  # Convert to minutes
            "type": c.type,
            "platform": c.platform,
            "status": status_value["status"],
            "participants": participant_count,
            "problems_count": len(c.problems) if c.problems else 0,
            "is_creator": is_creator,
            "created_by": {
                "id": str(c.created_by.id) if c.created_by else None,
                "name": c.created_by.name if c.created_by else None,
                "email": c.created_by.email if c.created_by else None
            } if c.created_by else None,
            "editorial_published": getattr(c, 'editorial_published', False),
            "access": {
                "can_access": can_access,
                "needs_registration": needs_registration,
                "is_registered": is_registered,
                "can_register": c.status in ["live", "upcoming"]
            }
        }

        return Response(contest_data)
        
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
            print(f"Error fetching announcements: {str(e)}")
            return Response({
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "announcements": []  # Return empty on error
            })
    
    def post(self, request, contest_id):
        """Create an announcement (creator only) - This is now handled by AnnouncementCreateAPIView"""
        return Response({
            "error": "Use /announcements/create/ endpoint for creating announcements"
        }, status=400)
    
class ContestProblemDetailAPIView(APIView):
    def get(self, request, contest_id, problem_index):
        print(f"DEBUG: ContestProblemDetailAPIView - contest: {contest_id}, problem: {problem_index}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}")
        except Contest.DoesNotExist:
            print("DEBUG: Contest not found")
            return Response({"error": "Contest not found"}, status=404)
        
        # Find the problem by index (A, B, C, etc.)
        problem = None
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            print(f"DEBUG: Problem {problem_index} not found in contest")
            return Response({"error": "Problem not found"}, status=404)
        
        print(f"DEBUG: Found problem: {problem.title}")
        
        # Check access
        user = get_user_from_request(request)
        print(f"DEBUG: User: {user.id if user else 'None'}")
        
        can_access = False
        
        if contest.status == "past":
            can_access = True
            print("DEBUG: Past contest - access granted")
        elif contest.status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
                print("DEBUG: Draft contest - creator access")
            else:
                print("DEBUG: Draft contest - access denied")
        elif contest.status in ["live", "upcoming"]:
            if user:
                # Check registration
                registration = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                is_registered = registration is not None
                print(f"DEBUG: User registered: {is_registered}")
                
                can_access = is_registered
        
        if not can_access:
            print(f"DEBUG: Access denied for contest status: {contest.status}")
            if contest.status in ["live", "upcoming"]:
                return Response({
                    "error": "Registration required",
                    "message": "You need to register for this contest to access this problem",
                    "contest_status": contest.status,
                    "can_register": True
                }, status=403)
            else:
                return Response({
                    "error": "Access denied",
                    "message": "You don't have access to this problem"
                }, status=403)
        
        # Prepare problem details
        try:
            problem_data = {
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "problem_index": problem.index,
                "problem_code": problem.index,
                "title": problem.title,
                "statement": problem.statement,
                "input_format": "",
                "output_format": "",
                "constraints": "",
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "difficulty": problem.difficulty or "Medium",
                "tags": problem.tags,
                "tutorial": problem.tutorial or "",
                "tutorial_available": False,
                "points": 100,
                "sample_test_cases": [],
                "test_cases": []
            }

            tutorial_available = False
            if problem.tutorial and problem.tutorial.strip():
                if contest.status == "past":
                    tutorial_available = True
                elif contest.status == "draft":
                    if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                        tutorial_available = True
                elif contest.status in ["live", "upcoming", "test"]:
                    if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                        tutorial_available = True
                    elif getattr(contest, 'editorial_published', False):
                        tutorial_available = True

            problem_data["tutorial_available"] = tutorial_available
            
            # Add sample test cases
            for test_case in problem.test_cases:
                if test_case.sample:
                    problem_data["sample_test_cases"].append({
                        "input": test_case.input,
                        "output": test_case.output,
                        "explanation": test_case.explanation
                    })
            
            # Add full test cases if user is creator/admin
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                problem_data["test_cases"] = [
                    {
                        "input": tc.input,
                        "output": tc.output,
                        "explanation": tc.explanation,
                        "sample": tc.sample
                    }
                    for tc in problem.test_cases
                ]
            
            print(f"DEBUG: Successfully prepared problem data")
            return Response(problem_data)
            
        except Exception as e:
            print(f"DEBUG: Error preparing problem data: {str(e)}")
            return Response({"error": f"Error preparing problem data: {str(e)}"}, status=500)
        
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
        elif contest.status == "test" and user.email in contest.testers:
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

        # Return the created announcement
        return Response({
            "message": "Announcement created successfully",
            "announcement": announcement.to_dict()
        }, status=201)
    
# Add this to your contest/views.py
class ContestEditorialAPIView(APIView):
    """
    Get editorial overview for a contest (accessible to all for past contests)
    """
    
    def get(self, request, contest_id):
        """Get editorial overview for a contest"""
        print(f"DEBUG: ContestEditorialAPIView - contest: {contest_id}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}, Status: {contest.status}")
        except Contest.DoesNotExist:
            print("DEBUG: Contest not found")
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        user_id = user.id if user else None
        print(f"DEBUG: User ID: {user_id}")
        
        # Check if editorial can be accessed
        can_access_editorial = False
        access_error = None
        
        if contest.status == "past":
            # Past contests - editorial is accessible to everyone
            can_access_editorial = True
            print("DEBUG: Past contest - editorial access granted to all")
        elif contest.status == "draft":
            # Drafts - only creator can access
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access_editorial = True
                print("DEBUG: Draft contest - creator can access editorial")
            else:
                access_error = "Editorial not available in draft contests"
                print("DEBUG: Draft contest - editorial access denied")
        elif contest.status in ["live", "upcoming", "test"]:
            # During contest, editorial is restricted
            if getattr(contest, 'editorial_published', False):
                # If editorial is explicitly published, allow access
                can_access_editorial = True
                print("DEBUG: Contest in progress - editorial published, access granted")
            elif user and contest.created_by and str(contest.created_by.id) == str(user.id):
                # Creator can always access
                can_access_editorial = True
                print("DEBUG: Contest in progress - creator access to editorial")
            else:
                access_error = "Editorial will be available after the contest ends"
                print("DEBUG: Contest in progress - editorial not published yet")
        
        if not can_access_editorial:
            print(f"DEBUG: Editorial access denied: {access_error}")
            return Response({
                "error": "Access denied",
                "message": access_error or "You don't have access to the editorial",
                "contest_status": contest.status,
                "editorial_published": getattr(contest, 'editorial_published', False),
                "can_access": False
            }, status=403)
        
        # Prepare editorial overview
        try:
            # Get all problems with tutorials
            problems_with_tutorials = []
            total_problems = len(contest.problems)
            
            for problem in contest.problems:
                has_tutorial = bool(problem.tutorial and problem.tutorial.strip())
                
                problem_data = {
                    "index": problem.index,
                    "title": problem.title,
                    "difficulty": problem.difficulty or "Medium",
                    "tags": problem.tags or [],
                    "has_tutorial": has_tutorial,
                    "tutorial_length": len(problem.tutorial) if has_tutorial else 0,
                    "tutorial_preview": problem.tutorial[:100] + "..." if has_tutorial and len(problem.tutorial) > 100 else (problem.tutorial if has_tutorial else "")
                }
                
                problems_with_tutorials.append(problem_data)
            
            # Count stats
            tutorials_count = sum(1 for p in problems_with_tutorials if p["has_tutorial"])
            
            print(f"DEBUG: Prepared editorial overview - {tutorials_count}/{total_problems} tutorials available")
            
            response_data = {
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "contest_status": contest.status,
                "editorial_published": getattr(contest, 'editorial_published', False),
                "total_problems": total_problems,
                "tutorials_available": tutorials_count,
                "problems": problems_with_tutorials,
                "can_access": True,
                "created_at": contest.start_time.isoformat() if contest.start_time else None,
                "created_by": {
                    "id": str(contest.created_by.id) if contest.created_by else None,
                    "name": contest.created_by.name if contest.created_by else None
                } if contest.created_by else None
            }
            
            return Response(response_data)
            
        except Exception as e:
            print(f"DEBUG: Error preparing editorial: {str(e)}")
            return Response({
                "error": f"Error preparing editorial: {str(e)}",
                "can_access": False
            }, status=500)


