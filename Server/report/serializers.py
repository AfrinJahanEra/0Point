from rest_framework import serializers

class BlogReportSerializer(serializers.Serializer):
    blog_id = serializers.CharField(required=True)
    reason = serializers.CharField(required=True, max_length=500)

class ReviewReportSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=500)
