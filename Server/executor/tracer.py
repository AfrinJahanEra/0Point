import sys
import io
import traceback
import json

def execute_with_trace(code):
    steps = []
    stdout = io.StringIO()

    def tracer(frame, event, arg):
        if event == "line":
            # Filter out non-JSON serializable objects from locals
            filtered_locals = {}
            for key, value in frame.f_locals.items():
                try:
                    json.dumps(value)  # Test if value is JSON serializable
                    filtered_locals[key] = value
                except (TypeError, ValueError):
                    # Convert non-serializable objects to string representation
                    filtered_locals[key] = str(type(value).__name__)
            
            steps.append({
                "line": frame.f_lineno,
                "variables": filtered_locals,
                "output": stdout.getvalue(),
                "description": f"Executing line {frame.f_lineno}"
            })
        return tracer

    try:
        sys.settrace(tracer)
        exec(
            code,
            {
                "__builtins__": {
                    "print": print,
                    "range": range,
                    "len": len,
                    "int": int,
                    "float": float,
                    "str": str
                }
            },
            {}
        )
    except Exception as e:
        steps.append({
            "line": -1,
            "variables": {},
            "output": str(e),
            "description": "Runtime Error"
        })
    finally:
        sys.settrace(None)

    return steps
