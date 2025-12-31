# testcontest/serializers.py
from rest_framework import serializers
from .models import TestContest
from datetime import timedelta
from contest.models import ContestProblem, TestCase
from contest.utils.auth import get_user_from_request

class TestContestCreateSerializer(serializers.Serializer):
    """Serializer for creating test contest from draft"""
    
    test_start_time = serializers.DateTimeField(required=True)
    testers = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )
    duration = serializers.FloatField(required=False, allow_null=True)
    
    def validate(self, data):
        """Validate test contest data"""
        if not data.get('testers'):
            raise serializers.ValidationError("Test contest requires at least one tester")
        
        # Validate testers are valid emails
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        for email in data['testers']:
            if not re.match(email_regex, email):
                raise serializers.ValidationError(f"Invalid email format: {email}")
        
        return data

class TestContestSerializer(serializers.Serializer):
    """Serializer for test contest data"""
    
    id = serializers.CharField(read_only=True)
    original_contest_id = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    test_start_time = serializers.DateTimeField()
    start_time = serializers.DateTimeField()
    duration = serializers.FloatField()
    type = serializers.CharField()
    platform = serializers.CharField()
    testers = serializers.ListField(child=serializers.CharField())
    status = serializers.CharField()
    created_by = serializers.CharField(required=False)
    created_at = serializers.DateTimeField(read_only=True)
    is_test_contest = serializers.BooleanField(default=True, read_only=True)
    
    # Contest settings
    registration_required = serializers.BooleanField(default=True)
    email_notifications = serializers.BooleanField(default=True)
    leaderboard_public = serializers.BooleanField(default=True)
    allow_practice = serializers.BooleanField(default=True)
    rating_changes = serializers.BooleanField(default=True)
    editorial_published = serializers.BooleanField(default=False)

# class TestContestRegistrationSerializer(serializers.Serializer):
#     """Serializer for test contest registration"""
#     contest_id = serializers.CharField(required=True)
#     user_id = serializers.CharField(required=True)

# testcontest/serializers.py - Add these classes

class TestContestSubmissionCreateSerializer(serializers.Serializer):
    """Serializer for creating test contest submissions"""
    
    test_contest_id = serializers.CharField(required=True)
    problem_index = serializers.CharField(max_length=10, required=True)
    code = serializers.CharField(required=True)
    language = serializers.ChoiceField(
        choices=['python', 'cpp', 'java', 'javascript', 'c'],
        required=True
    )
    # Optional fields for direct execution
    input_data = serializers.CharField(required=False, allow_blank=True)
    expected_output = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate test contest submission data"""
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            raise serializers.ValidationError("Authentication required")
        
        # Check test contest exists
        try:
            test_contest = TestContest.objects.get(id=data['test_contest_id'])
        except TestContest.DoesNotExist:
            raise serializers.ValidationError("Test contest not found")
        
        # Check if user is authorized (tester or creator)
        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            raise serializers.ValidationError("You are not authorized to submit in this test contest")
        
        # Check test contest status
        from .views import get_test_contest_status
        current_status = get_test_contest_status(test_contest)
        
        if current_status not in ["live"]:
            raise serializers.ValidationError(f"Test contest is not live (current status: {current_status})")
        
        # Check if user is registered
        # registration = TestContestRegistration.objects.filter(
        #     user=user, contest=test_contest
        # ).first()
        # if not registration:
        #     raise serializers.ValidationError("You are not registered for this test contest")
        
        # Check if problem exists
        problem_exists = False
        for problem in test_contest.problems:
            if problem.index == data['problem_index'].upper():
                problem_exists = True
                data['problem_title'] = problem.title
                data['problem_code'] = problem.index
                break
        
        if not problem_exists:
            raise serializers.ValidationError("Problem not found in test contest")
        
        # Check test contest timing
        from datetime import datetime
        if test_contest.test_start_time and test_contest.duration:
            current_time = datetime.now()
            start_time = test_contest.test_start_time
            duration_minutes = test_contest.duration * 60
            end_time = start_time + timedelta(minutes=duration_minutes)
            
            if current_time < start_time:
                raise serializers.ValidationError("Test contest has not started yet")
            
            if current_time > end_time:
                raise serializers.ValidationError("Test contest has ended")
        
        data['user'] = user
        data['test_contest'] = test_contest
        
        return data


class TestContestSubmissionSerializer(serializers.Serializer):
    """Serializer for test contest submission responses"""
    
    id = serializers.CharField()
    test_contest_id = serializers.CharField()
    user_id = serializers.CharField()
    user_name = serializers.CharField()
    user_email = serializers.CharField()
    problem_index = serializers.CharField()
    problem_code = serializers.CharField()
    problem_title = serializers.CharField()
    code = serializers.CharField()
    language = serializers.CharField()
    verdict = serializers.CharField()
    execution_time = serializers.IntegerField()
    memory = serializers.IntegerField()
    passed_test_cases = serializers.IntegerField()
    total_test_cases = serializers.IntegerField()
    failed_test_case = serializers.IntegerField()
    error_message = serializers.CharField(allow_null=True)
    compile_output = serializers.CharField(allow_null=True)
    submitted_at = serializers.DateTimeField()
    judged_at = serializers.DateTimeField(allow_null=True)
    test_contest_time = serializers.FloatField()
    is_test_contest = serializers.BooleanField()
    
    # Additional context
    can_view_code = serializers.SerializerMethodField()
    
    def get_can_view_code(self, obj):
        """Check if current user can view this submission's code"""
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            return False
        
        # Users can view their own code
        return obj['user_id'] == str(user.id)
        
