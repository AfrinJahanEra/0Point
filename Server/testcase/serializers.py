# testcase/serializers.py
from rest_framework import serializers

class TestcaseCreateSerializer(serializers.Serializer):
    problem_id = serializers.CharField()
    sample = serializers.BooleanField(default=False)
    input_data = serializers.CharField()
    output_data = serializers.CharField()
    explanation = serializers.CharField(required=False, default="")  # Added explanation
    time_limit_override = serializers.IntegerField(required=False)
    memory_limit_override = serializers.IntegerField(required=False)


class TestcaseUpdateSerializer(serializers.Serializer):
    sample = serializers.BooleanField(required=False)
    input_data = serializers.CharField(required=False)
    output_data = serializers.CharField(required=False)
    explanation = serializers.CharField(required=False)  # Added explanation
    time_limit_override = serializers.IntegerField(required=False)
    memory_limit_override = serializers.IntegerField(required=False)