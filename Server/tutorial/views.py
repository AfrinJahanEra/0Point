# tutorial/views.py (create this file)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from mongoengine.errors import ValidationError as MEValidationError, DoesNotExist

from contest.models import Contest
from account.models import Account
from .models import Tutorial
from .serializers import TutorialSerializer, TutorialResponseSerializer
from contest.utils.auth import get_user_from_request

class TutorialListCreateAPIView(APIView):
    def get(self, request, contest_id):
        """Get all tutorials for a contest"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user has permission (creator or admin)
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        if not is_creator:
            return Response({"error": "Permission denied. Only contest creator can manage tutorials."}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Get tutorials for this contest
        tutorials = Tutorial.objects(contest=contest)
        
        # Group by problem index
        tutorial_dict = {}
        for tutorial in tutorials:
            if tutorial.problem_index not in tutorial_dict:
                tutorial_dict[tutorial.problem_index] = []
            tutorial_dict[tutorial.problem_index].append({
                "id": str(tutorial.id),
                "content": tutorial.content,
                "created_at": tutorial.created_at,
                "updated_at": tutorial.updated_at,
                "version": tutorial.version
            })
        
        return Response({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "tutorials_by_problem": tutorial_dict
        })
    
    def post(self, request, contest_id):
        """Create or update a tutorial"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user has permission (creator)
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        if not is_creator:
            return Response({"error": "Permission denied. Only contest creator can manage tutorials."}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Validate request data
        serializer = TutorialSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Check if problem exists in contest
        problem_exists = False
        for problem in contest.problems:
            if problem.index == data['problem_index']:
                problem_exists = True
                break
        
        if not problem_exists:
            return Response({"error": f"Problem {data['problem_index']} not found in contest"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if tutorial already exists
        existing_tutorial = Tutorial.objects(
            contest=contest, 
            problem_index=data['problem_index']
        ).first()
        
        if existing_tutorial:
            # Update existing tutorial
            existing_tutorial.content = data['content']
            existing_tutorial.version += 1
            try:
                existing_tutorial.save()
                tutorial = existing_tutorial
            except MEValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Create new tutorial
            try:
                tutorial = Tutorial(
                    contest=contest,
                    problem_index=data['problem_index'],
                    content=data['content'],
                    created_by=user
                )
                tutorial.save()
            except MEValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Also update the tutorial field in ContestProblem
        for problem in contest.problems:
            if problem.index == data['problem_index']:
                problem.tutorial = data['content']
                break
        
        try:
            contest.save()
        except Exception as e:
            # Log error but don't fail the tutorial save
            print(f"Warning: Could not update contest problem tutorial field: {e}")
        
        # Return response
        response_data = {
            "id": str(tutorial.id),
            "contest_id": str(contest.id),
            "problem_index": tutorial.problem_index,
            "content": tutorial.content,
            "created_by": str(user.id),
            "created_at": tutorial.created_at,
            "updated_at": tutorial.updated_at,
            "version": tutorial.version,
            "message": "Tutorial saved successfully"
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class TutorialDetailAPIView(APIView):
    def get(self, request, contest_id, problem_index):
        """Get tutorial for a specific problem"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if problem exists
        problem_exists = False
        problem_data = None
        for problem in contest.problems:
            if problem.index == problem_index.upper():
                problem_exists = True
                problem_data = {
                    "index": problem.index,
                    "title": problem.title,
                    "code": problem.index,
                    "difficulty": problem.difficulty or "Medium",
                    "tags": problem.tags
                }
                break
        
        if not problem_exists:
            return Response({"error": f"Problem {problem_index} not found in contest"}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Get tutorial
        tutorial = Tutorial.objects(
            contest=contest, 
            problem_index=problem_index.upper()
        ).first()
        
        # Check if user has access
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Different access rules based on contest status
        can_access_tutorial = False
        
        if contest.status == "past":
            # Past contests: everyone can see tutorials
            can_access_tutorial = True
        elif contest.status == "draft":
            # Drafts: only creator can see
            is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
            can_access_tutorial = is_creator
        elif contest.status in ["upcoming", "live"]:
            # Live/upcoming: only registered users can see
            from contest.models import ContestRegistration
            is_registered = ContestRegistration.objects.filter(
                user=user, contest=contest
            ).first()
            can_access_tutorial = bool(is_registered)
        else:
            # Other statuses: default to no access
            can_access_tutorial = False
        
        if not can_access_tutorial:
            return Response({
                "error": "Access denied",
                "message": "You don't have permission to view this tutorial"
            }, status=status.HTTP_403_FORBIDDEN)
        
        response_data = {
            "contest": {
                "id": str(contest.id),
                "title": contest.title,
                "status": contest.status
            },
            "problem": problem_data,
            "tutorial": {
                "content": tutorial.content if tutorial else "",
                "exists": bool(tutorial),
                "created_at": tutorial.created_at if tutorial else None,
                "updated_at": tutorial.updated_at if tutorial else None,
                "version": tutorial.version if tutorial else 0
            },
            "permissions": {
                "can_edit": contest.created_by and str(contest.created_by.id) == str(user.id)
            }
        }
        
        return Response(response_data)
    
    def delete(self, request, contest_id, problem_index):
        """Delete tutorial for a problem"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is creator
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        if not is_creator:
            return Response({"error": "Permission denied. Only contest creator can delete tutorials."}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Find and delete tutorial
        tutorial = Tutorial.objects(
            contest=contest, 
            problem_index=problem_index.upper()
        ).first()
        
        if not tutorial:
            return Response({"error": "Tutorial not found"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            tutorial.delete()
            
            # Also clear tutorial field in ContestProblem
            for problem in contest.problems:
                if problem.index == problem_index.upper():
                    problem.tutorial = ""
                    break
            
            contest.save()
            
            return Response({
                "message": "Tutorial deleted successfully",
                "contest_id": str(contest.id),
                "problem_index": problem_index
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TutorialBulkUpdateAPIView(APIView):
    def post(self, request, contest_id):
        """Update tutorials for multiple problems at once"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is creator
        is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
        if not is_creator:
            return Response({"error": "Permission denied. Only contest creator can manage tutorials."}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Expecting data in format: { "A": "tutorial content", "B": "tutorial content" }
        tutorials_data = request.data
        
        if not isinstance(tutorials_data, dict):
            return Response({"error": "Invalid data format. Expected object with problem indices as keys."}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        errors = []
        
        for problem_index, content in tutorials_data.items():
            # Validate problem exists
            problem_exists = False
            for problem in contest.problems:
                if problem.index == problem_index.upper():
                    problem_exists = True
                    break
            
            if not problem_exists:
                errors.append(f"Problem {problem_index} not found in contest")
                continue
            
            # Update or create tutorial
            tutorial = Tutorial.objects(
                contest=contest, 
                problem_index=problem_index.upper()
            ).first()
            
            if tutorial:
                tutorial.content = content
                tutorial.version += 1
                action = "updated"
            else:
                tutorial = Tutorial(
                    contest=contest,
                    problem_index=problem_index.upper(),
                    content=content,
                    created_by=user
                )
                action = "created"
            
            try:
                tutorial.save()
                
                # Update ContestProblem tutorial field
                for problem in contest.problems:
                    if problem.index == problem_index.upper():
                        problem.tutorial = content
                        break
                
                results.append({
                    "problem_index": problem_index,
                    "action": action,
                    "tutorial_id": str(tutorial.id),
                    "version": tutorial.version
                })
                
            except Exception as e:
                errors.append(f"Failed to save tutorial for problem {problem_index}: {str(e)}")
        
        # Save contest with updated tutorial fields
        try:
            contest.save()
        except Exception as e:
            errors.append(f"Failed to update contest: {str(e)}")
        
        response_data = {
            "results": results,
            "errors": errors,
            "total_processed": len(results),
            "total_errors": len(errors)
        }
        
        status_code = status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS
        return Response(response_data, status=status_code)