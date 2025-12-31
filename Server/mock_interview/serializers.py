from rest_framework import serializers
from .models import InterviewSession, Participant

class InterviewSessionSerializer(serializers.ModelSerializer):
    interviewer_link = serializers.SerializerMethodField()
    candidate_link = serializers.SerializerMethodField()
    participants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InterviewSession
        fields = [
            'id', 'title', 'description', 'scheduled_time',
            'duration_minutes', 'created_at', 'interviewer_link',
            'candidate_link', 'participants_count', 'is_active'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_interviewer_link(self, obj):
        request = self.context.get('request')
        base_url = request.build_absolute_uri('/') if request else 'http://localhost:5173/'
        return f"{base_url}interview-room?session-id={obj.id}&role=interviewer"
    
    def get_candidate_link(self, obj):
        request = self.context.get('request')
        base_url = request.build_absolute_uri('/') if request else 'http://localhost:5173/'
        return f"{base_url}interview-room?session-id={obj.id}&role=candidate"
    
    def get_participants_count(self, obj):
        return obj.participants.filter(is_active=True).count()

class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'session', 'email', 'role', 'joined_at', 'is_active']

class CreateInterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = ['title', 'description', 'scheduled_time', 'duration_minutes']

class InvitationSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    interviewer_email = serializers.EmailField()
    candidate_email = serializers.EmailField()
    subject = serializers.CharField(max_length=200, default="Interview Invitation")
    message = serializers.CharField(required=False)

class JoinSessionSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['interviewer', 'candidate'])