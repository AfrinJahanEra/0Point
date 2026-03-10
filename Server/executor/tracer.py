# Server/executor/tracer.py
import sys
import subprocess
import tempfile
import os
import re
import json
import copy

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

            # Accumulate output as execution progresses
            current_output = "\n".join(output_lines)
            
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
                "abs": abs,
                "min": min,
                "max": max,
                "sum": sum,
                "sorted": sorted,
                "enumerate": enumerate,
                "zip": zip,
                "map": map,
                "filter": filter,
                "isinstance": isinstance,
                "type": type,
                "tuple": tuple,
                "set": set,
                "True": True,
                "False": False,
                "None": None,
            }
        }

        sys.settrace(tracer)
        exec(code, safe_builtins, {})
        sys.settrace(None)

        # Ensure final step has complete output
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


class CppCodeAnalyzer:
    """Comprehensive C++ code analyzer with boilerplate removal and accurate parsing"""
    
    # C++ type sizes (typical 64-bit system)
    TYPE_SIZES = {
        'char': 1, 'signed char': 1, 'unsigned char': 1,
        'short': 2, 'short int': 2, 'signed short': 2, 'unsigned short': 2,
        'int': 4, 'signed int': 4, 'unsigned int': 4, 'signed': 4, 'unsigned': 4,
        'long': 8, 'long int': 8, 'signed long': 8, 'unsigned long': 8,
        'long long': 8, 'long long int': 8, 'signed long long': 8, 'unsigned long long': 8,
        'float': 4,
        'double': 8,
        'long double': 16,
        'bool': 1,
        'size_t': 8,
        'ptrdiff_t': 8,
        'int8_t': 1, 'uint8_t': 1,
        'int16_t': 2, 'uint16_t': 2,
        'int32_t': 4, 'uint32_t': 4,
        'int64_t': 8, 'uint64_t': 8,
        'void*': 8, 'pointer': 8,
    }
    
    # Boilerplate patterns to remove
    BOILERPLATE_PATTERNS = [
        r'^\s*#include\s*[<"][^>"]+[>"]\s*$',  # #include statements
        r'^\s*using\s+namespace\s+\w+\s*;\s*$',  # using namespace
        r'^\s*#define\s+.*$',  # #define macros (simple ones)
        r'^\s*#pragma\s+.*$',  # #pragma directives
        r'^\s*#ifndef\s+.*$',  # Header guards
        r'^\s*#ifdef\s+.*$',
        r'^\s*#endif\s*$',
        r'^\s*typedef\s+.*$',  # typedef statements
        r'^\s*//.*$',  # Single line comments (optional to keep)
        r'^\s*/\*.*\*/\s*$',  # Single line block comments
    ]
    
    # Common competitive programming macros
    CP_MACROS = {
        'll': 'long long',
        'ull': 'unsigned long long',
        'ld': 'long double',
        'pb': 'push_back',
        'mp': 'make_pair',
        'ff': 'first',
        'ss': 'second',
        'all(x)': 'x.begin(), x.end()',
        'sz(x)': 'x.size()',
        'endl': '\\n',
    }
    
    def __init__(self, code: str):
        self.original_code = code
        self.cleaned_code = ""
        self.user_code_lines = []
        self.line_mapping = {}  # Maps cleaned line numbers to original line numbers
        self.variables = {}  # Track variables: {name: {type, value, size}}
        self.functions = []  # List of detected functions
        self.loops = []  # List of detected loops
        self.arrays = {}  # Track arrays: {name: {type, size, values}}
        self.output_buffer = []
        
    def remove_boilerplate(self):
        """Remove boilerplate code and extract user's actual code"""
        lines = self.original_code.split('\n')
        cleaned_lines = []
        original_line_nums = []
        in_main = False
        main_brace_count = 0
        in_multiline_comment = False
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Handle multiline comments
            if '/*' in stripped and '*/' not in stripped:
                in_multiline_comment = True
                continue
            if in_multiline_comment:
                if '*/' in stripped:
                    in_multiline_comment = False
                continue
            
            # Skip empty lines in boilerplate section
            if not stripped:
                if in_main and main_brace_count > 0:
                    cleaned_lines.append(line)
                    original_line_nums.append(line_num)
                continue
            
            # Check for boilerplate patterns
            is_boilerplate = False
            for pattern in self.BOILERPLATE_PATTERNS:
                if re.match(pattern, line, re.IGNORECASE):
                    is_boilerplate = True
                    break
            
            if is_boilerplate:
                continue
            
            # Detect main function
            if re.match(r'^\s*(int|void)\s+main\s*\(', stripped):
                in_main = True
                # Check if opening brace is on same line
                if '{' in stripped:
                    main_brace_count = stripped.count('{') - stripped.count('}')
                    # Extract code after opening brace if any
                    after_brace = stripped.split('{', 1)[1].strip()
                    if after_brace and after_brace != '}':
                        cleaned_lines.append('    ' + after_brace.rstrip('}').strip())
                        original_line_nums.append(line_num)
                continue
            
            # Track braces inside main
            if in_main:
                if '{' in stripped:
                    main_brace_count += stripped.count('{')
                if '}' in stripped:
                    main_brace_count -= stripped.count('}')
                    if main_brace_count <= 0:
                        # End of main function
                        # Check if there's code before the closing brace
                        before_brace = stripped.rsplit('}', 1)[0].strip()
                        if before_brace:
                            cleaned_lines.append(before_brace)
                            original_line_nums.append(line_num)
                        in_main = False
                        continue
                
                # Skip return 0 statements
                if re.match(r'^\s*return\s+0\s*;\s*$', stripped):
                    continue
                
                cleaned_lines.append(line)
                original_line_nums.append(line_num)
            else:
                # Code outside main (functions, global declarations)
                cleaned_lines.append(line)
                original_line_nums.append(line_num)
        
        # If no main function was found, use all non-boilerplate code
        if not cleaned_lines:
            for line_num, line in enumerate(lines, 1):
                is_boilerplate = False
                for pattern in self.BOILERPLATE_PATTERNS:
                    if re.match(pattern, line, re.IGNORECASE):
                        is_boilerplate = True
                        break
                if not is_boilerplate and line.strip():
                    cleaned_lines.append(line)
                    original_line_nums.append(line_num)
        
        self.cleaned_code = '\n'.join(cleaned_lines)
        self.user_code_lines = cleaned_lines
        self.line_mapping = {i+1: orig for i, orig in enumerate(original_line_nums)}
        
        return self.cleaned_code
    
    def calculate_sizeof(self, type_expr: str) -> int:
        """Calculate sizeof() for a given type expression"""
        type_expr = type_expr.strip()
        
        # Handle pointer types
        if '*' in type_expr:
            return self.TYPE_SIZES['pointer']
        
        # Handle array types: type[size]
        array_match = re.match(r'(\w+(?:\s+\w+)*)\s*\[(\d+)\]', type_expr)
        if array_match:
            base_type = array_match.group(1).strip()
            size = int(array_match.group(2))
            base_size = self.TYPE_SIZES.get(base_type, 4)
            return base_size * size
        
        # Handle vector<type>
        vector_match = re.match(r'vector\s*<\s*(\w+)\s*>', type_expr)
        if vector_match:
            # vector has 24 bytes overhead (3 pointers) + element storage
            return 24  # Base vector size (without elements)
        
        # Handle string
        if type_expr in ['string', 'std::string']:
            return 32  # Typical string overhead
        
        # Handle pair<type1, type2>
        pair_match = re.match(r'pair\s*<\s*(\w+)\s*,\s*(\w+)\s*>', type_expr)
        if pair_match:
            type1 = pair_match.group(1).strip()
            type2 = pair_match.group(2).strip()
            return self.TYPE_SIZES.get(type1, 4) + self.TYPE_SIZES.get(type2, 4)
        
        # Direct type lookup
        return self.TYPE_SIZES.get(type_expr, 4)
    
    def evaluate_sizeof_expr(self, expr: str) -> str:
        """Evaluate sizeof expressions in code and replace with values"""
        def replace_sizeof(match):
            content = match.group(1).strip()
            
            # Check if it's a variable name
            if content in self.variables:
                var_info = self.variables[content]
                if 'size' in var_info:
                    return str(var_info['size'])
            
            # Check if it's an array
            if content in self.arrays:
                arr_info = self.arrays[content]
                return str(arr_info.get('total_size', 0))
            
            # Check if it's an array element like arr[0] - return element size
            arr_elem_match = re.match(r'(\w+)\s*\[', content)
            if arr_elem_match:
                arr_name = arr_elem_match.group(1)
                if arr_name in self.arrays:
                    return str(self.arrays[arr_name].get('element_size', 4))
            
            # Calculate size from type
            return str(self.calculate_sizeof(content))
        
        # Replace sizeof(expr) with calculated value
        result = re.sub(r'sizeof\s*\(\s*([^)]+)\s*\)', replace_sizeof, expr)
        return result
    
    def detect_functions(self):
        """Detect function definitions in the code"""
        function_pattern = r'(?:(\w+(?:\s+\w+)*)\s+)?(\w+)\s*\(([^)]*)\)\s*\{'
        
        for i, line in enumerate(self.user_code_lines):
            match = re.match(function_pattern, line.strip())
            if match:
                return_type = match.group(1) or 'void'
                func_name = match.group(2)
                params = match.group(3)
                
                # Skip main function
                if func_name == 'main':
                    continue
                
                self.functions.append({
                    'name': func_name,
                    'return_type': return_type,
                    'params': params,
                    'line': i + 1
                })
        
        return self.functions
    
    def parse_variable_declaration(self, line: str, current_vars: dict) -> dict:
        """Parse variable declarations and return updated variables"""
        new_vars = copy.deepcopy(current_vars)
        original_line = line
        line = line.strip().rstrip(';')
        
        # Handle array declarations: int arr[5] = {1,2,3,4,5};
        arr_match = re.match(r'(\w+)\s+(\w+)\s*\[\s*(\d*)\s*\]\s*(?:=\s*\{([^}]*)\})?', line)
        if arr_match:
            base_type = arr_match.group(1).strip()
            arr_name = arr_match.group(2)
            size_str = arr_match.group(3)
            values_str = arr_match.group(4)
            
            values = []
            if values_str:
                try:
                    values = [self.evaluate_expression(v.strip(), new_vars) for v in values_str.split(',')]
                except:
                    values = values_str.split(',')
            
            size = int(size_str) if size_str else len(values)
            element_size = self.TYPE_SIZES.get(base_type, 4)
            
            new_vars[arr_name] = values if values else [0] * size
            self.arrays[arr_name] = {
                'type': base_type,
                'size': size,
                'element_size': element_size,
                'total_size': size * element_size,
                'values': values
            }
            return new_vars
        
        # Handle vector declarations: vector<int> v = {1,2,3};
        vec_match = re.match(r'vector\s*<\s*(\w+)\s*>\s+(\w+)\s*(?:\((\d+)(?:,\s*(\d+))?\))?(?:\s*=\s*\{([^}]*)\})?', line)
        if vec_match:
            elem_type = vec_match.group(1)
            vec_name = vec_match.group(2)
            size_arg = vec_match.group(3)
            fill_val = vec_match.group(4)
            values_str = vec_match.group(5)
            
            values = []
            if values_str:
                try:
                    values = [self.evaluate_expression(v.strip(), new_vars) for v in values_str.split(',')]
                except:
                    values = values_str.split(',')
            elif size_arg:
                size = int(size_arg)
                default_val = int(fill_val) if fill_val else 0
                values = [default_val] * size
            
            new_vars[vec_name] = values
            self.arrays[vec_name] = {
                'type': elem_type,
                'size': len(values),
                'element_size': self.TYPE_SIZES.get(elem_type, 4),
                'total_size': len(values) * self.TYPE_SIZES.get(elem_type, 4) + 24,
                'values': values
            }
            return new_vars
        
        # Handle string declarations: string s = "hello"; or string s;
        if line.startswith('string ') or line.startswith('std::string '):
            # Remove prefix
            if line.startswith('std::string '):
                rest = line[12:]
            else:
                rest = line[7:]
            
            # Parse name and optional value
            parts = rest.split('=', 1)
            var_name = parts[0].strip()
            
            value = ""
            if len(parts) > 1:
                value_expr = parts[1].strip().rstrip(';')
                value = self.evaluate_expression(value_expr, new_vars)
                if value is None:
                    value = value_expr.strip('"\'')  # Fallback: remove quotes manually
            
            new_vars[var_name] = value
            self.variables[var_name] = {
                'type': 'string',
                'value': value,
                'size': 32 + len(str(value))
            }
            return new_vars
        
        # Handle simple declarations: int x = 5; double pi = 3.14; bool flag = true;
        simple_match = re.match(r'(int|long|float|double|char|bool|unsigned|signed|auto|short|size_t)\s+(\w+)\s*(?:=\s*(.+))?', line)
        if simple_match:
            var_type = simple_match.group(1).strip()
            var_name = simple_match.group(2)
            value_expr = simple_match.group(3)
            
            value = None
            if value_expr:
                value_expr = value_expr.strip()
                value = self.evaluate_expression(value_expr, new_vars)
            else:
                # Default initialization
                if var_type in ['int', 'long', 'short', 'unsigned', 'signed', 'size_t']:
                    value = 0
                elif var_type in ['float', 'double']:
                    value = 0.0
                elif var_type == 'char':
                    value = '\0'
                elif var_type == 'bool':
                    value = False
            
            new_vars[var_name] = value
            self.variables[var_name] = {
                'type': var_type,
                'value': value,
                'size': self.TYPE_SIZES.get(var_type, 4)
            }
            return new_vars
        
        return new_vars
    
    def evaluate_expression(self, expr: str, variables: dict):
        """Evaluate a C++ expression with current variable values"""
        if not expr:
            return None
        
        expr = expr.strip()
        
        # Handle sizeof expressions
        expr = self.evaluate_sizeof_expr(expr)
        
        # Handle string literals
        if (expr.startswith('"') and expr.endswith('"')) or (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]
        
        # Handle boolean literals
        if expr == 'true':
            return True
        if expr == 'false':
            return False
        
        # Handle numeric literals
        try:
            if '.' in expr:
                return float(expr)
            if expr.startswith('0x') or expr.startswith('0X'):
                return int(expr, 16)
            if expr.startswith('0b') or expr.startswith('0B'):
                return int(expr, 2)
            return int(expr)
        except ValueError:
            pass
        
        # Handle array/vector access: arr[i]
        arr_access = re.match(r'(\w+)\s*\[\s*([^\]]+)\s*\]', expr)
        if arr_access:
            arr_name = arr_access.group(1)
            index_expr = arr_access.group(2)
            if arr_name in variables:
                arr = variables[arr_name]
                try:
                    index = self.evaluate_expression(index_expr, variables)
                    if isinstance(arr, (list, tuple, str)) and isinstance(index, int):
                        if 0 <= index < len(arr):
                            return arr[index]
                except:
                    pass
        
        # Handle .size() and .length() methods
        size_match = re.match(r'(\w+)\.(size|length)\(\)', expr)
        if size_match:
            var_name = size_match.group(1)
            if var_name in variables:
                val = variables[var_name]
                if isinstance(val, (list, str)):
                    return len(val)
        
        # Handle .empty() method
        empty_match = re.match(r'(\w+)\.empty\(\)', expr)
        if empty_match:
            var_name = empty_match.group(1)
            if var_name in variables:
                val = variables[var_name]
                if isinstance(val, (list, str)):
                    return len(val) == 0
        
        # Handle .substr() method: str.substr(pos, len) or str.substr(pos)
        substr_match = re.match(r'(\w+)\.substr\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)', expr)
        if substr_match:
            var_name = substr_match.group(1)
            start_pos = int(substr_match.group(2))
            length = substr_match.group(3)
            if var_name in variables:
                val = variables[var_name]
                if isinstance(val, str):
                    if length:
                        return val[start_pos:start_pos + int(length)]
                    return val[start_pos:]
        
        # Handle string concatenation: str1 + str2 or str + "literal"
        if '+' in expr and not re.match(r'^[\d\s+\-*/%().]+$', expr):
            parts = expr.split('+')
            result_parts = []
            all_strings = True
            for part in parts:
                part = part.strip()
                val = self.evaluate_expression(part, variables)
                if val is not None:
                    result_parts.append(str(val))
                else:
                    all_strings = False
                    break
            if all_strings and result_parts:
                return ''.join(result_parts)
        
        # Handle simple variable reference
        if expr in variables:
            return variables[expr]
        
        # Handle simple arithmetic expressions
        try:
            # Replace variable names with values
            eval_expr = expr
            for var_name, var_val in variables.items():
                if isinstance(var_val, (int, float)):
                    eval_expr = re.sub(r'\b' + var_name + r'\b', str(var_val), eval_expr)
            
            # Safe evaluation of arithmetic
            if re.match(r'^[\d\s+\-*/%().]+$', eval_expr):
                return eval(eval_expr)
        except:
            pass
        
        return expr
    
    def parse_loop(self, line: str, variables: dict):
        """Parse for/while loop and extract loop parameters"""
        loop_info = {'type': None, 'var': None, 'start': 0, 'end': 0, 'step': 1}
        
        # for (int i = 0; i < n; i++)
        for_match = re.match(r'for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*([^;]+);\s*\1\s*([<>=!]+)\s*([^;]+);\s*\1(\+\+|--|\+=\d+|-=\d+)', line)
        if for_match:
            loop_info['type'] = 'for'
            loop_info['var'] = for_match.group(1)
            loop_info['start'] = self.evaluate_expression(for_match.group(2), variables)
            loop_info['end'] = self.evaluate_expression(for_match.group(4), variables)
            
            op = for_match.group(3)
            increment = for_match.group(5)
            
            if increment == '++':
                loop_info['step'] = 1
            elif increment == '--':
                loop_info['step'] = -1
            elif increment.startswith('+='):
                loop_info['step'] = int(increment[2:])
            elif increment.startswith('-='):
                loop_info['step'] = -int(increment[2:])
            
            # Calculate iterations based on condition
            if isinstance(loop_info['start'], int) and isinstance(loop_info['end'], int):
                if op == '<':
                    loop_info['iterations'] = max(0, loop_info['end'] - loop_info['start'])
                elif op == '<=':
                    loop_info['iterations'] = max(0, loop_info['end'] - loop_info['start'] + 1)
                elif op == '>':
                    loop_info['iterations'] = max(0, loop_info['start'] - loop_info['end'])
                elif op == '>=':
                    loop_info['iterations'] = max(0, loop_info['start'] - loop_info['end'] + 1)
            
            return loop_info
        
        # while (condition)
        while_match = re.match(r'while\s*\(\s*(.+)\s*\)', line)
        if while_match:
            loop_info['type'] = 'while'
            loop_info['condition'] = while_match.group(1)
            return loop_info
        
        return None
    
    def generate_description(self, line: str, variables: dict) -> str:
        """Generate a human-readable description for a line of code"""
        line = line.strip()
        
        # Variable declaration
        if re.match(r'(int|long|float|double|char|bool|string|auto)\s+\w+', line):
            var_match = re.match(r'(\w+(?:\s+\w+)*)\s+(\w+)\s*(?:=\s*(.+))?', line.rstrip(';'))
            if var_match:
                var_type = var_match.group(1)
                var_name = var_match.group(2)
                value_expr = var_match.group(3)
                if value_expr and var_name in variables:
                    return f"Declare {var_type} {var_name} = {variables[var_name]}"
                return f"Declare {var_type} {var_name}"
        
        # Array/vector declaration
        if 'vector<' in line or re.search(r'\w+\s*\[', line):
            arr_match = re.search(r'(\w+)\s*(?:\[|<)', line)
            if arr_match:
                return f"Initialize array/vector {arr_match.group(1)}"
        
        # For loop
        if line.startswith('for'):
            loop_info = self.parse_loop(line, variables)
            if loop_info and loop_info.get('iterations'):
                return f"Start for loop: {loop_info['var']} from {loop_info['start']} ({loop_info['iterations']} iterations)"
            return "Start for loop"
        
        # While loop
        if line.startswith('while'):
            return "Start while loop"
        
        # If/else
        if line.startswith('if'):
            cond_match = re.match(r'if\s*\(\s*(.+)\s*\)', line)
            if cond_match:
                return f"Check condition: {cond_match.group(1)}"
        if line.startswith('else'):
            return "Else branch"
        
        # Output statements
        if 'cout' in line or 'printf' in line:
            return "Output to console"
        
        # Input statements
        if 'cin' in line or 'scanf' in line:
            return "Read input"
        
        # Assignment
        assign_match = re.match(r'(\w+)\s*([+\-*/%]?=)\s*(.+)', line.rstrip(';'))
        if assign_match:
            var_name = assign_match.group(1)
            op = assign_match.group(2)
            if var_name in variables:
                return f"{var_name} {op} ... -> {variables[var_name]}"
        
        # Function call
        func_match = re.match(r'(\w+)\s*\(', line)
        if func_match:
            return f"Call function {func_match.group(1)}()"
        
        # Return statement
        if line.startswith('return'):
            return "Return from function"
        
        return f"Execute: {line[:50]}{'...' if len(line) > 50 else ''}"


def execute_cpp_with_trace(code: str):
    """C++ comprehensive tracing with full code analysis"""
    
    analyzer = CppCodeAnalyzer(code)
    cleaned_code = analyzer.remove_boilerplate()
    analyzer.detect_functions()
    
    lines = analyzer.user_code_lines
    if not lines:
        return [{
            "line": 1,
            "variables": {},
            "output": "No executable code found",
            "description": "Empty or only boilerplate code"
        }]
    
    steps = []
    variables = {}
    output_buffer = []
    
    # Track loop state
    loop_stack = []  # Stack of loop contexts
    i = 0
    max_iterations = 1000  # Safety limit
    iteration_count = 0
    
    while i < len(lines) and iteration_count < max_iterations:
        iteration_count += 1
        line = lines[i].strip()
        original_line = analyzer.line_mapping.get(i + 1, i + 1)
        
        # Skip empty lines, opening braces, and comments
        if not line or line == '{' or line.startswith('//'):
            i += 1
            continue
        
        # Handle closing brace for loops
        if line == '}' and loop_stack:
            loop_ctx = loop_stack[-1]
            loop_var = loop_ctx['var']
            
            # Increment loop variable
            if loop_var in variables:
                variables[loop_var] += loop_ctx.get('step', 1)
                
                # Check if loop should continue
                should_continue = False
                end_val = loop_ctx['end']
                op = loop_ctx.get('op', '<')
                
                if op == '<' and variables[loop_var] < end_val:
                    should_continue = True
                elif op == '<=' and variables[loop_var] <= end_val:
                    should_continue = True
                elif op == '>' and variables[loop_var] > end_val:
                    should_continue = True
                elif op == '>=' and variables[loop_var] >= end_val:
                    should_continue = True
                
                if should_continue:
                    i = loop_ctx['start_line']
                    continue
                else:
                    loop_stack.pop()
            i += 1
            continue
        
        # Parse variable declarations - match all common C++ types
        type_pattern = r'^\s*(int|long|long\s+long|float|double|char|bool|string|std::string|auto|vector|unsigned|signed|unsigned\s+int|size_t)\b'
        if re.match(type_pattern, line):
            variables = analyzer.parse_variable_declaration(line, variables)
        
        # Parse assignments
        assign_match = re.match(r'(\w+)\s*(\+\+|--|[+\-*/%]?=)\s*(.+)?', line.rstrip(';'))
        if assign_match:
            var_name = assign_match.group(1)
            op = assign_match.group(2)
            value_expr = assign_match.group(3)
            
            if var_name in variables:
                old_val = variables[var_name]
                
                if op == '++':
                    if isinstance(old_val, (int, float)):
                        variables[var_name] = old_val + 1
                elif op == '--':
                    if isinstance(old_val, (int, float)):
                        variables[var_name] = old_val - 1
                elif op == '=' and value_expr:
                    variables[var_name] = analyzer.evaluate_expression(value_expr, variables)
                elif op == '+=' and value_expr:
                    add_val = analyzer.evaluate_expression(value_expr, variables)
                    if isinstance(old_val, (int, float)) and isinstance(add_val, (int, float)):
                        variables[var_name] = old_val + add_val
                    elif isinstance(old_val, str):
                        # String concatenation
                        variables[var_name] = old_val + str(add_val) if add_val else old_val
                elif op == '-=' and value_expr:
                    sub_val = analyzer.evaluate_expression(value_expr, variables)
                    if isinstance(old_val, (int, float)) and isinstance(sub_val, (int, float)):
                        variables[var_name] = old_val - sub_val
                elif op == '*=' and value_expr:
                    mul_val = analyzer.evaluate_expression(value_expr, variables)
                    if isinstance(old_val, (int, float)) and isinstance(mul_val, (int, float)):
                        variables[var_name] = old_val * mul_val
                elif op == '/=' and value_expr:
                    div_val = analyzer.evaluate_expression(value_expr, variables)
                    if isinstance(old_val, (int, float)) and isinstance(div_val, (int, float)) and div_val != 0:
                        variables[var_name] = old_val // div_val if isinstance(old_val, int) else old_val / div_val
        
        # Handle array element assignment: arr[i] = value
        arr_assign = re.match(r'(\w+)\s*\[\s*([^\]]+)\s*\]\s*=\s*(.+)', line.rstrip(';'))
        if arr_assign:
            arr_name = arr_assign.group(1)
            index_expr = arr_assign.group(2)
            value_expr = arr_assign.group(3)
            
            if arr_name in variables and isinstance(variables[arr_name], list):
                try:
                    index = analyzer.evaluate_expression(index_expr, variables)
                    value = analyzer.evaluate_expression(value_expr, variables)
                    if isinstance(index, int) and 0 <= index < len(variables[arr_name]):
                        variables[arr_name] = list(variables[arr_name])  # Make mutable copy
                        variables[arr_name][index] = value
                except:
                    pass
        
        # Handle for loops - only process if not already in a loop at this line
        for_match = re.match(r'for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*([^;]+);\s*\1\s*([<>=!]+)\s*([^;]+);\s*\1(\+\+|--|\+=\d+|-=\d+)', line)
        if for_match:
            loop_var = for_match.group(1)
            start_val = analyzer.evaluate_expression(for_match.group(2), variables)
            op = for_match.group(3)
            end_val = analyzer.evaluate_expression(for_match.group(4), variables)
            increment = for_match.group(5)
            
            step = 1
            if increment == '++':
                step = 1
            elif increment == '--':
                step = -1
            elif increment.startswith('+='):
                step = int(increment[2:])
            elif increment.startswith('-='):
                step = -int(increment[2:])
            
            # Only initialize loop variable and push to stack on first entry
            # Check if we're already tracking this loop variable in the current context
            existing_loop = None
            for ctx in loop_stack:
                if ctx['var'] == loop_var and ctx.get('start_line') == i + 1:
                    existing_loop = ctx
                    break
            
            if existing_loop is None:
                variables[loop_var] = start_val
                
                loop_stack.append({
                    'var': loop_var,
                    'start': start_val,
                    'end': end_val,
                    'op': op,
                    'step': step,
                    'start_line': i + 1  # Line after the for statement
                })
        
        # Handle output (cout, printf)
        if 'cout' in line:
            # Extract what's being printed
            cout_match = re.findall(r'<<\s*([^<;]+)', line)
            output_parts = []
            for part in cout_match:
                part = part.strip()
                if part == 'endl' or part == '"\\n"':
                    continue
                if part.startswith('"') and part.endswith('"'):
                    output_parts.append(part[1:-1])
                elif part in variables:
                    output_parts.append(str(variables[part]))
                else:
                    val = analyzer.evaluate_expression(part, variables)
                    output_parts.append(str(val))
            
            if output_parts:
                output_buffer.append(' '.join(output_parts))
        
        # Generate step with snapshot of current state
        step_variables = copy.deepcopy(variables)
        description = analyzer.generate_description(line, step_variables)
        
        # Determine output for this step - accumulate output as we go
        current_output = '\n'.join(output_buffer) if output_buffer else ''
        
        steps.append({
            "line": original_line,
            "variables": step_variables,
            "output": current_output,
            "description": description
        })
        
        i += 1
    
    # If no steps were generated, compile and run the code
    if not steps:
        return execute_cpp_compiled(code)
    
    # Ensure final step has complete output
    if steps and output_buffer:
        steps[-1]["output"] = '\n'.join(output_buffer)
    
    return steps


def execute_cpp_compiled(code: str):
    """Fallback: Compile and run C++ code, returning execution results"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Check if code already has main function and includes
        has_main = bool(re.search(r'\b(int|void)\s+main\s*\(', code))
        has_includes = '#include' in code
        
        if has_main and has_includes:
            full_code = code
        else:
            # Add wrapper if needed
            wrapper_parts = []
            if not has_includes:
                wrapper_parts.append('#include <bits/stdc++.h>')
                wrapper_parts.append('using namespace std;')
            
            if not has_main:
                wrapper_parts.append('')
                wrapper_parts.append('int main() {')
                wrapper_parts.append(code)
                wrapper_parts.append('    return 0;')
                wrapper_parts.append('}')
                full_code = '\n'.join(wrapper_parts)
            else:
                full_code = '\n'.join(wrapper_parts) + '\n' + code
        
        source_path = os.path.join(tmpdir, "source.cpp")
        with open(source_path, "w", encoding="utf-8") as f:
            f.write(full_code)

        # Find g++ compiler
        GPP_EXE = r"C:\MinGW\bin\g++.exe"
        if not os.path.exists(GPP_EXE):
            GPP_EXE = "g++"

        # Compile
        compile_result = subprocess.run(
            [GPP_EXE, "-std=c++17", "-O0", "-o", "program.exe", "source.cpp"],
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

            # Create steps from code analysis
            analyzer = CppCodeAnalyzer(code)
            cleaned_code = analyzer.remove_boilerplate()
            
            user_lines = [l for l in analyzer.user_code_lines if l.strip()]
            steps = []
            variables = {}
            
            for idx, line in enumerate(user_lines):
                line = line.strip()
                if not line or line in ['{', '}']:
                    continue
                
                # Parse variables from declarations
                variables = analyzer.parse_variable_declaration(line, variables)
                
                original_line = analyzer.line_mapping.get(idx + 1, idx + 1)
                description = analyzer.generate_description(line, variables)
                
                # Only last step shows output
                output = run_result.stdout.strip() if idx == len(user_lines) - 1 else ""
                
                steps.append({
                    "line": original_line,
                    "variables": copy.deepcopy(variables),
                    "output": output,
                    "description": description
                })

            if not steps:
                steps.append({
                    "line": 1,
                    "variables": {},
                    "output": run_result.stdout.strip(),
                    "description": "Program executed"
                })
            
            return steps

        except subprocess.TimeoutExpired:
            return [{
                "line": -1,
                "variables": {},
                "output": "Execution timed out (>5s)",
                "description": "Timeout"
            }]
        except Exception as e:
            return [{
                "line": -1,
                "variables": {},
                "output": f"Runtime error: {str(e)}",
                "description": "Execution failed"
            }]