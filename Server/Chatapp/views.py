import os
import json
from dotenv import load_dotenv

import google.generativeai as genai
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import ChatSession, ChatMessage
from contest.utils.auth import get_user_from_request  # ✅ use same JWT helper

load_dotenv()

SYSTEM_PROMPT = """
You are an AI assistant specialized strictly in Computer Science and programming.

You may answer questions related to:
- Programming languages
- Software development
- Web development
- Databases
- Algorithms and data structures
- Operating systems
- Computer networks
- Artificial intelligence and machine learning
- Computer science theory and tools

If the user asks a question outside the Computer Science or coding domain,
you must politely refuse and guide them back to CS topics.
"""

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@csrf_exempt
def chat_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
        user_text = data.get("message", "").strip()
        chat_id = data.get("chat_id")

        if not user_text:
            return JsonResponse({"error": "Empty message"}, status=400)

        # ✅ Use project’s JWT authentication helper
        user = get_user_from_request(request)
        if not user:
            return JsonResponse({"error": "Authentication required"}, status=401)

        # 1️⃣ Load or create chat
        if chat_id:
            chat = ChatSession.objects(id=chat_id, user=user).first()
            if not chat:
                return JsonResponse({"error": "Chat not found"}, status=404)
        else:
            chat = ChatSession(
                user=user,
                title=user_text[:40]
            ).save()

        # 2️⃣ Save user message
        ChatMessage(
            chat=chat,
            role="user",
            content=user_text
        ).save()

        # 3️⃣ Build context for Gemini
        messages = [{"role": "USER", "parts": [SYSTEM_PROMPT]}]

        history = ChatMessage.objects(chat=chat).order_by("created_at")
        for msg in history:
            messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })

        # 4️⃣ Call Gemini
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(messages)

        ai_reply = response.text.strip()

        # 5️⃣ Save AI reply
        ChatMessage(
            chat=chat,
            role="ai",
            content=ai_reply
        ).save()

        return JsonResponse({
            "chat_id": str(chat.id),
            "reply": ai_reply
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

