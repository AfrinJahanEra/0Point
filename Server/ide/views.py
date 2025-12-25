# ide/views.py
import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

JD_CLIENT_ID = settings.JD_CLIENT_ID
JD_CLIENT_SECRET = settings.JD_CLIENT_SECRET
JD_API_URL = "https://api.jdoodle.com/v1/execute"

@csrf_exempt
@require_http_methods(["POST"])
def compile_code(request):
    try:
        data = json.loads(request.body)
        code = data.get('code')
        language = data.get('language', 'python')
        stdin = data.get('stdin', '')

        # Map language to JDoodle alias
        lang_map = {
            'python': 'python3',
            'java': 'java',
            'c++': 'cpp17',
            'c': 'c',
            'javascript': 'nodejs',
            'ruby': 'ruby',
            'go': 'go',
            'rust': 'rust',
        }
        jd_lang = lang_map.get(language, 'python3')

        payload = {
            "clientId": JD_CLIENT_ID,
            "clientSecret": JD_CLIENT_SECRET,
            "script": code,
            "stdin": stdin,
            "language": jd_lang,
            "versionIndex": "0"
        }

        response = requests.post(JD_API_URL, json=payload, timeout=10)
        result = response.json()

        return JsonResponse({
            'output': result.get('output', ''),
            'statusCode': result.get('statusCode', 200),
            'memory': result.get('memory', 'N/A'),
            'cpuTime': result.get('cpuTime', 'N/A')
        })

    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'output': f"Compilation error: {str(e)}"
        }, status=500)