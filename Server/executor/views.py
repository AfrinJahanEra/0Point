from rest_framework.decorators import api_view
from rest_framework.response import Response
from .tracer import execute_with_trace

@api_view(['POST'])
def execute_code(request):
    code = request.data.get("code")
    language = request.data.get("language")

    if not code:
        return Response({"error": "Code is required"}, status=400)

    if language != "python":
        return Response({"error": "Only Python supported"}, status=400)

    steps = execute_with_trace(code)

    final_output = steps[-1]["output"] if steps else ""

    return Response({
        "steps": steps,
        "final_output": final_output
    })