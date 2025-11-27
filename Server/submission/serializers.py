from rest_framework import serializers

class SubmissionCreateSerializer(serializers.Serializer):
    problem_id = serializers.CharField()
    language = serializers.CharField(max_length=40)
    code = serializers.CharField()

class SubmissionVerdictUpdateSerializer(serializers.Serializer):
    verdict = serializers.CharField()
    runtime_ms = serializers.IntegerField(required=False)
    memory_kb = serializers.IntegerField(required=False)
    testcases_passed = serializers.IntegerField(required=False)
    total_testcases = serializers.IntegerField(required=False)
