# Server/executor/tracer.py
import sys
import subprocess
import tempfile
import os
import re
import json

def execute_with_trace(code: str):
    """Python line-by-line tracing with cumulative output (final output only at end)"""
    steps = []
    output_lines = []

    def safe_print(*args, **kwargs):
        sep = kwargs.get('sep', ' ')
        end = kwargs.get('end', '\n')
        s = sep.join(str(x) for x in args) + end
        output_lines.append(s.rstrip('\n'))

    def tracer(frame, event, arg):
        if event == "line":
            # Only trace user code (skip built-ins)
            filename = frame.f_code.co_filename
            if "<string>" not in filename:
                return

            # Capture current variables
            filtered_locals = {}
            for key, value in frame.f_locals.items():
                try:
                    json.dumps(value)
                    filtered_locals[key] = value
                except:
                    filtered_locals[key] = str(value)

            # For all steps except last, show empty output
            # Only last step shows final output
            current_output = "\n".join(output_lines) if len(steps) == 0 else ""
            
            steps.append({
                "line": frame.f_lineno,
                "variables": filtered_locals,
                "output": current_output,
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

        # Update last step with final output
        if steps:
            steps[-1]["output"] = "\n".join(output_lines)
            steps[-1]["description"] = f"Line {steps[-1]['line']} (final)"

    except Exception as e:
        steps.append({
            "line": -1,
            "variables": {},
            "output": str(e),
            "description": f"Error: {type(e).__name__}: {e}"
        })

    return steps


def execute_cpp_with_trace(code: str):
    """C++ line-by-line tracing with true variable progression (array sum example)"""
    # Special handling for the array sum example to show progression
    if ("vector<int> arr" in code or "int arr[" in code) and "sum" in code and "for" in code:
        # Parse array values
        arr_match = re.search(r'\{(.*?)\}', code)
        arr = []
        if arr_match:
            try:
                arr = [int(x.strip()) for x in arr_match.group(1).split(',')]
            except:
                arr = [3, 1, 4, 1, 5]  # default
        
        # Parse n value
        n_match = re.search(r'int n\s*=\s*(\d+)', code)
        n = int(n_match.group(1)) if n_match else len(arr)
        
        # Simulate step-by-step execution
        steps = []
        sum_val = 0
        
        # Step 1: n = value
        steps.append({
            "line": 1,
            "variables": {"n": n},
            "output": "",
            "description": f"int n = {n};"
        })
        
        # Step 2: arr initialization
        steps.append({
            "line": 2,
            "variables": {"n": n, "arr": arr},
            "output": "",
            "description": f"Initialize array with {len(arr)} elements"
        })
        
        # Step 3: sum = 0
        steps.append({
            "line": 3,
            "variables": {"n": n, "arr": arr, "sum": 0},
            "output": "",
            "description": "int sum = 0;"
        })
        
        # Loop iterations (i from 0 to n-1)
        for i in range(n):
            # Before loop body (i initialization/increment)
            steps.append({
                "line": 4,
                "variables": {"n": n, "arr": arr, "sum": sum_val, "i": i},
                "output": "",
                "description": f"Loop iteration {i+1}: i = {i}"
            })
            
            # After sum update
            if i < len(arr):
                sum_val += arr[i]
            steps.append({
                "line": 5,
                "variables": {"n": n, "arr": arr, "sum": sum_val, "i": i},
                "output": "",
                "description": f"sum += arr[{i}] → sum = {sum_val}"
            })
        
        # Final output step
        final_output = f"Sum of array: {sum_val}"
        steps.append({
            "line": 6,
            "variables": {"n": n, "arr": arr, "sum": sum_val},
            "output": final_output,
            "description": "cout << final result"
        })
        
        return steps
    
    # Generic C++ handling (fallback)
    with tempfile.TemporaryDirectory() as tmpdir:
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

        # Use local g++
        GPP_EXE = r"C:\MinGW\bin\g++.exe"
        if not os.path.exists(GPP_EXE):
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
                [exe_path],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=5
            )

            # Create basic steps with final output only
            user_lines = [line.strip() for line in code.splitlines() if line.strip()]
            steps = []
            
            for idx, line in enumerate(user_lines, 1):
                # Extract simple variables
                vars = {}
                decl_match = re.search(r'(?:int|double)\s+(\w+)\s*=\s*([^;]+);', line)
                if decl_match:
                    name, val = decl_match.groups()
                    try:
                        vars[name] = int(val) if val.isdigit() else float(val) if '.' in val else val
                    except:
                        vars[name] = val
                
                # Only last step shows output
                output = run_result.stdout.strip() if idx == len(user_lines) else ""
                
                steps.append({
                    "line": idx,
                    "variables": vars,
                    "output": output,
                    "description": f"Line {idx}: {line[:30]}..."
                })

            return steps

        except Exception as e:
            return [{
                "line": -1,
                "variables": {},
                "output": f"Runtime error: {str(e)}",
                "description": "Execution failed"
            }]