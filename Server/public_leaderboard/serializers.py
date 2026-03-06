# leaderboard/serializers.py

from rest_framework import serializers

class LeaderboardSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    username = serializers.CharField()
    total_points = serializers.IntegerField()
    department = serializers.CharField()
    contests_participated = serializers.IntegerField()
    rank = serializers.IntegerField()


class LeaderboardMinimalSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    username = serializers.CharField()
    total_points = serializers.IntegerField()
    rank = serializers.IntegerField()


