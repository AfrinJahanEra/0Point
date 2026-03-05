# contribution/serializers.py
from rest_framework import serializers

class ContributionRankingSerializer(serializers.Serializer):
    name = serializers.CharField()
    total_contributions = serializers.IntegerField()
    blogs = serializers.IntegerField()
    contests = serializers.IntegerField()
    rank = serializers.IntegerField()
    