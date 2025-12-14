# discussion/serializers.py
from rest_framework import serializers
from .models import Discussion, Comment

class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True)
    parent_comment_id = serializers.CharField(required=False, allow_null=True)

class DiscussionCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    problem_index = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )

class DiscussionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    content = serializers.CharField(required=False)
    problem_index = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

class CommentUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True)