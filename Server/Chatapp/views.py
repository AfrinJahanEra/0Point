import os
import json
from dotenv import load_dotenv

import google.generativeai as genai
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import ChatSession, ChatMessage
from contest.utils.auth import get_user_from_request  # ✅ use same JWT helper

load_dotenv()

# ------------------ Gemini Config ------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
