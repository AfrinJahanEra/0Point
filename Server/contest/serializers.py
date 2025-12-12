# contest/serializers.py
from rest_framework import serializers
from .models import Contest, ContestProblem, TestCase

class TestCaseSerializer(serializers.Serializer):
    input = serializers.CharField()
    output = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sample = serializers.BooleanField(default=False)

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
    tutorial = serializers.CharField(required=False, allow_blank=True, default="")  # Add this
    test_cases = TestCaseSerializer(many=True)

class ContestCreateSerializer(serializers.Serializer):
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    start_time = serializers.DateTimeField(required=False, allow_null=True)
    duration = serializers.FloatField(required=False, allow_null=True)
    type = serializers.CharField(required=False, allow_blank=True)
    platform = serializers.CharField(required=False, allow_blank=True)
    problems = ContestProblemSerializer(many=True, required=False)
    status = serializers.CharField(required=False, default="draft")
    # Add these for test contests
    testers = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    test_start_time = serializers.DateTimeField(required=False, allow_null=True)
    test_duration = serializers.FloatField(required=False, allow_null=True)

    def create(self, validated_data):
        problems_data = validated_data.pop("problems", [])
        status = validated_data.pop("status", "draft")
        testers = validated_data.pop("testers", [])
        test_start_time = validated_data.pop("test_start_time", None)
        test_duration = validated_data.pop("test_duration", None)
        
        contest = Contest(**validated_data)
        contest.status = status
        contest.testers = testers
        contest.test_start_time = test_start_time
        if test_duration:
            contest.test_duration = test_duration

        for problem_data in problems_data:
            test_cases_data = problem_data.pop("test_cases", [])
            testcases = [TestCase(**tc) for tc in test_cases_data]

            problem = ContestProblem(
                **problem_data,
                test_cases=testcases
            )
            contest.problems.append(problem)

        return contest