from rest_framework import serializers

class LeaderboardSerializer(serializers.Serializer):
  username = serializers.CharField()
  total_points = serializers.IntegerField()
  department = serializers.CharField()
  contests_participated = serializers.IntegerField()
  rank = serializers.IntegerField()
