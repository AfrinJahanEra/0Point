# Server/executor/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .tracer import execute_with_trace, execute_cpp_with_trace
import sys

@api_view(['POST'])
def execute_code(request):
    code = request.data.get("code")
    language = request.data.get("language", "python").lower()

    if not code:
        return Response({"error": "Code is required"}, status=400)

    try:
        if language == "python":
            steps = execute_with_trace(code)
        elif language == "cpp":
            steps = execute_cpp_with_trace(code)
        else:
            return Response({"error": f"Language '{language}' not supported"}, status=400)

        final_output = ""
        if steps:
            final_output = steps[-1].get("output", "")

        return Response({
            "steps": steps,
            "final_output": final_output
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)