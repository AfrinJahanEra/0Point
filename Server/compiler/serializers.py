from rest_framework import serializers

class CodeSubmissionSerializer(serializers.Serializer):
    language = serializers.CharField(max_length=50)
    version_index = serializers.CharField(max_length=10, default="0", required=False)
    code = serializers.CharField()
    input_data = serializers.CharField(allow_blank=True, required=False, default="")
    expected_output = serializers.CharField(allow_blank=True, required=False, default="")
    
    def validate_language(self, value):
        """Validate and normalize language"""
        lang = value.lower()
        valid_languages = ['python', 'python3', 'cpp', 'java', 'c', 'javascript']
        
        # Normalize python3 to python
        if lang == 'python3':
            lang = 'python'
        
        if lang not in valid_languages:
            raise serializers.ValidationError(f"Unsupported language. Supported: {', '.join(valid_languages)}")
        
        return lang
