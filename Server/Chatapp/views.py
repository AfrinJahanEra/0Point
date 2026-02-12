import os
import json
from dotenv import load_dotenv
from datetime import datetime

import google.generativeai as genai
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import ChatSession, ChatMessage
from contest.utils.auth import get_user_from_request

load_dotenv()

# ------------------ Gemini Config ------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
You are an AI assistant specialized strictly in Computer Science and programming.

Scope:
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

When solving contest problems (Socratic method):
- Do NOT give the final answer or full solution immediately.
- Provide stepwise, Socratic guidance: ask clarifying questions, offer the next hint, and reveal progressively more specific hints only if the user requests them.
- Prefer guidance that helps the user reason and derive the solution themselves (pseudo-code hints, algorithmic steps, complexity discussion), not direct code dumps.

When the client provides a contest URL or contest-related page:
- If the URL maps to a contest overview, only use and reveal: contest name/title and the problem list (problem indices and titles). Do NOT expose full problem statements, test cases, or any sensitive data.
- If the URL maps to a specific contest problem, only discuss the problem-solving approach: input/output format, constraints, examples, algorithmic approach, and stepwise hints. Do NOT print full editorial text, private submissions, user IDs, or personal data.
- If the URL maps to discussion, clarification, or editorial pages, only summarize non-personal fields such as status, body/content, timestamps, and public flags (e.g., "pinned", "important"). Never reveal personal identifiers, emails, account IDs, or any sensitive information about users.

Privacy and safety:
- Never expose or speculate about personal or sensitive user information (names, emails, IDs, submissions, tokens).
- If required data is missing or inaccessible, state that the data is unavailable and ask the user to provide the needed details (e.g., full problem statement or example input/output) to proceed.
"""

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

        user = get_user_from_request(request)
        if not user:
            return JsonResponse({"error": "Authentication required"}, status=401)

        # Load or create chat
        if chat_id:
            chat = ChatSession.objects(id=chat_id, user=user).first()
            if not chat:
                return JsonResponse({"error": "Chat not found"}, status=404)
        else:
            chat = ChatSession(
                user=user,
                title=user_text[:40]
            ).save()

        # Save user message
        ChatMessage(
            chat=chat,
            role="user",
            content=user_text
        ).save()

        # Build Gemini context
        messages = [{"role": "user", "parts": [SYSTEM_PROMPT]}]

        history = ChatMessage.objects(chat=chat).order_by("created_at")
        for msg in history:
            messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(messages)

        ai_reply = response.text.strip()

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


def chat_sessions(request):
    user = get_user_from_request(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    chats = ChatSession.objects(user=user).order_by("-updated_at")

    return JsonResponse({
        "chats": [chat.to_dict() for chat in chats]
    })


def chat_messages(request, chat_id):
    user = get_user_from_request(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    chat = ChatSession.objects(id=chat_id, user=user).first()
    if not chat:
        return JsonResponse({"error": "Chat not found"}, status=404)

    messages = ChatMessage.objects(chat=chat).order_by("created_at")

    return JsonResponse({
        "chat": chat.to_dict(),
        "messages": [msg.to_dict() for msg in messages]
    })


@csrf_exempt
def delete_chat(request, chat_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE request required"}, status=405)

    user = get_user_from_request(request)
    if not user:
        return JsonResponse({"error": "Authentication required"}, status=401)

    chat = ChatSession.objects(id=chat_id, user=user).first()
    if not chat:
        return JsonResponse({"error": "Chat not found"}, status=404)

    ChatMessage.objects(chat=chat).delete()
    chat.delete()

    return JsonResponse({"message": "Chat deleted successfully"})




