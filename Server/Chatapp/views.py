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

Behavioral rules:
- Be concise, helpful, and encourage the user's active problem-solving.
- When the user asks for full solutions after working through hints, confirm intent before providing complete code or answers.
- Do not fabricate contest data; only use the provided backend JSON or user-provided content.
"""

def sanitize_contest_data(data):
    if not isinstance(data, dict):
        return data
    
    user_fields = ["created_by", "author", "user", "updated_by", "last_modified_by"]    
    sensitive_keys = ["email", "password", "token", "id", "phone", "address", "ssn", "bank_account", "credit_card"]

    result = {}
    for key, value in data.items():
        if key in user_fields:
            continue
        if key.lower() in sensitive_keys:
            continue
        if isinstance(value, dict):
            result[key] = sanitize_contest_data(value)
        elif isinstance(value, list):
            result[key] = [
                sanitize_contest_data(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            result[key] = value
    return result


@csrf_exempt
def chat_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)
        user_text = data.get("message", "").strip()
        chat_id = data.get("chat_id")
        # Accept current page URL from client (either `current_url` or `url`)
        current_url = data.get("current_url") or data.get("url")

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

        # Save user message (with optional current URL)
        ChatMessage(
            chat=chat,
            role="user",
            content=user_text,
            url=current_url
        ).save()

        # If client provided a current URL, try to fetch its data.
        # If the URL looks like a contest route (SPA path), call the backend contest API
        # so we get structured JSON rather than the frontend HTML.
        from urllib.parse import urlparse

        page_data_str = None
        if current_url:
            try:
                parsed = urlparse(current_url)
                path = parsed.path or "/"

                # Build backend base URL from incoming request (this server)
                scheme = request.scheme
                host = request.get_host()
                backend_base = f"{scheme}://{host}"

                headers = {}
                auth = request.META.get("HTTP_AUTHORIZATION")
                if auth:
                    headers["Authorization"] = auth

                # If the path looks like a contest frontend route, call the corresponding
                # backend API under this Django server (which exposes /contests/... endpoints)
                if path.startswith("/contests/"):
                    # Prefer the backend API path (same path) which returns JSON
                    backend_url = backend_base + path
                    # Ensure trailing slash for Django endpoints
                    if not backend_url.endswith("/"):
                        backend_url = backend_url + "/"

                    resp = requests.get(backend_url, headers=headers, timeout=6)
                    ctype = resp.headers.get("Content-Type", "")
                    if "application/json" in ctype:
                        page_json = resp.json()
                        # Sanitize sensitive data before including in chatbot context
                        page_json = sanitize_contest_data(page_json)
                        page_data_str = json.dumps(page_json, default=str, indent=2)
                    else:
                        # Fallback to text (shortened)
                        page_data_str = resp.text[:4000]
                else:
                    # Not a contest SPA route — attempt to fetch the URL directly
                    resp = requests.get(current_url, headers=headers, timeout=5)
                    ctype = resp.headers.get("Content-Type", "")
                    if "application/json" in ctype:
                        try:
                            page_json = resp.json()
                            # Sanitize sensitive data before including in chatbot context
                            page_json = sanitize_contest_data(page_json)
                            page_data_str = json.dumps(page_json, default=str, indent=2)
                        except Exception:
                            page_data_str = resp.text[:4000]
                    else:
                        page_data_str = resp.text[:4000]
            except Exception as e:
                # Silently ignore fetch errors - don't pass error message to AI
                page_data_str = None

        # Build Gemini context
        messages = [{"role": "user", "parts": [SYSTEM_PROMPT]}]

        history = ChatMessage.objects(chat=chat).order_by("created_at")
        for msg in history:
            parts = [msg.content]
            # Don't include page URLs in context - AI can't access them anyway
            messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": parts
            })

        # Only add page data context if we successfully fetched useful data
        if page_data_str and not page_data_str.startswith("<!DOCTYPE") and len(page_data_str) > 50:
            messages.append({
                "role": "user",
                "parts": [f"Page data fetched from {current_url}: {page_data_str}"]
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
            "reply": ai_reply,
            "current_url": current_url,
            "page_data": page_data_str,
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












