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
    
class ContestProblemsAPIView(APIView):
    def get(self, request, contest_id):
        print(f"DEBUG: Starting ContestProblemsAPIView for contest: {contest_id}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}, Status: {get_contest_status(contest)}")
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
        if get_contest_status(contest) == "past":
            # Past contests are accessible to everyone
            can_access = True
            print("DEBUG: Past contest - access granted to all")
        elif get_contest_status(contest) == "draft":
            # Drafts - only accessible to creator
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
                print("DEBUG: Draft contest - creator access")
            else:
                print("DEBUG: Draft contest - access denied")
        elif get_contest_status(contest) in ["live", "upcoming", "test"]:
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
        if not can_access and get_contest_status(contest) != "past":
            print(f"DEBUG: Access denied for contest status: {get_contest_status(contest)}")
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest",
                "contest_status": get_contest_status(contest),
                "can_register": get_contest_status(contest) in ["live", "upcoming"]
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
                    "points": getattr(problem, 'points', 0) or 0,  # ADD THIS LINE
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
                "status": get_contest_status(contest),
                "start_time": contest.start_time.isoformat() if contest.start_time else None,
                "duration": contest.duration,
                "platform": contest.platform,  # MAKE SURE THIS IS INCLUDED
                "type": contest.type,  # MAKE SURE THIS IS INCLUDED
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
        print(f"DEBUG: ContestProblemDetailAPIView - contest: {contest_id}, problem: {problem_index}")

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
        
        print(f"DEBUG: Found problem: {problem.title}")
        
        # Check access (same logic as ContestProblemsAPIView)
        user = get_user_from_request(request)
        print(f"DEBUG: User: {user.id if user else 'None'}")

        can_access = False

        needs_registration = False
        
        if get_contest_status(contest) == "live":
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
                if not can_access:
                    needs_registration = True
            else:
                needs_registration = True
                
        elif get_contest_status(contest) == "upcoming":
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
                if not can_access:
                    needs_registration = True
            else:
                needs_registration = True
                
        elif get_contest_status(contest) == "past":
            can_access = True
        elif get_contest_status(contest) == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        
        if not can_access:
            if needs_registration:
                return Response({
                    "error": "Registration required",
                    "message": "You need to register for this contest to access this problem",
                    "contest_status": get_contest_status(contest),
                    "can_register": True if get_contest_status(contest) in ["live", "upcoming"] else False
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
                "contest_status": get_contest_status(contest),  # Make sure this is included
                "contest_platform": contest.platform,  # ADD THIS
                "contest_type": contest.type,  # ADD THIS
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
                "points": getattr(problem, 'points', 0) or 0,  # ADD THIS LINE
                "sample_test_cases": [],
                "test_cases": []  # Only for admins/creators
            }

            tutorial_available = False
            if problem.tutorial and problem.tutorial.strip():
                if get_contest_status(contest) == "past":
                    tutorial_available = True
                elif get_contest_status(contest) == "draft":
                    if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                        tutorial_available = True
                elif get_contest_status(contest) in ["live", "upcoming", "test"]:
                    # During contest, only creator can see tutorial
                    if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                        tutorial_available = True
                    # Or if editorial is published
                    elif getattr(contest, 'editorial_published', False):
                        tutorial_available = True

            problem_data["tutorial_available"] = tutorial_available
        
        # Add sample test cases
            for test_case in problem.test_cases:
                if test_case.sample and not getattr(test_case, 'hidden', False):  # ADD hidden check
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
                        "sample": tc.sample,
                        "hidden": getattr(tc, 'hidden', False)  # ADD THIS LINE
                    }
                    for tc in problem.test_cases
                ]
        
            # Get problem stats (you'll need to implement this)
            problem_data["solved_count"] = 0  # Implement later
            problem_data["attempted_count"] = 0  # Implement later
            problem_data["accuracy"] = "0%"  # Implement later
        
            return Response(problem_data)  # MAKE SURE THIS LINE RETURNS A RESPONSE!
        
        except Exception as e:
            print(f"DEBUG: Error preparing problem data: {str(e)}")
            return Response({"error": f"Error preparing problem data: {str(e)}"}, status=500)

class ContestUpdateAPIView(APIView):
    def patch(self, request, contest_id):
        print(f"DEBUG: ContestUpdateAPIView called for contest: {contest_id}")
        print(f"DEBUG: Request data: {request.data}")
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            contest = Contest.objects.get(id=contest_id, created_by=user)
            print(f"DEBUG: Found contest. Current status: {contest.status}")
            print(f"DEBUG: Calculated status: {get_contest_status(contest)}")
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

        # Return the ACTUAL contest.status, not calculated status
        return Response({
            "message": "Contest updated successfully",
            "id": str(contest.id),
            "status": contest.status,  # Use the stored status, not calculated
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
                print(f"DEBUG: Updating contest status from '{contest.status}' to '{calculated_status}'")
                contest.status = calculated_status
                contest.save()
                print(f"DEBUG: Contest status updated in database")
            except Exception as e:
                print(f"DEBUG: Error updating contest status: {str(e)}")
                # Don't fail, just continue with calculated status
    
    return calculated_status

class ContestListCreateAPIView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
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

            return Response({"contests": data})
        except Exception as e:
            # Return empty contests list if database is unavailable
            print(f"Database error in ContestListCreateAPIView: {e}")
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)


class UpcomingContestListCreateAPIView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get upcoming contests only - limit for performance
            all_contests = Contest.objects.all().order_by("start_time").limit(50)
            
            print(f"🔍 [DEBUG] Total contests in DB: {len(all_contests)}")  # DEBUG

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("test_start_time").limit(20)
                
                print(f"🔍 [DEBUG] User test contests: {len(test_contests)}")  # DEBUG
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                print(f"🔍 [DEBUG] Contest: {c.title[:50]}... | Status: {status_value}")  # DEBUG
                
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

            print(f"🔍 [DEBUG] Final upcoming contests: {len(data)}")  # DEBUG

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
            # Return empty contests list if database is unavailable
            print(f"Database error in UpcomingContestListCreateAPIView: {e}")
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)



class SoonestUpcomingContestView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get all contests
            all_contests = Contest.objects.all().order_by("start_time")  # Ascending order to get soonest first
            
            print(f"Total contests in database: {all_contests.count()}")  # Debug
            
            # Find the soonest upcoming contest
            soonest_contest = None
            
            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                print(f"Contest: {c.title}, Status: {status_value}")  # Debug
                
                # Only consider upcoming contests
                if status_value == "upcoming":
                    soonest_contest = c
                    print(f"Found upcoming contest: {c.title}")  # Debug
                    break  # First upcoming contest in ascending order is the soonest
            
            if not soonest_contest:
                print("No upcoming contests found")  # Debug
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
            # Print the full exception details
            import traceback
            print(f"Database error in SoonestUpcomingContestView: {str(e)}")
            print(traceback.format_exc())  # This will print the full stack trace
            
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
            
            print(f"🔍 [DEBUG] PastContests - Total contests in DB: {len(all_contests)}")  # DEBUG

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("-test_start_time").limit(20)
                
                print(f"🔍 [DEBUG] PastContests - User test contests: {len(test_contests)}")  # DEBUG
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                print(f"🔍 [DEBUG] PastContests - Contest: {c.title[:50]}... | Status: {status_value}")  # DEBUG
                
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

            print(f"🔍 [DEBUG] PastContests - Final past contests: {len(data)}")  # DEBUG

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
            # Return empty contests list if database is unavailable
            print(f"Database error in PastContestsView: {e}")
            return Response({"contests": [], "warning": "Contest data temporarily unavailable"}, status=200)

class LiveContestsView(APIView):
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            # Get live contests only - limit for performance
            all_contests = Contest.objects.all().order_by("-start_time").limit(50)
            
            print(f"🔍 [DEBUG] LiveContests - Total contests in DB: {len(all_contests)}")  # DEBUG

            test_contests = []

            if user:
                # Get test contests where user is a tester or creator
                test_contests = TestContest.objects.filter(
                    Q(testers__contains=user.email) | Q(created_by=user)
                ).order_by("-test_start_time").limit(20)
                
                print(f"🔍 [DEBUG] LiveContests - User test contests: {len(test_contests)}")  # DEBUG
            
            data = []

            for c in all_contests:
                # Calculate status dynamically
                status_value = get_contest_status(c)
                
                print(f"🔍 [DEBUG] LiveContests - Contest: {c.title[:50]}... | Status: {status_value}")  # DEBUG
                
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

            print(f"🔍 [DEBUG] LiveContests - Final live contests: {len(data)}")  # DEBUG

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
            # Return empty contests list if database is unavailable
            print(f"Database error in LiveContestsView: {e}")
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

        # Calculate the current status
        current_status = get_contest_status(contest)
        
        return Response({
            "message": f"Contest created successfully",
            "id": str(contest.id),
            "status": current_status,  # Calculated status
            "editorial_published": contest.editorial_published,
            "is_draft": current_status == "draft"
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
            print(f"Database error in ContestRegisterAPIView: {e}")
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

            return Response({"message": "Successfully registered"}, status=201)
        except Exception as e:
            print(f"Database error in ContestRegisterAPIView during processing: {e}")
            return Response({"error": "Database temporarily unavailable"}, status=503)

class ContestDetailAPIView(APIView):
    def get(self, request, contest_id):
        try:
            c = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        except Exception as e:
            print(f"Database error in ContestDetailAPIView retrieving contest: {e}")
            return Response({"error": "Database temporarily unavailable"}, status=503)

        try:
            user = get_user_from_request(request)
            
            # Calculate status dynamically
            status_value = get_contest_status(c)
            
            # Check if user can access
            can_access = False
            needs_registration = False
            is_registered = False
            
            # Check registration status
            if user:
                registration = ContestRegistration.objects(user=user, contest=c).first()
                is_registered = bool(registration)
            
            # Check access based on calculated contest status
            if status_value == "live":
                can_access = is_registered
                if not can_access:
                    needs_registration = True
                    
            elif status_value == "upcoming":
                can_access = is_registered
                if not can_access:
                    needs_registration = True
                    
            elif status_value == "past":
                can_access = True
            elif status_value == "draft":
                if user and c.created_by and str(c.created_by.id) == str(user.id):
                    can_access = True
            
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
                "duration_minutes": c.duration * 60 if c.duration else None,
                "type": c.type,
                "platform": c.platform,
                "status": status_value,  # Use calculated status
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
                    "can_register": status_value in ["live", "upcoming"]
                }
            }

            return Response(contest_data)
        except Exception as e:
            print(f"Database error in ContestDetailAPIView processing request: {e}")
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
        print(f"DEBUG: ContestEditorialAPIView - contest: {contest_id}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}, Status: {get_contest_status(contest)}")
        except Contest.DoesNotExist:
            print("DEBUG: Contest not found")
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        user_id = user.id if user else None
        print(f"DEBUG: User ID: {user_id}")
        
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
            # Past contests - editorial is accessible to everyone
            can_access_editorial = True
            print("DEBUG: Past contest - editorial access granted to all")
        elif contest_status == "draft":
            # Drafts - only creator can access
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access_editorial = True
                print("DEBUG: Draft contest - creator can access editorial")
            else:
                access_error = "Editorial not available in draft contests"
                print("DEBUG: Draft contest - editorial access denied")
        elif contest_status in ["live", "upcoming", "test"]:
            # During contest, editorial is restricted
            if editorial_published_status:
                # If editorial is published, allow access
                can_access_editorial = True
                print("DEBUG: Contest in progress - editorial published, access granted")
            elif user and contest.created_by and str(contest.created_by.id) == str(user.id):
                # Creator can always access
                can_access_editorial = True
                print("DEBUG: Contest in progress - creator access to editorial")
            else:
                access_error = "Editorial will be available after the contest ends"
                print("DEBUG: Contest in progress - editorial not published yet")
        
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
            
            print(f"DEBUG: Prepared editorial overview - {problems_with_tutorials}/{total_problems} tutorials available")
            
            # Check if user can publish editorial
            can_publish = contest_status in ["past", "live", "test"] and user and contest.created_by and str(contest.created_by.id) == str(user.id)
            
            if not can_access_editorial:
                print(f"DEBUG: Editorial access denied: {access_error}")
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
            print(f"DEBUG: Error preparing editorial: {str(e)}")
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
            print(f"DEBUG: Error creating test contest: {str(e)}")
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
        print(f"\n=== DEBUG: StartContestRecordingAPIView called ===")
        print(f"Contest ID: {contest_id}")
        
        user = get_user_from_request(request)
        if not user:
            print("DEBUG: No user found")
            return Response({"error": "Authentication required"}, status=401)
        
        print(f"DEBUG: User ID: {user.id}, Email: {user.email}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Contest found: {contest.title}")
            print(f"DEBUG: Contest require_screen_recording: {getattr(contest, 'require_screen_recording', 'NOT SET')}")
        except Contest.DoesNotExist as e:
            print(f"DEBUG: Contest not found error: {e}")
            return Response({"error": "Contest not found"}, status=404)
        except Exception as e:
            print(f"DEBUG: Error getting contest: {e}")
            return Response({"error": f"Error getting contest: {str(e)}"}, status=500)
        
        # Check if contest requires recording
        requires_recording = getattr(contest, 'require_screen_recording', False)
        print(f"DEBUG: Requires recording: {requires_recording}")
        
        if not requires_recording:
            return Response({
                "error": "This contest does not require screen recording"
            }, status=400)
        
        # Check if user has already started recording
        recordings_started = getattr(contest, 'recordings_started', [])
        print(f"DEBUG: Recordings started list: {recordings_started}")
        print(f"DEBUG: User ID string: {str(user.id)}")
        
        if str(user.id) in recordings_started:
            print(f"DEBUG: User already in recordings_started")
            return Response({
                "error": "Recording already started for this contest"
            }, status=400)
        
        # Check if there's an existing recording record
        try:
            print(f"DEBUG: Checking for existing ContestScreenRecording records...")
            existing_recordings = ContestScreenRecording.objects.filter(
                contest=contest,
                user=user
            )
            print(f"DEBUG: Found {existing_recordings.count()} existing recordings")
            
            existing_recording = existing_recordings.filter(
                recording_status__in=["recording", "stopped"]
            ).first()
            
            if existing_recording:
                print(f"DEBUG: Found active recording: {existing_recording.id}")
                return Response({
                    "error": "Recording already in progress or completed"
                }, status=400)
        except Exception as e:
            print(f"DEBUG: Error checking existing recordings: {e}")
            import traceback
            traceback.print_exc()
        
        # Create recording record
        try:
            print(f"DEBUG: Creating new ContestScreenRecording...")
            
            # Create with minimal required fields first
            recording = ContestScreenRecording()
            recording.contest = contest
            recording.user = user
            recording.start_time = datetime.now()
            
            # Try to save
            print(f"DEBUG: Saving recording...")
            recording.save()
            print(f"DEBUG: Recording saved successfully! ID: {recording.id}")
            
        except Exception as e:
            print(f"DEBUG: ERROR saving recording:")
            import traceback
            error_traceback = traceback.format_exc()
            print(error_traceback)
            
            # Try alternative save method
            try:
                print(f"DEBUG: Trying alternative save method...")
                recording = ContestScreenRecording(
                    contest=contest,
                    user=user,
                    start_time=datetime.now()
                )
                # Don't set recording_status, use default
                recording.save()
                print(f"DEBUG: Alternative save worked! ID: {recording.id}")
            except Exception as e2:
                print(f"DEBUG: Alternative save also failed: {e2}")
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
                print(f"DEBUG: Updating contest recordings_started...")
                contest.save()
                print(f"DEBUG: Contest updated successfully")
        except Exception as e:
            print(f"DEBUG: Warning - Could not update contest: {e}")
        
        # Prepare response
        try:
            recording_id_str = str(recording.id) if hasattr(recording, 'id') else "unknown"
            start_time_iso = recording.start_time.isoformat() if hasattr(recording.start_time, 'isoformat') else datetime.now().isoformat()
            
            print(f"DEBUG: Returning success response")
            return Response({
                "message": "Recording started successfully",
                "recording_id": recording_id_str,
                "start_time": start_time_iso,
                "contest_id": str(contest.id),
                "user_id": str(user.id)
            })
        except Exception as e:
            print(f"DEBUG: Error preparing response: {e}")
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
    """
    
    def get(self, request):
        user = get_user_from_request(request)
        
        try:
            from datetime import datetime, timezone as dt_timezone
            from blog.models import Blog
            from announcement.models import Announcement
            import pytz
            
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            now = datetime.now(dhaka_tz)
            
            upcoming_contests = []
            live_contests = []
            past_contests = []
            soonest_upcoming = None
            
            # Get registered contest IDs
            registered_ids = set()
            if user:
                try:
                    for r in ContestRegistration.objects.filter(user=user).only('contest'):
                        if r.contest:
                            registered_ids.add(str(r.contest.id))
                except:
                    pass
            
            # Internal 0Point contests ONLY - use aggregation for speed
            try:
                # Get all non-draft contests sorted by start_time
                pipeline = [
                    {"$match": {"status": {"$ne": "draft"}}},
                    {"$sort": {"start_time": 1}},
                    {"$limit": 100}
                ]
                for c in Contest.objects.aggregate(pipeline):
                    cid = str(c.get('_id'))
                    start = c.get('start_time')
                    duration = c.get('duration') or 0
                    
                    # Calculate status based on current time
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
                        "is_external": False
                    }
                    
                    if status_val == "upcoming":
                        upcoming_contests.append(contest_data)
                        # Track soonest for countdown
                        if start and (soonest_upcoming is None or start < soonest_upcoming.get("_start_raw")):
                            time_until = start - now
                            soonest_upcoming = {
                                "contest_id": cid,
                                "title": c.get('title', ''),
                                "platform": "0point",
                                "start_time": start.isoformat(),
                                "is_registered": cid in registered_ids,
                                "_start_raw": start,
                                "time_until": {
                                    "days": max(0, time_until.days),
                                    "hours": max(0, time_until.seconds // 3600),
                                    "minutes": max(0, (time_until.seconds % 3600) // 60),
                                    "seconds": max(0, time_until.seconds % 60)
                                }
                            }
                    elif status_val == "live":
                        live_contests.append(contest_data)
                    else:
                        # For past contests, get actual participant count
                        try:
                            from bson import ObjectId
                            contest_data["participants"] = ContestRegistration.objects(contest=ObjectId(cid)).count()
                        except:
                            pass
                        past_contests.append(contest_data)
            except Exception as e:
                print(f"Internal contests error: {e}")
            
            # External platform contests (Codeforces, LeetCode, etc.)
            try:
                from crossPlatform.models import ExternalContest
                platform_map = {"codeforces": "cf", "leetcode": "lc", "codechef": "cc", "atcoder": "ac"}
                
                pipeline = [
                    {"$match": {"status": "upcoming"}},
                    {"$sort": {"start_time": 1}},
                    {"$limit": 20}
                ]
                for ec in ExternalContest.objects.aggregate(pipeline):
                    plat = ec.get('platform', '')
                    plat_code = platform_map.get(plat, plat)
                    start = ec.get('start_time')
                    dur_sec = ec.get('duration_seconds', 0) or 0
                    
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
                        "external_url": ec.get('url', '')
                    })
            except Exception as e:
                print(f"External contests error: {e}")
            
            # Sort upcoming by start_time (soonest first), past by start_time (most recent first)
            upcoming_contests.sort(key=lambda x: x["start_time"] or "9999")
            past_contests.sort(key=lambda x: x["start_time"] or "", reverse=True)
            
            # Clean up soonest_upcoming
            if soonest_upcoming:
                soonest_upcoming.pop("_start_raw", None)
            
            # 3. Blogs (top 3)
            blogs_data = []
            try:
                for blog in Blog.objects(is_published=True).order_by('-published_at').limit(3):
                    blogs_data.append(blog.to_dict())
            except:
                pass
            
            # 4. Announcements (top 5)
            announcements_data = []
            try:
                for ann in Announcement.objects(contest=None).order_by("-is_pinned", "-created_at").limit(5):
                    announcements_data.append(ann.to_dict())
            except:
                pass
            
            # 5. Leaderboard (top 5)
            leaderboard_data = []
            try:
                rank = 1
                for u in Account.objects(is_deleted=False, is_inactive=False).order_by('-rating').limit(5):
                    leaderboard_data.append({
                        "user_id": str(u.id),
                        "username": u.name,
                        "total_points": u.rating,
                        "rank": rank
                    })
                    rank += 1
            except:
                pass
            
            # 6. Contributors - skip for speed, or use cached
            contributions_data = []
            
            return Response({
                "upcoming_contests": upcoming_contests[:5],
                "live_contests": live_contests,
                "past_contests": past_contests[:5],
                "blogs": blogs_data,
                "announcements": announcements_data,
                "leaderboard": leaderboard_data,
                "contributions": contributions_data,
                "soonest_contest": soonest_upcoming,
                "registered_contest_ids": list(registered_ids)
            })
            
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
                "registered_contest_ids": []
            })


class ContestsDashboardAPIView(APIView):
    """
    GET /contests/dashboard/
    Single endpoint that returns ALL contest data for faster loading on Contests page.
    """
    
    def get(self, request):
        try:
            from crossPlatform.models import ExternalContest
            import pytz
            from datetime import datetime, timedelta
            
            user = get_user_from_request(request)
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            now = datetime.now(dhaka_tz)
            
            platform_map = {"codeforces": "cf", "leetcode": "lc", "codechef": "cc", "atcoder": "ac"}
            all_contests = []
            registered_ids = set()
            user_id = str(user.id) if user else None
            
            # Registrations
            if user:
                try:
                    for r in ContestRegistration.objects.filter(user=user).only('contest'):
                        if r.contest:
                            registered_ids.add(str(r.contest.id))
                except:
                    pass
            
            # Internal contests - raw query for speed
            try:
                pipeline = [{"$sort": {"start_time": -1}}, {"$limit": 100}]
                for c in Contest.objects.aggregate(pipeline):
                    cid = str(c.get('_id'))
                    start = c.get('start_time')
                    duration = c.get('duration') or 0
                    contest_status = c.get('status', '')
                    
                    # Calculate status - skip only if explicitly draft and not creator
                    if contest_status == 'draft':
                        if user_id and str(c.get('created_by')) == user_id:
                            status_val = 'draft'
                        else:
                            continue
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
                        "is_registered": cid in registered_ids,
                        "is_creator": user_id and str(c.get('created_by')) == user_id,
                        "external": False,
                        "is_external": False,
                        "is_test_contest": False
                    })
            except Exception as e:
                print(f"Internal error: {e}")
            
            # External contests - raw query
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
                        "url": ec.get('url', '')
                    })
            except Exception as e:
                print(f"External error: {e}")
            
            return Response({
                "contests": all_contests,
                "registered_contests": list(registered_ids),
                "total": len(all_contests)
            })
            
        except Exception as e:
            print(f"Dashboard error: {e}")
            return Response({"contests": [], "registered_contests": [], "total": 0})
