# contest/serializers.py
from rest_framework import serializers
from .models import Contest, ContestProblem, TestCase, TestContest

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
    
class TestContestCreateSerializer(serializers.Serializer):    
    # Test contest specific fields
    test_start_time = serializers.DateTimeField(required=True)
    testers = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )
    
    # Optional: Override some contest settings for test
    duration = serializers.FloatField(required=False, allow_null=True)
    visibility = serializers.CharField(required=False, default="test")
    
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
    
    def create_test_contest(self, original_contest, validated_data):
        """Create a test contest copy from original contest"""
        
        # Create a deep copy of problems (to avoid reference issues)
        problems_copy = []
        for problem in original_contest.problems:
            # Create new test cases list
            test_cases_copy = []
            for tc in problem.test_cases:
                test_cases_copy.append(TestCase(
                    input=tc.input,
                    output=tc.output,
                    explanation=tc.explanation,
                    difficulty=tc.difficulty,
                    sample=tc.sample,
                    hidden=tc.hidden
                ))
            
            # Create problem copy
            problem_copy = ContestProblem(
                index=problem.index,
                title=problem.title,
                statement=problem.statement,
                time_limit_seconds=problem.time_limit_seconds,
                memory_limit_mb=problem.memory_limit_mb,
                tags=problem.tags.copy() if problem.tags else [],
                difficulty=problem.difficulty,
                tutorial=problem.tutorial,
                points=problem.points,
                test_cases=test_cases_copy
            )
            problems_copy.append(problem_copy)
        
        # Create test contest
        test_contest = TestContest(
            original_contest=original_contest,
            title=original_contest.title,
            description=original_contest.description,
            start_time=validated_data['test_start_time'],
            duration=validated_data.get('duration', original_contest.duration),
            type=original_contest.type,
            platform=original_contest.platform,
            testers=validated_data['testers'],
            problems=problems_copy,
            created_by=original_contest.created_by,
            test_start_time=validated_data['test_start_time'],
            # Copy contest settings
            registration_required=original_contest.registration_required,
            email_notifications=original_contest.email_notifications,
            leaderboard_public=original_contest.leaderboard_public,
            allow_practice=original_contest.allow_practice,
            rating_changes=original_contest.rating_changes,
            editorial_published=original_contest.editorial_published
        )
        
        return test_contest

