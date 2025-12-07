# problem/serializers.py
from rest_framework import serializers

class ProblemCreateSerializer(serializers.Serializer):
    contest_id = serializers.CharField()
    index = serializers.CharField(max_length=5)
    title = serializers.CharField(max_length=250)
    statement = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=list)
    
    # Accept both field names
    time_limit_seconds = serializers.FloatField(default=2.0)
    time_limit = serializers.FloatField(required=False)  # Accept frontend field name
    
    memory_limit_mb = serializers.IntegerField(default=256)
    memory_limit = serializers.IntegerField(required=False)  # Accept frontend field name
    
    difficulty = serializers.CharField(default="Medium")
    test_cases = serializers.ListField(required=False, default=list)

    def validate(self, data):
        # If frontend sends time_limit, map it to time_limit_seconds
        if 'time_limit' in data and 'time_limit_seconds' not in data:
            data['time_limit_seconds'] = data['time_limit']
        
        # If frontend sends memory_limit, map it to memory_limit_mb
        if 'memory_limit' in data and 'memory_limit_mb' not in data:
            data['memory_limit_mb'] = data['memory_limit']
        
        return data
    
    # ... rest of validators ...

class ProblemUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=250, required=False)
    statement = serializers.CharField(required=False)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    time_limit = serializers.FloatField(required=False)
    memory_limit = serializers.IntegerField(required=False)
    difficulty = serializers.CharField(required=False)