from rest_framework import serializers

class TutorialCreateSerializer(serializers.Serializer):
    problem_id = serializers.CharField()
    statement = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    difficulty_explanation = serializers.CharField(required=False)
    video_url = serializers.CharField(required=False)
    is_official = serializers.BooleanField(required=False)


class TutorialUpdateSerializer(serializers.Serializer):
    statement = serializers.CharField(required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    difficulty_explanation = serializers.CharField(required=False)
    video_url = serializers.CharField(required=False)
    is_official = serializers.BooleanField(required=False)
