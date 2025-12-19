# contest/serializers.py
from rest_framework import serializers
from .models import Contest, ContestProblem, TestCase

class TestCaseSerializer(serializers.Serializer):
    input = serializers.CharField()
    output = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sample = serializers.BooleanField(default=False)
    hidden = serializers.BooleanField(default=False)  # NEW: Add hidden field

class ContestProblemSerializer(serializers.Serializer):
    index = serializers.CharField()
    title = serializers.CharField()
    statement = serializers.CharField()
    time_limit_seconds = serializers.FloatField()
    memory_limit_mb = serializers.IntegerField()
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True
    )
    difficulty = serializers.CharField(required=False, allow_blank=True)
    tutorial = serializers.CharField(required=False, allow_blank=True, default="")
    points = serializers.IntegerField(default=0)  # NEW: Add points field
    test_cases = TestCaseSerializer(many=True)

class ContestCreateSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    start_time = serializers.DateTimeField(required=False, allow_null=True)
    duration = serializers.FloatField(required=False, allow_null=True)
    type = serializers.CharField(required=False, allow_blank=True)
    platform = serializers.CharField(required=False, allow_blank=True)
    problems = ContestProblemSerializer(many=True, required=False)
    
    # NEW: Add status field back
    status = serializers.CharField(required=False, default="draft")
    
    # NEW: Contest settings fields
    visibility = serializers.CharField(required=False, default="public")
    registration_required = serializers.BooleanField(required=False, default=True)
    email_notifications = serializers.BooleanField(required=False, default=True)
    leaderboard_public = serializers.BooleanField(required=False, default=True)
    allow_practice = serializers.BooleanField(required=False, default=True)
    rating_changes = serializers.BooleanField(required=False, default=True)
    editorial_published = serializers.BooleanField(required=False, default=False)
    
    # Test contest fields
    testers = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    test_start_time = serializers.DateTimeField(required=False, allow_null=True)

    def create(self, validated_data):
        problems_data = validated_data.pop("problems", [])
        status = validated_data.pop("status", "draft")
        testers = validated_data.pop("testers", [])
        test_start_time = validated_data.pop("test_start_time", None)
        
        # NEW: Extract contest settings
        visibility = validated_data.pop("visibility", "public")
        registration_required = validated_data.pop("registration_required", True)
        email_notifications = validated_data.pop("email_notifications", True)
        leaderboard_public = validated_data.pop("leaderboard_public", True)
        allow_practice = validated_data.pop("allow_practice", True)
        rating_changes = validated_data.pop("rating_changes", True)
        editorial_published = validated_data.pop("editorial_published", False)
        
        contest = Contest(**validated_data)
        contest.status = status
        contest.testers = testers
        contest.test_start_time = test_start_time
        
        # NEW: Set contest settings
        contest.visibility = visibility
        contest.registration_required = registration_required
        contest.email_notifications = email_notifications
        contest.leaderboard_public = leaderboard_public
        contest.allow_practice = allow_practice
        contest.rating_changes = rating_changes
        contest.editorial_published = editorial_published

        for problem_data in problems_data:
            pdata = problem_data.copy()
            test_cases_data = pdata.pop("test_cases", [])
            testcases = [TestCase(**tc) for tc in test_cases_data]

            problem = ContestProblem(
                **pdata,
                test_cases=testcases
            )
            contest.problems.append(problem)

        return contest
    

    