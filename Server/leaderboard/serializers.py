from rest_framework import serializers

class FreezeSerializer(serializers.Serializer):
    is_frozen = serializers.BooleanField()

class RecalculateSerializer(serializers.Serializer):
    apply_freeze = serializers.BooleanField(default=False)
