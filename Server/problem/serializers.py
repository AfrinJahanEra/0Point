from rest_framework import serializers

class ProblemCreateSerializer(serializers.Serializer):
    contest_id = serializers.CharField()
    index = serializers.CharField(max_length=5)
    title = serializers.CharField(max_length=250)
    statement = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    time_limit_seconds = serializers.FloatField(default=2.0)
    memory_limit_mb = serializers.IntegerField(default=256)
    difficulty = serializers.IntegerField(default=800)

    # images will be handled separately via multipart uploads (request.FILES)
    def validate_index(self, value):
        if not value.strip():
            raise serializers.ValidationError("Index (A/B/C) cannot be empty")
        return value.strip().upper()

    def validate_time_limit_seconds(self, value):
        if value <= 0:
            raise serializers.ValidationError("time_limit_seconds must be > 0")
        return value

    def validate_memory_limit_mb(self, value):
        if value <= 0:
            raise serializers.ValidationError("memory_limit_mb must be > 0")
        return value


class ProblemUpdateSerializer(serializers.Serializer):
    # Partial update fields
    title = serializers.CharField(max_length=250, required=False)
    statement = serializers.CharField(required=False)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    time_limit_seconds = serializers.FloatField(required=False)
    memory_limit_mb = serializers.IntegerField(required=False)
    difficulty = serializers.IntegerField(required=False)
