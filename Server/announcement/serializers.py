# announcement/serializers.py
from rest_framework import serializers

class AnnouncementCreateSerializer(serializers.Serializer):
    contest_id = serializers.CharField(required=False, allow_blank=True)
    text = serializers.CharField(required=True, max_length=5000)
    topic = serializers.CharField(required=False, allow_blank=True, max_length=200)
    problem_index = serializers.CharField(required=False, allow_blank=True, max_length=10)
    is_important = serializers.BooleanField(required=False, default=False)
    is_pinned = serializers.BooleanField(required=False, default=False)
    type = serializers.ChoiceField(
        choices=["info", "warning", "important", "update"],
        required=False,
        default="info"
    )


class AnnouncementUpdateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, max_length=5000)
    problem_index = serializers.CharField(required=False, allow_blank=True, max_length=10)
    is_important = serializers.BooleanField(required=False)
    is_pinned = serializers.BooleanField(required=False)
    type = serializers.ChoiceField(
        choices=["info", "warning", "important", "update"],
        required=False
    )