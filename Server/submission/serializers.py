# submission/serializers.py
from rest_framework import serializers
from .models import Submission
from contest.models import Contest, ContestRegistration
from contest.utils.auth import get_user_from_request
from datetime import datetime, timedelta

# submission/serializers.py
from rest_framework import serializers
from datetime import datetime, timedelta
from contest.models import Contest, ContestRegistration
from contest.utils.auth import get_user_from_request
import pytz

class SubmissionCreateSerializer(serializers.Serializer):
    """Serializer for creating a new submission"""
    
    problem_index = serializers.CharField(max_length=10, required=True)
    code = serializers.CharField(required=True)
    language = serializers.ChoiceField(
        choices=['python', 'cpp', 'java', 'javascript', 'c'],
        required=True
    )
    contest_id = serializers.CharField(required=True)
    
    def validate(self, data):
        """Validate submission data"""
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            raise serializers.ValidationError("Authentication required")
        
        # Check contest exists
        try:
            contest = Contest.objects.get(id=data['contest_id'])
        except Contest.DoesNotExist:
            raise serializers.ValidationError("Contest not found")
        
        # Check if contest is live
        if contest.status != "live":
            raise serializers.ValidationError("Contest is not live")
        
        # Check if user is registered
        registration = ContestRegistration.objects.filter(
            user=user, contest=contest
        ).first()
        if not registration:
            raise serializers.ValidationError("You are not registered for this contest")
        
        # Check if problem exists
        problem_exists = False
        for problem in contest.problems:
            if problem.index == data['problem_index'].upper():
                problem_exists = True
                data['problem_title'] = problem.title
                data['problem_code'] = problem.index
                break
        
        if not problem_exists:
            raise serializers.ValidationError("Problem not found in contest")
        
        # FIXED: Check contest timing with Asia/Dhaka timezone
        if contest.start_time and contest.duration:
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            
            # Get current time in Asia/Dhaka
            current_time_dhaka = datetime.now(dhaka_tz)
            
            # Ensure contest.start_time is in Asia/Dhaka timezone
            if contest.start_time.tzinfo is None:
                # If naive, assume it's Asia/Dhaka
                start_time_dhaka = dhaka_tz.localize(contest.start_time)
            else:
                # Already has timezone, convert to Dhaka
                start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
            
            # Calculate end time in Asia/Dhaka
            duration_minutes = contest.duration * 60
            end_time_dhaka = start_time_dhaka + timedelta(minutes=duration_minutes)
            
            # Debug logging
            print(f"DEBUG TIMING CHECK (Asia/Dhaka):")
            print(f"  Current time (Dhaka): {current_time_dhaka}")
            print(f"  Contest start time (Dhaka): {start_time_dhaka}")
            print(f"  Contest end time (Dhaka): {end_time_dhaka}")
            
            # Check if contest has started
            if current_time_dhaka < start_time_dhaka:
                raise serializers.ValidationError("Contest has not started yet")
            
            # Check if contest has ended
            if current_time_dhaka > end_time_dhaka:
                raise serializers.ValidationError("Contest has ended")
        
        data['user'] = user
        data['contest'] = contest
        
        return data

class SubmissionSerializer(serializers.Serializer):
    """Serializer for submission responses"""
    
    id = serializers.CharField()
    contest_id = serializers.CharField()
    problem_index = serializers.CharField()
    problem_code = serializers.CharField()
    problem_title = serializers.CharField()
    user = serializers.CharField()
    user_name = serializers.CharField()
    user_email = serializers.CharField()
    code = serializers.CharField()
    language = serializers.CharField()
    verdict = serializers.CharField()
    execution_time = serializers.IntegerField()
    memory = serializers.IntegerField()
    submitted_at = serializers.DateTimeField()
    judged_at = serializers.DateTimeField(allow_null=True)
    contest_time = serializers.FloatField()
    is_public = serializers.BooleanField()
    time = serializers.DateTimeField()  # Alias for submitted_at
    
    # Additional fields for frontend
    can_view_code = serializers.SerializerMethodField()
    is_current_user = serializers.SerializerMethodField()
    
    def get_can_view_code(self, obj):
        """Check if current user can view this submission's code"""
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            return False
        
        # Always allow users to view their own submissions
        if obj['user'] == str(user.id):
            return True
        
        # Check if contest has ended
        try:
            contest = Contest.objects.get(id=obj['contest_id'])
            
            if contest.status == "past":
                return True
            
            # For live contests, only show verdict unless contest ended
            if contest.start_time and contest.duration:
                # FIXED: Use Asia/Dhaka timezone
                dhaka_tz = pytz.timezone('Asia/Dhaka')
                current_time_dhaka = datetime.now(dhaka_tz)
                
                if contest.start_time.tzinfo is None:
                    start_time_dhaka = dhaka_tz.localize(contest.start_time)
                else:
                    start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
                
                end_time_dhaka = start_time_dhaka + timedelta(minutes=contest.duration * 60)
                
                if current_time_dhaka > end_time_dhaka:
                    return True
                    
        except Contest.DoesNotExist:
            pass
        
        return False
    
    def get_is_current_user(self, obj):
        """Check if submission belongs to current user"""
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            return False
        
        return obj['user'] == str(user.id)
    

    