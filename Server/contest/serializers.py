# apps/contest/serializers.py
from rest_framework import serializers
from datetime import datetime, timedelta
from mongoengine import errors as me_errors
from .models import Contest, ContestProblem, ContestRegistration
from account.models import Account


class ContestCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    start_time = serializers.DateTimeField()
    duration = serializers.FloatField()  # hours (you can accept hours and convert to minutes)
    type = serializers.ChoiceField(choices=("individual", "team"), default="individual")
    platform = serializers.ChoiceField(choices=("cf","atcoder","codechef","hackerrank","leetcode","default"), default="default")

    def validate_title(self, value):
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_duration(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be positive.")
        return value

    def create(self, validated_data):
        # Convert duration hours -> minutes
        duration_minutes = int(validated_data["duration"] * 60)

        contest = Contest(
            title=validated_data["title"],
            description=validated_data.get("description", "")[:1000],
            start_time=validated_data["start_time"],
            duration=duration_minutes,
            type=validated_data["type"],
            platform=validated_data["platform"],
            # created_by must be injected by view
        )
        return contest


class ContestRegistrationSerializer(serializers.Serializer):
    # For individual: nothing else required (current user implied)
    # For team: require team_id (string)
    team_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate(self, data):
        # nothing complicated here; view will check contest type
        return data

class ContestUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_time = serializers.DateTimeField(required=False)
    duration = serializers.FloatField(required=False)
    type = serializers.ChoiceField(choices=("individual", "team"), required=False)
    platform = serializers.ChoiceField(
        choices=("cf","atcoder","codechef","hackerrank","leetcode","default"),
        required=False
    )
    is_live_now = serializers.BooleanField(required=False)

    def validate_title(self, value):
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_duration(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be positive.")
        return value
