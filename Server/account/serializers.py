from rest_framework import serializers


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField()
    role = serializers.CharField(default="user")
    year = serializers.CharField(required=False)
    department = serializers.CharField(required=False)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class PlatformProfileSerializer(serializers.Serializer):
    """Serializer for coding platform profiles"""
    platform = serializers.CharField()
    handle = serializers.CharField()
    current_rating = serializers.IntegerField()
    max_rating = serializers.IntegerField()
    min_rating = serializers.IntegerField()
    contests_count = serializers.IntegerField()
    rank = serializers.CharField(required=False, allow_null=True)
    badge = serializers.CharField(required=False, allow_null=True)
    last_updated = serializers.DateTimeField()
    rating_history = serializers.ListField(child=serializers.DictField())


class AddPlatformSerializer(serializers.Serializer):
    """Serializer for adding/updating a platform profile"""
    platform = serializers.ChoiceField(choices=['codeforces', 'codechef', 'atcoder', 'leetcode'])
    handle = serializers.CharField(max_length=100)


class UserProfileSerializer(serializers.Serializer):
    """Serializer for user profile"""
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    department = serializers.CharField(allow_null=True)
    year = serializers.CharField(allow_null=True)
    total_score = serializers.IntegerField()
    global_rank = serializers.IntegerField(allow_null=True)
    problems_solved = serializers.IntegerField()
    contests_count = serializers.IntegerField()
    rating = serializers.IntegerField()
    badge = serializers.CharField()
    platform_profiles = PlatformProfileSerializer(many=True)
    created_at = serializers.DateTimeField()