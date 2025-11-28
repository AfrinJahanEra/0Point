from rest_framework import serializers

class AnnouncementCreateSerializer(serializers.Serializer):
    contest_id = serializers.CharField()
    text = serializers.CharField()
    problem_index = serializers.CharField(required=False)
    is_important = serializers.BooleanField(required=False)
    visible_to = serializers.CharField(required=False)
    type = serializers.CharField(required=False)


class AnnouncementUpdateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False)
    problem_index = serializers.CharField(required=False)
    is_important = serializers.BooleanField(required=False)
    visible_to = serializers.CharField(required=False)
    type = serializers.CharField(required=False)
