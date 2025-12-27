# Server/executor/tracer.py
import sys
import subprocess
import tempfile
import os
import re
import json

def execute_with_trace(code: str):
    """Python line-by-line tracing with variable and output capture"""
    steps = []
    output_lines = []

    def safe_print(*args, **kwargs):
        sep = kwargs.get('sep', ' ')
        end = kwargs.get('end', '\n')
        s = sep.join(str(x) for x in args) + end
        output_lines.append(s.rstrip('\n'))
        # ❌ DO NOT call real print() — it triggers more tracing

    def tracer(frame, event, arg):
        if event == "line":
            # ✅ ONLY trace frames from user code (not built-ins)
            filename = frame.f_code.co_filename
            if "<string>" not in filename and "tracer.py" not in filename:
                return  # Skip Django/internal frames

            filtered_locals = {}
            for key, value in frame.f_locals.items():
                try:
                    json.dumps(value)
                    filtered_locals[key] = value
                except:
                    filtered_locals[key] = str(value)

            steps.append({
                "line": frame.f_lineno,
                "variables": filtered_locals,
                "output": "\n".join(output_lines),
                "description": f"Line {frame.f_lineno}"
            })
        return tracer

    try:
        safe_builtins = {
            "__builtins__": {
                "print": safe_print,
                "range": range,
                "len": len,
                "int": int,
                "float": float,
                "str": str,
                "list": list,
                "dict": dict,
                "bool": bool,
            }
        }

        sys.settrace(tracer)
        exec(code, safe_builtins, {})
        sys.settrace(None)

    except Exception as e:
        steps.append({
            "line": -1,
            "variables": {},
            "output": str(e),
            "description": f"Error: {type(e).__name__}: {e}"
        })

    return steps


def execute_cpp_with_trace(code: str):
    """
    C++ tracing — tries Docker first, falls back to local g++.exe
    Uses your verified working paths:
      - Docker image: zeropoint/cpp-debug
      - Local g++: C:\\MinGW\\bin\\g++.exe
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Wrap user code in main()
        full_code = f"""#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {{
{code}
    return 0;
}}"""
        source_path = os.path.join(tmpdir, "source.cpp")
        with open(source_path, "w", encoding="utf-8") as f:
            f.write(full_code)

        # ✅ METHOD 1: Try Docker (secure, sandboxed)
        try:
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{tmpdir}:/home/untrusted:ro",
                "-w", "/home/untrusted",
                "zeropoint/cpp-debug"
            ]
            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                # Success — return simple step
                return [{
                    "line": 1,
                    "variables": {},
                    "output": result.stdout.strip(),
                    "description": "Executed in Docker sandbox"
                }]
            # If Docker fails, fall through to local g++
        except Exception:
            pass  # Docker not available or failed — use local g++

        # ✅ METHOD 2: Local g++ (fast, for development)
        GPP_EXE = r"C:\MinGW\bin\g++.exe"
        if not os.path.exists(GPP_EXE):
            # Fallback to 'g++' if in PATH
            GPP_EXE = "g++"

        # Compile
        compile_result = subprocess.run(
            [GPP_EXE, "-std=c++11", "-O0", "-o", "program.exe", "source.cpp"],
            cwd=tmpdir,
            capture_output=True,
            text=True
        )

        if compile_result.returncode != 0:
            return [{
                "line": -1,
                "variables": {},
                "output": f"Compile error:\n{compile_result.stderr}",
                "description": "Compilation failed"
            }]

        # Run
        try:
            exe_path = os.path.join(tmpdir, "program.exe")
            run_result = subprocess.run(
                [exe_path],  # 👈 Full path
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=5
            )

            # Parse user lines for variable extraction
            user_lines = [line.strip() for line in code.splitlines() if line.strip()]
            steps = []
            cumulative_output = run_result.stdout.strip()

            for idx, line in enumerate(user_lines, start=1):
                vars = {}
                # Simple int/double extraction: int x = 5;
                match = re.search(r'(?:int|double|float|string)\s+(\w+)\s*=\s*([^;]+);', line)
                if match:
                    name = match.group(1)
                    val_str = match.group(2).strip()
                    try:
                        if val_str.isdigit():
                            vars[name] = int(val_str)
                        elif '.' in val_str and val_str.replace('.', '', 1).replace('-', '', 1).isdigit():
                            vars[name] = float(val_str)
                        else:
                            vars[name] = val_str
                    except:
                        vars[name] = val_str

                steps.append({
                    "line": idx,
                    "variables": vars,
                    "output": cumulative_output,
                    "description": f"Executed: {line}"
                })

            return steps or [{
                "line": 1,
                "variables": {},
                "output": cumulative_output or run_result.stderr,
                "description": "Program executed"
            }]

        except subprocess.TimeoutExpired:
            return [{
                "line": -1,
                "variables": {},
                "output": "⚠️ Timeout: Program ran longer than 5 seconds.",
                "description": "Timeout"
            }]
        except Exception as e:
            return [{
                "line": -1,
                "variables": {},
                "output": f"💥 RuntimeError: {str(e)}",
                "description": "Execution failed"
            }]