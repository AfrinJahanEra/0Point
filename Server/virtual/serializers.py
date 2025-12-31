# virtual/serializers.py
from rest_framework import serializers
from contest.models import Contest
from account.models import Account
from contest.utils.auth import get_user_from_request
from django.core.exceptions import ObjectDoesNotExist

class VirtualContestStartSerializer(serializers.Serializer):
    contest_id = serializers.CharField(required=True)
    start_time = serializers.DateTimeField(required=False)
    
    def validate(self, data):
        request = self.context.get('request')
        user = get_user_from_request(request)
        
        if not user:
            raise serializers.ValidationError("Authentication required")
        
        # Check if contest exists and is past
        try:
            contest = Contest.objects.get(id=data['contest_id'])
        except Contest.DoesNotExist:
            raise serializers.ValidationError("Contest not found")
        
        # Only allow virtual contests for past contests
        from contest.views import get_contest_status
        if get_contest_status(contest) != "past":
            raise serializers.ValidationError("Virtual contests can only be started for past contests")
        
        data['user'] = user
        data['contest'] = contest
        return data

class VirtualContestSerializer(serializers.Serializer):
    id = serializers.CharField()
    original_contest_id = serializers.CharField(source='original_contest.id')
    contest_title = serializers.CharField(source='original_contest.title')
    user_id = serializers.CharField(source='user.id')
    user_name = serializers.CharField(source='user.name')
    
    virtual_start_time = serializers.DateTimeField()
    virtual_end_time = serializers.DateTimeField()
    
    status = serializers.CharField()
    is_completed = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    
    progress = serializers.SerializerMethodField()
    
    def get_progress(self, obj):
        return obj.user_progress
    
    