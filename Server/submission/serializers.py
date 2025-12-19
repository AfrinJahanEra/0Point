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
        
        # FIXED: Check contest timing with proper timezone handling
        # Alternative: Convert all times to UTC for comparison
        if contest.start_time and contest.duration:
            # Get current time in UTC
            current_time_utc = datetime.now(pytz.UTC)
            
            # Ensure start_time is in UTC
            if contest.start_time.tzinfo is None:
                # If naive, assume it's Asia/Dhaka and convert to UTC
                dhaka_tz = pytz.timezone('Asia/Dhaka')
                start_time_dhaka = dhaka_tz.localize(contest.start_time)
                start_time_utc = start_time_dhaka.astimezone(pytz.UTC)
            else:
                # Already has timezone, convert to UTC
                start_time_utc = contest.start_time.astimezone(pytz.UTC)
            
            # Calculate end time in UTC
            duration_minutes = contest.duration * 60
            end_time_utc = start_time_utc + timedelta(minutes=duration_minutes)
            
            # Debug logging
            print(f"DEBUG TIMING CHECK (UTC):")
            print(f"  Current time (UTC): {current_time_utc}")
            print(f"  Contest start time (UTC): {start_time_utc}")
            print(f"  Contest end time (UTC): {end_time_utc}")
            
            if current_time_utc < start_time_utc:
                raise serializers.ValidationError("Contest has not started yet")
            if current_time_utc > end_time_utc:
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
                end_time = contest.start_time + timedelta(minutes=contest.duration * 60)
                if datetime.utcnow() > end_time:
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