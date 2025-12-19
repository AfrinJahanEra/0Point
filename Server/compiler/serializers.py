from rest_framework import serializers

class CodeSubmissionSerializer(serializers.Serializer):
    language = serializers.CharField(max_length=50)
    version_index = serializers.CharField(max_length=10, default="0")
    code = serializers.CharField()
    input_data = serializers.CharField(allow_blank=True, required=False)
    expected_output = serializers.CharField(allow_blank=True, required=False)
