# testcontest/serializers.py
from rest_framework import serializers
from .models import TestContest, TestContestRegistration
from contest.models import ContestProblem, TestCase

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

class TestContestRegistrationSerializer(serializers.Serializer):
    """Serializer for test contest registration"""
    contest_id = serializers.CharField(required=True)
    user_id = serializers.CharField(required=True)

    