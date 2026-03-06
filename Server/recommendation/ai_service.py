import requests
import json
from django.conf import settings

GROQ_API_KEY = getattr(settings, 'GROQ_API_KEY', None)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def call_groq(prompt: str) -> dict:
    if not GROQ_API_KEY:
        raise Exception("GROQ_API_KEY not set in settings.py")

    payload = {
        "model": "llama-3.1-8b-instant",   # fastest + excellent quality on Groq (March 2026)
        "messages": [
            {"role": "system", "content": "You are a precise competitive programming coach. Always respond in valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "max_tokens": 1800,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=12)
    resp.raise_for_status()

    content = resp.json()['choices'][0]['message']['content']
    return json.loads(content)