# discussion/serializers.py
from rest_framework import serializers
from .models import Discussion, Comment

class DiscussionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    content = serializers.CharField(required=False)
    problem_index = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

# discussion/serializers.py - Updated
from rest_framework import serializers
from .models import Discussion, Comment

class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, min_length=1, max_length=1000)
    parent_comment_id = serializers.CharField(
        required=False, 
        allow_null=True, 
        allow_blank=True
    )
    
    def validate_parent_comment_id(self, value):
        """Validate parent comment ID"""
        if value and not value.strip():
            return None
        return value

class CommentUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, min_length=1, max_length=1000)

class DiscussionCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, min_length=5)
    content = serializers.CharField(min_length=10)
    problem_index = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        default=list,
        max_length=5
    )
    
    def validate_tags(self, value):
        """Validate tags"""
        if len(value) > 5:
            raise serializers.ValidationError("Maximum 5 tags allowed")
        return [tag.strip() for tag in value if tag.strip()]