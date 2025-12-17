# clarification/serializers.py
from rest_framework import serializers
from .models import Clarification


class ClarificationCreateSerializer(serializers.Serializer):
    """Serializer for creating a clarification question"""
    title = serializers.CharField(max_length=200, min_length=5)
    content = serializers.CharField(min_length=10)
    problem_index = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        default=list,
        max_length=3
    )
    
    def validate_problem_index(self, value):
        """Validate problem index"""
        if value and value.strip():
            return value.strip().upper()
        return None
    
    def validate_tags(self, value):
        """Validate tags"""
        if len(value) > 3:
            raise serializers.ValidationError("Maximum 3 tags allowed")
        return [tag.strip() for tag in value if tag.strip()]


class ClarificationUpdateSerializer(serializers.Serializer):
    """Serializer for updating a clarification (author only before approval)"""
    title = serializers.CharField(max_length=200, min_length=5, required=False)
    content = serializers.CharField(min_length=10, required=False)


class ClarificationReplySerializer(serializers.Serializer):
    """Serializer for organizer's reply"""
    content = serializers.CharField(min_length=1, max_length=5000)


class ClarificationStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating clarification status (organizers only)"""
    status = serializers.ChoiceField(
        choices=['pending', 'approved', 'rejected', 'answered']
    )
    reason = serializers.CharField(
        required=False, 
        allow_blank=True,
        max_length=500,
        help_text="Reason for rejection or additional notes"
    )
    
    def validate(self, data):
        """Validate status transitions"""
        status = data.get('status')
        reason = data.get('reason', '')
        
        # If rejecting, require a reason
        if status == 'rejected' and not reason.strip():
            raise serializers.ValidationError({
                "reason": "Reason is required when rejecting a clarification"
            })
        
        return data


class ClarificationFilterSerializer(serializers.Serializer):
    """Serializer for filtering clarifications"""
    problem = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=['all', 'pending', 'approved', 'rejected', 'answered', 'published', 'unanswered'],
        default='all'
    )
    search = serializers.CharField(required=False, allow_blank=True)
    sort = serializers.ChoiceField(
        choices=['recent', 'popular', 'unanswered'],
        default='recent'
    )
    page = serializers.IntegerField(min_value=1, default=1)
    per_page = serializers.IntegerField(min_value=1, max_value=100, default=20)
    show_my_questions = serializers.BooleanField(default=False)