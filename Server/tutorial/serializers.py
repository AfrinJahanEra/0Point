# tutorial/serializers.py (create this file)
from rest_framework import serializers
from .models import Tutorial

class TutorialSerializer(serializers.Serializer):
    contest_id = serializers.CharField(required=True)
    problem_index = serializers.CharField(required=True)
    content = serializers.CharField(required=True)
    
    def validate(self, data):
        # Additional validation can be added here
        return data

class TutorialResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    contest_id = serializers.CharField()
    problem_index = serializers.CharField()
    content = serializers.CharField()
    created_by = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    version = serializers.IntegerField()