import React, { useState, useEffect, useRef } from 'react';

const AdvancedCodeVisualizer = ({ initialCode = '', language = 'cpp' }) => {
  // Enhanced State management
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [stdinInput, setStdinInput] = useState('');
  const [executionState, setExecutionState] = useState({
    isRunning: false,
    isPaused: false,
    currentLine: 0,
    speed: 1,
    stepCount: 0,
    iteration: 0,
    totalIterations: 0
  });
  
  const [variables, setVariables] = useState({});
  const [callStack, setCallStack] = useState([]);
  const [memoryHeap, setMemoryHeap] = useState([]);
  const [outputLog, setOutputLog] = useState([]);
  const [executionTrace, setExecutionTrace] = useState([]);
  const [dataStructures, setDataStructures] = useState({});
  const [algorithmInfo, setAlgorithmInfo] = useState(null);
  const [visualizationType, setVisualizationType] = useState('flow');
  const [loopTracker, setLoopTracker] = useState({
    currentLoops: [],
    iterations: {},
    maxIterations: 1000 // Safety limit
  });
  
  const codeRef = useRef(null);
  const executionInterval = useRef(null);
  const pyodideRef = useRef(null);
  const jsInterpreterLoaded = useRef(false);
  const traceIndexRef = useRef(0);
  const loopCountersRef = useRef({});

  // Load Pyodide for Python execution
  useEffect(() => {
    const loadPyodideLib = async () => {
      try {
        let pyodidePKG = await import('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs');
        const pyodide = await pyodidePKG.loadPyodide();
        pyodideRef.current = pyodide;
        console.log('Pyodide loaded successfully');
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
      }
    };
    
    if (!pyodideRef.current) {
      loadPyodideLib();
    }

    // Load JSInterpreter
    if (!jsInterpreterLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/js-interpreter@1.10.1/interpreter.js';
      script.onload = () => {
        jsInterpreterLoaded.current = true;
        console.log('JS Interpreter loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load JS Interpreter');
      };
      document.body.appendChild(script);
    }

    return () => {
      if (executionInterval.current) {
        clearInterval(executionInterval.current);
      }
    };
  }, []);

  // Enhanced languages configuration
  const languages = {
    cpp: {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx'],
      keywords: ['#include', 'using namespace', 'int main', 'for', 'while', 'if', 'else', 'class', 'struct'],
      executionSupported: false,
      loopPatterns: [
        { pattern: /for\s*\(\s*(?:int|long|float|double)?\s*(\w+)\s*=/, varIndex: 1 },
        { pattern: /while\s*\(([^)]+)\)/, varIndex: null },
        { pattern: /do\s*\{/, varIndex: null }
      ]
    },
    python: {
      name: 'Python',
      extensions: ['.py', '.pyw'],
      keywords: ['def', 'class', 'import', 'for', 'while', 'if', 'elif', 'else', 'try', 'except'],
      executionSupported: true,
      loopPatterns: [
        { pattern: /for\s+(\w+)\s+in/, varIndex: 1 },
        { pattern: /while\s+([^:]+):/, varIndex: null }
      ]
    },
    java: {
      name: 'Java',
      extensions: ['.java'],
      keywords: ['public class', 'static void', 'main', 'for', 'while', 'if', 'else', 'class', 'interface'],
      executionSupported: false,
      loopPatterns: [
        { pattern: /for\s*\(\s*(?:int|long|float|double)?\s*(\w+)\s*=/, varIndex: 1 },
        { pattern: /while\s*\(([^)]+)\)/, varIndex: null },
        { pattern: /do\s*\{/, varIndex: null }
      ]
    },
    javascript: {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      keywords: ['function', 'const', 'let', 'var', 'for', 'while', 'if', 'else', 'class', 'async'],
      executionSupported: true,
      loopPatterns: [
        { pattern: /for\s*\(\s*(?:let|const|var)?\s*(\w+)\s*[=;]/, varIndex: 1 },
        { pattern: /for\s*\(\s*(\w+)\s+of/, varIndex: 1 },
        { pattern: /for\s*\(\s*(\w+)\s+in/, varIndex: 1 },
        { pattern: /while\s*\(([^)]+)\)/, varIndex: null }
      ]
    }
  };

  // Enhanced algorithm detection patterns
  const algorithmPatterns = {
    sorting: {
      keywords: ['sort', 'bubble', 'quick', 'merge', 'insertion', 'selection', 'heap'],
      type: 'comparison',
      complexity: 'O(n log n)',
      loopIntensive: true
    },
    searching: {
      keywords: ['search', 'binary', 'linear', 'dfs', 'bfs', 'dijkstra'],
      type: 'search',
      complexity: 'O(log n)',
      loopIntensive: true
    },
    dp: {
      keywords: ['dp', 'dynamic', 'memoization', 'fibonacci', 'knapsack'],
      type: 'dynamic',
      complexity: 'O(n^2)',
      loopIntensive: true
    },
    graph: {
      keywords: ['graph', 'node', 'edge', 'adjacency', 'shortest path', 'traversal'],
      type: 'graph',
      complexity: 'O(V + E)',
      loopIntensive: true
    },
    tree: {
      keywords: ['tree', 'node', 'binary', 'bst', 'avl', 'traversal'],
      type: 'tree',
      complexity: 'O(log n)',
      loopIntensive: true
    }
  };

  // Enhanced algorithm detection
  const detectAlgorithm = (code) => {
    const codeLower = code.toLowerCase();
    let detected = [];
    
    for (const [algo, pattern] of Object.entries(algorithmPatterns)) {
      const matches = pattern.keywords.filter(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(codeLower);
      });
      
      if (matches.length > 0) {
        detected.push({
          name: algo,
          type: pattern.type,
          complexity: pattern.complexity,
          confidence: matches.length,
          loopIntensive: pattern.loopIntensive,
          matchedKeywords: matches
        });
      }
    }
    
    return detected.length > 0 ? detected.sort((a, b) => b.confidence - a.confidence)[0] : null;
  };

  // Enhanced parse code function
  const parseCode = (code, language) => {
    const lines = code.split('\n').map((line, index) => {
      const trimmed = line.trim();
      const lineObj = {
        id: index,
        lineNumber: index + 1,
        content: line,
        indent: line.search(/\S/),
        type: determineLineType(line, language),
        isExecutable: isLineExecutable(line, language),
        isLoopLine: isLoopLine(line, language),
        loopDepth: 0
      };
      
      // Detect loops and extract loop variables
      if (lineObj.isLoopLine) {
        const loopVars = extractLoopVariables(line, language);
        if (loopVars.length > 0) {
          lineObj.loopVariables = loopVars;
        }
      }
      
      return lineObj;
    });
    
    // Calculate loop depth
    let currentDepth = 0;
    const loopStack = [];
    
    lines.forEach((line, index) => {
      if (line.isLoopLine) {
        currentDepth++;
        loopStack.push({ line: index, depth: currentDepth });
        line.loopDepth = currentDepth;
      } else if (line.content.includes('}') || line.content.includes('end') || line.content.trim().endsWith(':')) {
        // Check if we're ending a loop
        if (loopStack.length > 0 && loopStack[loopStack.length - 1].depth === currentDepth) {
          loopStack.pop();
          currentDepth = Math.max(0, currentDepth - 1);
        }
      }
      line.loopDepth = currentDepth;
    });
    
    return {
      lines,
      functions: extractFunctions(code, language),
      variables: extractVariables(code, language),
      complexity: estimateComplexity(code, language),
      loops: detectLoops(code, language)
    };
  };

  const isLoopLine = (line, language) => {
    const trimmed = line.trim();
    const patterns = languages[language]?.loopPatterns || [];
    
    return patterns.some(pattern => pattern.pattern.test(trimmed));
  };

  const extractLoopVariables = (line, language) => {
    const trimmed = line.trim();
    const patterns = languages[language]?.loopPatterns || [];
    const variables = [];
    
    patterns.forEach(pattern => {
      const match = trimmed.match(pattern.pattern);
      if (match && pattern.varIndex !== null) {
        const varName = match[pattern.varIndex];
        if (varName) {
          variables.push(varName);
        }
      }
    });
    
    return variables;
  };

  const detectLoops = (code, language) => {
    const lines = code.split('\n');
    const loops = [];
    let loopId = 0;
    
    lines.forEach((line, index) => {
      if (isLoopLine(line, language)) {
        const loopVars = extractLoopVariables(line, language);
        loops.push({
          id: loopId++,
          startLine: index + 1,
          endLine: findLoopEnd(lines, index, language),
          variables: loopVars,
          iterations: 0,
          content: line.trim()
        });
      }
    });
    
    return loops;
  };

  const findLoopEnd = (lines, startIndex, language) => {
    let braceCount = 0;
    let indentLevel = lines[startIndex].search(/\S/);
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Count braces for languages that use them
      if (language === 'cpp' || language === 'java' || language === 'javascript') {
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        braceCount += openBraces - closeBraces;
        
        if (braceCount === 0 && i > startIndex) {
          return i + 1;
        }
      } else if (language === 'python') {
        // Python uses indentation
        const currentIndent = line.search(/\S/);
        if (i > startIndex && currentIndent <= indentLevel && line.trim() !== '') {
          return i;
        }
      }
    }
    
    return lines.length;
  };

  const determineLineType = (line, language) => {
    const trimmed = line.trim();
    
    // Enhanced type detection
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return 'comment';
    if (trimmed.startsWith('import ') || trimmed.startsWith('#include')) return 'import';
    if (trimmed.includes('class ') || trimmed.includes('struct ')) return 'definition';
    if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=')) return 'assignment';
    if (trimmed.includes('if(') || trimmed.includes('if ') || trimmed.includes('if:')) return 'conditional';
    if (isLoopLine(line, language)) return 'loop';
    if (trimmed.includes('return')) return 'return';
    if (trimmed.includes('cout') || trimmed.includes('printf') || trimmed.includes('print(')) return 'output';
    if (trimmed.includes('cin') || trimmed.includes('scanf') || trimmed.includes('input(')) return 'input';
    if (trimmed.includes('function') || trimmed.includes('def ')) return 'function';
    
    return 'execution';
  };

  const isLineExecutable = (line, language) => {
    const trimmed = line.trim();
    if (trimmed === '') return false;
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return false;
    if (trimmed.startsWith('import ') || trimmed.startsWith('#include')) return false;
    if (trimmed.startsWith('using ') || trimmed.startsWith('package ')) return false;
    if (trimmed.startsWith('import ')) return false;
    
    return true;
  };

  // Enhanced variable extraction
  const extractVariables = (code, language) => {
    const variables = {};
    const lines = code.split('\n');
    
    const patterns = {
      cpp: /(int|float|double|char|bool|string|auto|long|short|unsigned)\s+(\w+)\s*(?:=\s*([^;]+))?[^=]/g,
      java: /(int|float|double|char|boolean|String|byte|short|long)\s+(\w+)\s*(?:=\s*([^;]+))?[^=]/g,
      python: /(\b\w+\b)\s*=\s*([^#\n]+)(?:#.*)?/g,
      javascript: /(?:const|let|var)\s+(\w+)\s*=\s*([^;]+)/g
    };
    
    lines.forEach((line, index) => {
      const pattern = patterns[language];
      if (!pattern) return;
      
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const varName = match[2] || match[1];
        const value = match[3] || match[2] || 'undefined';
        const type = match[1] || 'auto';
        
        // Skip function definitions
        if (line.includes('(') && line.includes(')') && !line.includes('=')) {
          continue;
        }
        
        variables[varName] = {
          name: varName,
          type: type,
          value: value.trim().replace(/;.*$/, ''), // Remove trailing semicolon
          line: index + 1,
          scope: determineScope(index, lines, language),
          isLoopVariable: /^(i|j|k|index|idx|count|counter|n|m|iterator|iter|temp|tmp)$/i.test(varName),
          history: []
        };
      }
    });
    
    return variables;
  };

  const determineScope = (lineIndex, lines, language) => {
    let scope = 'global';
    let braceCount = 0;
    let inFunction = false;
    let inClass = false;
    
    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Track braces
      if (language === 'cpp' || language === 'java' || language === 'javascript') {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
      }
      
      // Track functions
      if (trimmed.includes('main(') || trimmed.includes('def ') || 
          trimmed.includes('function ') || trimmed.match(/^\w+\s+\w+\s*\(/)) {
        if (braceCount === 0 || trimmed.includes('main(')) {
          inFunction = true;
          scope = 'function';
        }
      }
      
      // Track classes
      if (trimmed.includes('class ') || trimmed.includes('struct ')) {
        inClass = true;
        scope = 'class';
      }
      
      // Adjust scope based on context
      if (inClass && braceCount > 0) {
        scope = 'class';
      } else if (inFunction && braceCount > 0) {
        scope = 'function';
      } else if (braceCount === 0) {
        scope = 'global';
        inFunction = false;
        inClass = false;
      }
    }
    
    return scope;
  };

  const estimateComplexity = (code, language) => {
    const lines = code.toLowerCase().split('\n');
    let complexity = 'O(1)';
    
    // Enhanced complexity estimation
    const nestedLoopCount = (code.match(/for[^{]*\{[^}]*for|while[^{]*\{[^}]*for|for[^{]*\{[^}]*while/g) || []).length;
    const recursionCount = (code.match(/\w+\([^)]*\)[^{]*\{[^}]*\w+\(/g) || []).length;
    const loopCount = (code.match(/\b(for|while)\b/g) || []).length;
    
    if (nestedLoopCount >= 2) {
      complexity = 'O(n³)';
    } else if (nestedLoopCount === 1) {
      complexity = 'O(n²)';
    } else if (recursionCount > 0) {
      complexity = 'O(2ⁿ)';
    } else if (loopCount > 0) {
      complexity = 'O(n)';
    }
    
    return complexity;
  };

  // Initialize code parsing with enhanced tracking
  useEffect(() => {
    if (code.trim()) {
      const parsed = parseCode(code, selectedLanguage);
      const algo = detectAlgorithm(code);
      
      setAlgorithmInfo({
        ...algo,
        parsedCode: parsed
      });
      
      // Initialize variables from parsed code
      setVariables(parsed.variables);
      
      // Initialize loop tracker
      if (parsed.loops && parsed.loops.length > 0) {
        const iterations = {};
        parsed.loops.forEach(loop => {
          iterations[loop.id] = { count: 0, currentIteration: 0, variables: {} };
        });
        setLoopTracker(prev => ({
          ...prev,
          iterations
        }));
      }
    }
  }, [code, selectedLanguage]);

  // Enhanced simulate execution with better loop tracking
  const simulateExecution = () => {
    const lines = code.split('\n');
    const trace = [];
    const variablesState = { ...variables };
    const heap = [];
    const output = [];
    const callStack = ['main'];
    const loopIterations = {};
    let loopStack = [];
    
    let lineIndex = 0;
    let step = 0;
    let iterationCount = 0;
    
    // Track loop variables across the entire execution
    const updateLoopTracker = (lineIndex, variables) => {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      // Check if this line starts a loop
      if (isLoopLine(line, selectedLanguage)) {
        const loopVars = extractLoopVariables(line, selectedLanguage);
        if (loopVars.length > 0) {
          const loopId = `${lineIndex}_${trimmed}`;
          if (!loopIterations[loopId]) {
            loopIterations[loopId] = { count: 0, variables: {} };
            loopStack.push(loopId);
          }
          
          loopIterations[loopId].count++;
          iterationCount++;
          
          // Record loop variable values
          loopVars.forEach(varName => {
            if (variables[varName]) {
              loopIterations[loopId].variables[varName] = variables[varName].value;
              
              // Add loop iteration output
              output.push(`[Loop ${loopStack.length}.${loopIterations[loopId].count}] ${varName} = ${variables[varName].value}`);
            }
          });
        }
      }
      
      // Check if we're ending a loop
      if (trimmed === '}' && loopStack.length > 0) {
        loopStack.pop();
      }
    };
    
    // Enhanced simulation loop
    while (lineIndex < lines.length && step < 1000) { // Increased step limit
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        lineIndex++;
        continue;
      }
      
      // Update loop tracking
      updateLoopTracker(lineIndex, variablesState);
      
      // Simulate variable assignments with better expression evaluation
      if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('!=')) {
        const assignmentMatch = trimmed.match(/(\w+)\s*=\s*([^;]+)/);
        if (assignmentMatch) {
          const varName = assignmentMatch[1];
          const expression = assignmentMatch[2].replace(/;$/, '');
          const value = evaluateExpression(expression, variablesState);
          
          // Check if this is a loop variable
          const isLoopVar = /^(i|j|k|index|idx|count|counter|n|m|iterator|iter)$/i.test(varName);
          
          // Update variable state
          variablesState[varName] = {
            ...(variablesState[varName] || {}),
            name: varName,
            value: value,
            type: variablesState[varName]?.type || 'auto',
            line: lineIndex + 1,
            scope: variablesState[varName]?.scope || 'local',
            isLoopVariable: isLoopVar,
            lastModified: step
          };
          
          // Add to variable history
          if (variablesState[varName].history) {
            variablesState[varName].history.push({ step, value });
          } else {
            variablesState[varName].history = [{ step, value }];
          }
          
          // Output for significant changes
          if (isLoopVar || Math.abs(value) > 0) {
            const change = isLoopVar ? 'Loop var' : 'Variable';
            output.push(`${change} ${varName} = ${value}`);
          }
        }
      }
      
      // Enhanced output simulation
      if (trimmed.includes('cout') || trimmed.includes('printf') || trimmed.includes('print')) {
        let outputValue = '';
        let outputExpression = '';
        
        if (trimmed.includes('cout')) {
          const coutMatches = trimmed.match(/<<\s*([^<]+)/g);
          if (coutMatches) {
            const expressions = coutMatches.map(match => match.replace('<<', '').trim());
            outputExpression = expressions.join(' ');
            outputValue = expressions.map(expr => evaluateExpression(expr, variablesState)).join(' ');
          }
        } else if (trimmed.includes('printf')) {
          const printfMatch = trimmed.match(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\)/);
          if (printfMatch) {
            const format = printfMatch[1];
            const args = printfMatch[2] || '';
            outputExpression = args;
            outputValue = args.split(',').map(arg => evaluateExpression(arg.trim(), variablesState)).join(' ');
          }
        } else if (trimmed.includes('print')) {
          const printMatch = trimmed.match(/print\s*\(\s*([^)]+)\s*\)/);
          if (printMatch) {
            outputExpression = printMatch[1];
            outputValue = evaluateExpression(printMatch[1], variablesState);
          }
        }
        
        if (outputValue) {
          output.push(`Output: ${outputValue}`);
        }
      }
      
      // Create trace entry with enhanced loop information
      const traceEntry = {
        step,
        line: lineIndex + 1,
        type: determineLineType(line, selectedLanguage),
        variables: JSON.parse(JSON.stringify(variablesState)), // Deep clone
        output: [...output],
        stack: [...callStack],
        description: getStepDescription(line, lineIndex + 1, variablesState),
        loopInfo: {
          currentLoops: [...loopStack],
          iterationCount,
          loopVariables: getLoopVariables(lineIndex + 1, variablesState)
        }
      };
      
      trace.push(traceEntry);
      
      // Increment line index based on control flow
      if (trimmed.includes('break')) {
        // Find the end of the current loop
        let braceCount = 0;
        for (let i = lineIndex; i < lines.length; i++) {
          if (lines[i].includes('{')) braceCount++;
          if (lines[i].includes('}')) {
            braceCount--;
            if (braceCount === 0) {
              lineIndex = i;
              break;
            }
          }
        }
      } else if (trimmed.includes('continue')) {
        // Find the next iteration
        lineIndex++;
        continue;
      }
      
      lineIndex++;
      step++;
    }
    
    return { 
      trace, 
      variables: variablesState, 
      heap, 
      output, 
      callStack,
      loopIterations,
      totalIterations: iterationCount
    };
  };

  const evaluateExpression = (expr, variables) => {
    try {
      let evaluated = expr.trim();
      
      // Replace variable names with their values
      Object.entries(variables).forEach(([name, data]) => {
        if (data && data.value !== undefined) {
          const regex = new RegExp(`\\b${name}\\b`, 'g');
          evaluated = evaluated.replace(regex, data.value);
        }
      });
      
      // Clean up the expression
      evaluated = evaluated.replace(/[^0-9+\-*/().><=!&|^% ]/g, '');
      
      if (evaluated.trim()) {
        try {
          return Function(`"use strict"; return (${evaluated})`)();
        } catch {
          return expr;
        }
      }
      
      return expr;
    } catch {
      return expr;
    }
  };

  const getStepDescription = (line, lineNumber, variables) => {
    const trimmed = line.trim();
    
    if (isLoopLine(line, selectedLanguage)) {
      const loopVars = extractLoopVariables(line, selectedLanguage);
      if (loopVars.length > 0) {
        const varValues = loopVars.map(varName => {
          const varData = variables[varName];
          return varData ? `${varName}=${varData.value}` : varName;
        }).join(', ');
        return `Loop iteration at line ${lineNumber} (${varValues})`;
      }
      return `Loop at line ${lineNumber}`;
    }
    
    if (trimmed.includes('if')) {
      return `Condition check at line ${lineNumber}`;
    }
    
    if (trimmed.includes('=')) {
      return `Variable assignment at line ${lineNumber}`;
    }
    
    return `Executing line ${lineNumber}`;
  };

  const getLoopVariables = (lineNumber, variables) => {
    const loopVars = {};
    Object.entries(variables).forEach(([name, data]) => {
      if (data && data.isLoopVariable) {
        loopVars[name] = data.value;
      }
    });
    return loopVars;
  };

  // Enhanced Python execution with better loop tracking
  const executePythonCode = async () => {
    try {
      const py = pyodideRef.current;
      if (!py) {
        setOutputLog([{ step: 0, value: 'Pyodide not loaded yet', line: 0 }]);
        return;
      }
      
      // Load required packages
      await py.loadPackagesFromImports(code);
      
      // Set up input/output
      py.runPython(`
import sys
import inspect
from io import StringIO

sys.stdin = StringIO('''${stdinInput.replace(/'/g, "\\'")}''')
sys.stdout = StringIO()
sys.stderr = StringIO()

trace = []
output_lines = []
loop_iterations = {}
current_loop_stack = []
iteration_counter = 0

original_print = print
def traced_print(*args, **kwargs):
    frame = inspect.currentframe().f_back
    line_no = frame.f_lineno if frame else 0
    output_str = ' '.join(map(str, args))
    output_lines.append({'line': line_no, 'output': output_str, 'type': 'output'})
    original_print(*args, **kwargs)

__builtins__['print'] = traced_print

def add_trace(frame, event_type='line'):
    try:
        locals_copy = {k: str(v) for k, v in frame.f_locals.items() if not k.startswith('__')}
        globals_copy = {k: str(v) for k, v in frame.f_globals.items() if not k.startswith('__') 
                       and k not in ['trace', 'output_lines', 'loop_iterations', 'current_loop_stack', 
                                     'iteration_counter', 'add_trace', 'traced_print', 'original_print']}
        
        # Track loop variables
        loop_vars = {}
        for var_name, var_value in {**globals_copy, **locals_copy}.items():
            if var_name in ['i', 'j', 'k', 'index', 'idx', 'count', 'counter', 'n', 'm', 'iterator', 'iter', 'temp', 'tmp']:
                loop_vars[var_name] = var_value
                
                # Add loop variable output
                if event_type == 'loop_iteration':
                    output_lines.append({
                        'line': frame.f_lineno,
                        'output': f'[Loop {len(current_loop_stack)}.{iteration_counter}] {var_name} = {var_value}',
                        'type': 'loop_var'
                    })
        
        # Track stack
        stack = []
        current = frame
        while current:
            stack.append(current.f_code.co_name)
            current = current.f_back
        stack.reverse()
        
        trace.append({
            'line': frame.f_lineno,
            'variables': {**globals_copy, **locals_copy},
            'stack': stack,
            'loop_vars': loop_vars,
            'current_loops': list(current_loop_stack),
            'iteration_counter': iteration_counter
        })
    except Exception as e:
        pass

def custom_tracer(frame, event, arg):
    if event == 'line':
        # Check if this is a loop line
        code_line = frame.f_code.co_filename
        if hasattr(frame, 'f_code') and hasattr(frame.f_code, 'co_firstlineno'):
            # Check for loop patterns in current line
            try:
                import linecache
                line_text = linecache.getline(code_line, frame.f_lineno).strip()
                
                # Simple loop detection
                if line_text.startswith('for ') or line_text.startswith('while '):
                    loop_id = f"{frame.f_lineno}_{line_text[:50]}"
                    if loop_id not in current_loop_stack:
                        current_loop_stack.append(loop_id)
                        iteration_counter = 1
                    else:
                        iteration_counter = loop_iterations.get(loop_id, 0) + 1
                    
                    loop_iterations[loop_id] = iteration_counter
                    add_trace(frame, 'loop_iteration')
                elif line_text == 'pass' and len(current_loop_stack) > 0:
                    # Inside a loop
                    iteration_counter += 1
                    add_trace(frame, 'loop_iteration')
                else:
                    add_trace(frame, 'line')
                    
                # Check for loop end
                if line_text and line_text[0] not in [' ', '\\t'] and len(current_loop_stack) > 0:
                    # Probably ending a loop
                    current_loop_stack.pop()
                    
            except:
                add_trace(frame, 'line')
        else:
            add_trace(frame, 'line')
    return custom_tracer

sys.settrace(custom_tracer)
      `);
      
      // Run user code
      await py.runPythonAsync(code);
      
      // Disable trace
      py.runPython(`sys.settrace(None)`);
      
      // Check for errors
      const stderr = py.runPython('sys.stderr.getvalue()');
      if (stderr) {
        setOutputLog([{ step: 0, value: `Error: ${stderr}`, line: 0 }]);
        return;
      }
      
      const trace_js = py.runPython('trace').toJs({ dict_converter: Object.fromEntries });
      const output_lines_js = py.runPython('output_lines').toJs({ dict_converter: Object.fromEntries });
      const loop_iterations_js = py.runPython('loop_iterations').toJs({ dict_converter: Object.fromEntries });
      
      // Process trace
      let processed_trace = [];
      let cumulative_output = [];
      let loop_iteration_counter = 0;
      
      trace_js.forEach((step, i) => {
        // Collect outputs for this step
        const stepOutputs = output_lines_js.filter(out => out.line === step.line);
        stepOutputs.forEach(out => {
          if (!cumulative_output.includes(out.output)) {
            cumulative_output.push(out.output);
          }
        });
        
        processed_trace.push({
          step: i,
          line: step.line,
          variables: step.variables,
          stack: step.stack,
          output: [...cumulative_output],
          description: step.loop_vars && Object.keys(step.loop_vars).length > 0 
            ? `Loop iteration at line ${step.line} (${Object.entries(step.loop_vars).map(([k, v]) => `${k}=${v}`).join(', ')})`
            : `Executing line ${step.line}`,
          loopInfo: {
            currentLoops: step.current_loops || [],
            iterationCount: step.iteration_counter || 0,
            loopVariables: step.loop_vars || {}
          }
        });
        
        if (step.loop_vars && Object.keys(step.loop_vars).length > 0) {
          loop_iteration_counter++;
        }
      });
      
      setExecutionTrace(processed_trace);
      setExecutionState(prev => ({
        ...prev,
        totalIterations: loop_iteration_counter
      }));
      
      executeStepByStep(processed_trace);
      
    } catch (err) {
      setOutputLog([{ step: 0, value: `Execution error: ${err.message}`, line: 0 }]);
    }
  };

  const executeJavascriptCode = () => {
    if (!jsInterpreterLoaded.current) {
      setOutputLog([{ step: 0, value: 'JS Interpreter not loaded', line: 0 }]);
      return;
    }
    
    try {
      const trace = [];
      const output_lines = [];
      const inputLines = stdinInput.split('\n');
      let inputIndex = 0;
      let loop_iterations = {};
      let current_loop_stack = [];
      let iteration_counter = 0;
      
      const initFunc = function(interpreter, globalObject) {
        const consoleWrapper = interpreter.createObject(interpreter.OBJECT);
        interpreter.setProperty(globalObject, 'console', consoleWrapper);
        
        const logFunc = function(...args) {
          const state = interpreter.stateStack[interpreter.stateStack.length - 1];
          const line = state.node && state.node.loc ? state.node.loc.start.line : 0;
          const outputStr = args.map(arg => interpreter.pseudoToNative(arg)).join(' ');
          output_lines.push({line, output: outputStr, type: 'output'});
        };
        interpreter.setProperty(consoleWrapper, 'log', interpreter.createNativeFunction(logFunc));
        
        const readLineFunc = function() {
          return inputLines[inputIndex++] || '';
        };
        interpreter.setProperty(globalObject, 'readLine', interpreter.createNativeFunction(readLineFunc));
      };
      
      const interpreter = new JSInterpreter(code, initFunc);
      
      let stepCount = 0;
      let cumulative_output = [];
      
      // Helper to extract loop information
      const extractLoopInfo = (interpreter) => {
        const scope = interpreter.getScope();
        const loopVars = {};
        
        for (let prop in scope.properties) {
          if (!prop.startsWith('_')) {
            const nativeValue = interpreter.pseudoToNative(scope.properties[prop]);
            const value = String(nativeValue);
            
            // Check for loop variables
            if (/^(i|j|k|index|idx|count|counter|n|m|iterator|iter)$/i.test(prop)) {
              loopVars[prop] = value;
              
              // Get current line
              const state = interpreter.stateStack[interpreter.stateStack.length - 1];
              const line = state.node && state.node.loc ? state.node.loc.start.line : 0;
              
              // Add loop variable output
              if (current_loop_stack.length > 0) {
                const loop_id = current_loop_stack[current_loop_stack.length - 1];
                const loop_count = loop_iterations[loop_id] || 0;
                output_lines.push({
                  line,
                  output: `[Loop ${current_loop_stack.length}.${loop_count + 1}] ${prop} = ${value}`,
                  type: 'loop_var'
                });
              }
            }
          }
        }
        
        return loopVars;
      };
      
      while (interpreter.step() && stepCount < 5000) {
        const state = interpreter.stateStack[interpreter.stateStack.length - 1];
        if (!state || !state.node) continue;
        
        const line = state.node.loc ? state.node.loc.start.line : 0;
        const nodeType = state.node.type;
        
        // Detect loops
        if (nodeType === 'ForStatement' || nodeType === 'WhileStatement' || nodeType === 'DoWhileStatement') {
          const loop_id = `${line}_${nodeType}`;
          if (!current_loop_stack.includes(loop_id)) {
            current_loop_stack.push(loop_id);
          }
          if (!loop_iterations[loop_id]) {
            loop_iterations[loop_id] = 0;
          }
          loop_iterations[loop_id]++;
          iteration_counter++;
        }
        
        // Extract variables
        const scope = interpreter.getScope();
        const variables = {};
        const loopVars = extractLoopInfo(interpreter);
        
        for (let prop in scope.properties) {
          if (!prop.startsWith('_')) {
            const nativeValue = interpreter.pseudoToNative(scope.properties[prop]);
            const value = String(nativeValue);
            variables[prop] = value;
          }
        }
        
        // Build stack trace
        let stack = [];
        let currentScope = scope;
        while (currentScope) {
          const funcName = currentScope.function && currentScope.function.node && currentScope.function.node.id 
            ? currentScope.function.node.id.name 
            : '<anonymous>';
          stack.push(funcName === '<anonymous>' ? '<global>' : funcName);
          currentScope = currentScope.parent;
        }
        stack.reverse();
        
        // Collect outputs for this line
        const stepOutputs = output_lines.filter(out => out.line === line);
        stepOutputs.forEach(out => {
          if (!cumulative_output.includes(out.output)) {
            cumulative_output.push(out.output);
          }
        });
        
        // Create trace entry
        trace.push({
          step: stepCount,
          line,
          variables,
          stack,
          output: [...cumulative_output],
          description: Object.keys(loopVars).length > 0
            ? `Loop iteration at line ${line} (${Object.entries(loopVars).map(([k, v]) => `${k}=${v}`).join(', ')})`
            : `Executing line ${line}`,
          loopInfo: {
            currentLoops: [...current_loop_stack],
            iterationCount: iteration_counter,
            loopVariables: loopVars
          }
        });
        
        // Check for loop end
        if (nodeType === 'BlockStatement' && state.node.body && state.node.body.length === 0) {
          // Possibly ending a loop
          if (current_loop_stack.length > 0) {
            current_loop_stack.pop();
          }
        }
        
        stepCount++;
      }
      
      setExecutionTrace(trace);
      setExecutionState(prev => ({
        ...prev,
        totalIterations: iteration_counter
      }));
      
      executeStepByStep(trace);
      
    } catch (err) {
      setOutputLog([{ step: 0, value: `Execution error: ${err.message}`, line: 0 }]);
    }
  };

  // Enhanced execution control
  const toggleExecution = () => {
    if (executionState.isRunning) {
      pauseExecution();
    } else {
      startExecution();
    }
  };

  const startExecution = async () => {
    // Reset state
    resetExecution();
    
    setExecutionState(prev => ({ 
      ...prev, 
      isRunning: true, 
      currentLine: 0, 
      stepCount: 0,
      iteration: 0
    }));
    
    setOutputLog([]);
    
    if (languages[selectedLanguage].executionSupported) {
      if (selectedLanguage === 'python') {
        await executePythonCode();
      } else if (selectedLanguage === 'javascript') {
        executeJavascriptCode();
      }
    } else {
      const { trace, totalIterations } = simulateExecution();
      setExecutionTrace(trace);
      setExecutionState(prev => ({
        ...prev,
        totalIterations
      }));
      executeStepByStep(trace);
    }
  };

  const pauseExecution = () => {
    if (executionInterval.current) {
      clearInterval(executionInterval.current);
      executionInterval.current = null;
    }
    
    setExecutionState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true
    }));
  };

  const executeStepByStep = (trace) => {
    if (trace.length === 0) return;
    
    let currentStep = 0;
    
    executionInterval.current = setInterval(() => {
      if (currentStep >= trace.length) {
        pauseExecution();
        setExecutionState(prev => ({ ...prev, isRunning: false }));
        return;
      }
      
      const step = trace[currentStep];
      
      setExecutionState(prev => ({
        ...prev,
        currentLine: step.line,
        stepCount: currentStep,
        iteration: step.loopInfo?.iterationCount || prev.iteration
      }));
      
      setVariables(step.variables);
      setCallStack(step.stack || []);
      
      // Format output log with loop information
      const formattedOutput = step.output.map((v, i) => ({ 
        step: i, 
        value: v, 
        line: step.line,
        isLoopVar: typeof v === 'string' && (
          v.includes('[Loop') || 
          v.startsWith('Loop var') || 
          /^(i|j|k|index|idx|count|counter|n|m)=/.test(v.split('=')[0]?.trim())
        )
      }));
      setOutputLog(formattedOutput);
      
      // Update loop tracker
      if (step.loopInfo && step.loopInfo.currentLoops.length > 0) {
        setLoopTracker(prev => {
          const newIterations = { ...prev.iterations };
          step.loopInfo.currentLoops.forEach((loopId, index) => {
            if (!newIterations[loopId]) {
              newIterations[loopId] = { count: 0, currentIteration: 0 };
            }
            newIterations[loopId].count++;
            newIterations[loopId].currentIteration = step.loopInfo.iterationCount;
          });
          return { ...prev, iterations: newIterations };
        });
      }
      
      currentStep++;
    }, 1000 / executionState.speed);
  };

  const resetExecution = () => {
    if (executionInterval.current) {
      clearInterval(executionInterval.current);
      executionInterval.current = null;
    }
    
    setExecutionState({
      isRunning: false,
      isPaused: false,
      currentLine: 0,
      speed: 1,
      stepCount: 0,
      iteration: 0,
      totalIterations: 0
    });
    
    setVariables({});
    setCallStack([]);
    setMemoryHeap([]);
    setOutputLog([]);
    setExecutionTrace([]);
    setLoopTracker({
      currentLoops: [],
      iterations: {},
      maxIterations: 1000
    });
    
    traceIndexRef.current = 0;
    loopCountersRef.current = {};
  };

  const handleCodePaste = (event) => {
    const pastedCode = event.clipboardData.getData('text');
    setCode(pastedCode);
    detectLanguageFromCode(pastedCode);
  };

  const detectLanguageFromCode = (code) => {
    const codeLower = code.toLowerCase();
    
    if (codeLower.includes('#include') || codeLower.includes('using namespace')) {
      setSelectedLanguage('cpp');
    } else if (codeLower.includes('def ') || codeLower.includes('import ') || codeLower.includes('print(')) {
      setSelectedLanguage('python');
    } else if (codeLower.includes('public class') || codeLower.includes('static void main')) {
      setSelectedLanguage('java');
    } else if (codeLower.includes('function') || codeLower.includes('const ') || codeLower.includes('let ')) {
      setSelectedLanguage('javascript');
    }
  };

  // Enhanced visualization renderers
  const renderAlgorithmVisualization = () => {
    if (visualizationType === 'table') {
      return renderTableVisualization();
    }
    
    if (!algorithmInfo && executionTrace.length === 0) {
      return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-lg mb-4">Visualization</h3>
          <div className="text-gray-600 italic">
            Paste or load code, then run it to see visualization. Select "Line-by-Line Table" for detailed execution view.
          </div>
        </div>
      );
    }
    
    switch (visualizationType) {
      case 'memory':
        return renderMemoryVisualization();
      case 'graph':
        return renderGraphVisualization();
      case 'tree':
        return renderTreeVisualization();
      case 'flow':
      default:
        return renderExecutionFlowVisualization();
    }
  };

  const renderExecutionFlowVisualization = () => {
    const currentStep = executionState.stepCount;
    const visibleSteps = executionTrace.slice(
      Math.max(0, currentStep - 4),
      Math.min(currentStep + 5, executionTrace.length)
    );
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Execution Flow</h3>
        <div className="space-y-2">
          {visibleSteps.map((step, index) => {
            const isCurrent = step.step === currentStep;
            const isLoopStep = step.loopInfo && Object.keys(step.loopInfo.loopVariables).length > 0;
            
            return (
              <div
                key={index}
                className={`p-3 rounded border ${
                  isCurrent
                    ? 'bg-[#001F3F] text-white border-[#001F3F]'
                    : isLoopStep
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Line {step.line}</span>
                    {isLoopStep && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Loop
                      </span>
                    )}
                  </div>
                  <span className={isCurrent ? "text-white" : "text-gray-600"}>
                    Step {step.step}
                  </span>
                </div>
                <div className={`text-xs mt-1 ${isCurrent ? "text-blue-200" : "text-gray-600"}`}>
                  {step.description}
                </div>
                {isLoopStep && step.loopInfo.loopVariables && (
                  <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-30">
                    <div className="text-xs font-medium mb-1">Loop Variables:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(step.loopInfo.loopVariables).map(([key, value]) => (
                        <div key={key} className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs">
                          {key} = {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {executionTrace.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing step {Math.max(0, currentStep - 4)} to {Math.min(currentStep + 4, executionTrace.length - 1)} of {executionTrace.length} total steps
          </div>
        )}
      </div>
    );
  };

  const renderMemoryVisualization = () => {
    const loopVariables = Object.entries(variables).filter(([_, data]) => 
      data && data.isLoopVariable
    );
    
    const regularVariables = Object.entries(variables).filter(([_, data]) => 
      data && !data.isLoopVariable
    );
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Memory Visualization</h3>
        
        {loopVariables.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-blue-700 mb-3">Loop Variables</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {loopVariables.map(([name, data]) => (
                <div key={name} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-medium text-blue-800">{name}</div>
                      <div className="text-xs text-blue-600">{data.type} · Line {data.line}</div>
                    </div>
                    <div className="font-mono bg-white px-3 py-1 rounded text-sm text-blue-800 font-bold">
                      {data.value}
                    </div>
                  </div>
                  {data.history && data.history.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600">
                      Changes: {data.history.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {regularVariables.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Other Variables</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {regularVariables.map(([name, data]) => (
                <div key={name} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-medium text-gray-800">{name}</div>
                      <div className="text-xs text-gray-600">{data.type} · Line {data.line}</div>
                    </div>
                    <div className="font-mono bg-white px-3 py-1 rounded text-sm text-gray-800">
                      {data.value}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Scope: {data.scope}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {Object.keys(variables).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No variables in memory yet. Run the code to see variables.
          </div>
        )}
      </div>
    );
  };

  const renderTableVisualization = () => {
    const codeLines = code.split('\n');
    const lineExecutions = {};
    const lineOutputs = {};
    const lineLoopVars = {};
    const lineTypes = {};
    
    // Process execution trace
    executionTrace.forEach(step => {
      const lineNum = step.line;
      
      if (!lineExecutions[lineNum]) {
        lineExecutions[lineNum] = 0;
        lineOutputs[lineNum] = [];
        lineLoopVars[lineNum] = [];
      }
      
      lineExecutions[lineNum]++;
      
      // Collect outputs
      if (step.output) {
        step.output.forEach(out => {
          if (!lineOutputs[lineNum].includes(out)) {
            lineOutputs[lineNum].push(out);
          }
        });
      }
      
      // Collect loop variables
      if (step.loopInfo && step.loopInfo.loopVariables) {
        Object.entries(step.loopInfo.loopVariables).forEach(([name, value]) => {
          const loopVarStr = `${name}=${value}`;
          if (!lineLoopVars[lineNum].includes(loopVarStr)) {
            lineLoopVars[lineNum].push(loopVarStr);
          }
        });
      }
      
      // Determine line type
      if (step.loopInfo && Object.keys(step.loopInfo.loopVariables).length > 0) {
        lineTypes[lineNum] = 'loop';
      } else if (step.description && step.description.includes('Condition')) {
        lineTypes[lineNum] = 'conditional';
      } else if (step.description && step.description.includes('assignment')) {
        lineTypes[lineNum] = 'assignment';
      } else if (step.description && step.description.includes('Output')) {
        lineTypes[lineNum] = 'output';
      }
    });
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Line-by-Line Execution Table</h3>
          <div className="text-sm text-gray-600">
            Total iterations: {executionState.totalIterations || 0}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-300 px-4 py-2 text-left">Line #</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Executions</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Loop Vars</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Output</th>
              </tr>
            </thead>
            <tbody>
              {codeLines.map((line, index) => {
                const lineNumber = index + 1;
                const executions = lineExecutions[lineNumber] || 0;
                const outputs = lineOutputs[lineNumber] || [];
                const loopVars = lineLoopVars[lineNumber] || [];
                const lineType = lineTypes[lineNumber] || 'normal';
                const isCurrentLine = executionState.currentLine === lineNumber;
                
                // Determine row style
                let rowClass = '';
                if (isCurrentLine) {
                  rowClass = 'bg-[#001F3F] text-white';
                } else if (executions > 0) {
                  if (lineType === 'loop') {
                    rowClass = 'bg-blue-50';
                  } else if (lineType === 'conditional') {
                    rowClass = 'bg-yellow-50';
                  } else if (lineType === 'output') {
                    rowClass = 'bg-green-50';
                  } else {
                    rowClass = 'bg-gray-50';
                  }
                }
                
                // Get type badge
                const getTypeBadge = () => {
                  switch (lineType) {
                    case 'loop':
                      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Loop</span>;
                    case 'conditional':
                      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">If</span>;
                    case 'assignment':
                      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Var</span>;
                    case 'output':
                      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Output</span>;
                    default:
                      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Code</span>;
                  }
                };
                
                return (
                  <tr 
                    key={lineNumber}
                    className={rowClass}
                  >
                    <td className={`border border-gray-300 px-4 py-2 font-mono text-sm font-bold ${isCurrentLine ? 'text-white' : ''}`}>
                      {lineNumber}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 font-mono text-sm whitespace-pre ${isCurrentLine ? 'text-white' : ''}`}>
                      {line || <span className="text-gray-400"> </span>}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 ${isCurrentLine ? 'text-white' : ''}`}>
                      <div className="flex justify-center">
                        {getTypeBadge()}
                      </div>
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-center font-medium ${isCurrentLine ? 'text-white' : ''}`}>
                      {executions > 0 ? (
                        <span className={`px-2 py-1 rounded ${isCurrentLine ? 'bg-blue-500' : 'bg-blue-100 text-blue-800'}`}>
                          {executions}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm max-w-xs ${isCurrentLine ? 'text-white' : ''}`}>
                      {loopVars.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {loopVars.map((varStr, idx) => (
                            <span key={idx} className={`px-2 py-1 rounded ${isCurrentLine ? 'bg-blue-600' : 'bg-blue-100 text-blue-800'}`}>
                              {varStr}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm max-w-xs truncate ${isCurrentLine ? 'text-white' : ''}`} 
                        title={outputs.join('\n')}>
                      {outputs.length > 0 ? (
                        <div className="space-y-1">
                          {outputs.slice(0, 2).map((out, idx) => (
                            <div key={idx} className="truncate">
                              {out}
                            </div>
                          ))}
                          {outputs.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{outputs.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              <span>Loop lines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 rounded"></div>
              <span>Conditional lines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <span>Output lines</span>
            </div>
          </div>
          <div>
            Total lines: {codeLines.length} | Executed lines: {Object.keys(lineExecutions).length}
          </div>
        </div>
      </div>
    );
  };

  const renderGraphVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Execution Graph</h3>
        <div className="h-64 flex items-center justify-center border border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-gray-600">Execution graph visualization</div>
            <div className="text-sm text-gray-500 mt-2">
              Shows control flow and loop relationships
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTreeVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Call Tree Visualization</h3>
        <div className="h-64 flex items-center justify-center border border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🌳</div>
            <div className="text-gray-600">Call tree visualization</div>
            <div className="text-sm text-gray-500 mt-2">
              Shows function calls and execution hierarchy
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setCode(fileContent);
        detectLanguageFromCode(fileContent);
        setVisualizationType('table');
        
        // Auto-start execution for certain file types
        const ext = file.name.split('.').pop().toLowerCase();
        const autoStartLanguages = ['py', 'js', 'cpp', 'java'];
        if (autoStartLanguages.includes(ext) && !executionState.isRunning) {
          setTimeout(() => startExecution(), 500);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExampleLoad = (exampleCode) => {
    setCode(exampleCode);
    setVisualizationType('table');
    setTimeout(() => startExecution(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-black p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Advanced Code Visualizer</h1>
            <p className="text-gray-600">Paste any algorithm code to visualize its execution with detailed loop tracking</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2 border border-black rounded-md focus:ring-2 focus:ring-[#001F3F]"
            >
              {Object.entries(languages).map(([key, lang]) => (
                <option key={key} value={key}>{lang.name}</option>
              ))}
            </select>
            
            <select
              value={visualizationType}
              onChange={(e) => setVisualizationType(e.target.value)}
              className="px-4 py-2 border border-black rounded-md focus:ring-2 focus:ring-[#001F3F]"
            >
              <option value="flow">Execution Flow</option>
              <option value="memory">Memory View</option>
              <option value="graph">Graph View</option>
              <option value="tree">Tree View</option>
              <option value="table">Line-by-Line Table</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Panel - Code Editor */}
        <div className="flex flex-col h-full">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Code Editor</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById('fileInput').click()}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Load File
                  </button>
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    accept=".cpp,.py,.java,.js,.ts,.txt"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <textarea
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPaste={handleCodePaste}
                placeholder={`Paste your ${languages[selectedLanguage].name} code here...

Example loops to try:

1. Simple for loop:
for (int i = 0; i < 5; i++) {
    cout << i << endl;
}

2. Nested loops:
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        cout << i << "," << j << endl;
    }
}

3. While loop:
int i = 0;
while (i < 5) {
    cout << i << endl;
    i++;
}`}
                className="w-full h-full p-6 font-mono text-sm bg-black text-white resize-none focus:outline-none"
                spellCheck="false"
                rows={20}
              />
            </div>
            
            {/* Program Input */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-2">Program Input (stdin)</h3>
              <textarea
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                placeholder="Enter input for the program (one line per input)"
                className="w-full h-24 p-4 font-mono text-sm bg-black text-white rounded-lg focus:outline-none"
                rows="4"
              />
            </div>
            
            {/* Algorithm Detection Info */}
            {algorithmInfo && algorithmInfo.name ? (
              <div className="border-t border-gray-200 p-4 bg-[#001F3F]/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#001F3F]">Detected:</span>
                    <span className="ml-2 px-3 py-1 bg-[#001F3F] text-white rounded-full text-sm">
                      {algorithmInfo.name.toUpperCase()} ALGORITHM
                    </span>
                    <span className="ml-4 text-sm text-gray-600">
                      Complexity: {algorithmInfo.complexity}
                    </span>
                    {algorithmInfo.loopIntensive && (
                      <span className="ml-4 text-sm text-blue-600">
                        ⚡ Loop-intensive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {algorithmInfo.parsedCode?.lines.length || 0} lines, {
                      Object.keys(algorithmInfo.parsedCode?.variables || {}).length
                    } variables
                  </div>
                </div>
              </div>
            ) : code.trim() ? (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <span className="text-sm text-gray-600 italic">
                  Code loaded. Run to analyze execution.
                </span>
              </div>
            ) : null}
          </div>
          
          {/* Control Panel */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleExecution}
                  className={`px-6 py-3 rounded-md font-medium flex items-center gap-2 ${
                    executionState.isRunning
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-[#001F3F] hover:bg-[#001F3F]/80 text-white'
                  }`}
                >
                  {executionState.isRunning ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pause Execution
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Start Execution
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetExecution}
                  className="px-6 py-3 bg-black hover:bg-black/80 text-white rounded-md font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Reset
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm text-gray-600 mr-2">Speed:</label>
                  <select
                    value={executionState.speed}
                    onChange={(e) => setExecutionState(prev => ({ ...prev, speed: Number(e.target.value) }))}
                    className="px-3 py-2 border border-black rounded-md"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <div>
                    Step: {executionState.stepCount} / {executionTrace.length}
                  </div>
                  {executionState.totalIterations > 0 && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {executionState.totalIterations} iterations
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Visualizations */}
        <div className="flex flex-col h-full gap-6">
          {/* Algorithm Visualization */}
          <div className="flex-1">
            {renderAlgorithmVisualization()}
          </div>
          
          {/* Variable Inspector */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Variable Inspector</h2>
              <div className="text-sm text-gray-500">
                {Object.keys(variables).length} variables
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-64">
              {Object.keys(variables).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(variables).map(([name, data]) => {
                    if (!data) return null;
                    
                    return (
                      <div
                        key={name}
                        className={`p-3 border rounded-lg hover:bg-gray-50 ${
                          data.isLoopVariable 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={`font-mono font-medium ${
                              data.isLoopVariable ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              {name}
                              {data.isLoopVariable && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  Loop
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {data.type} · Line {data.line} · {data.scope}
                            </div>
                          </div>
                          <div className={`font-mono px-3 py-1 rounded text-sm ${
                            data.isLoopVariable 
                              ? 'bg-blue-100 text-blue-800 font-bold' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {data.value}
                          </div>
                        </div>
                        {data.history && data.history.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div className="font-medium">History:</div>
                            <div className="truncate">
                              {data.history.slice(-3).map((h, idx) => (
                                <span key={idx} className="mr-2">
                                  →{h.value}
                                </span>
                              ))}
                              {data.history.length > 3 && (
                                <span className="text-gray-400">
                                  (+{data.history.length - 3} more)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No variables yet. Run the code to see variables.
                </div>
              )}
            </div>
          </div>
          
          {/* Output Console */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Output Console</h2>
              <div className="text-xs text-gray-500">
                {outputLog.length} messages
              </div>
            </div>
            <div className="p-4 font-mono text-sm bg-black text-white rounded-b-lg max-h-48 overflow-auto">
              {outputLog.length > 0 ? (
                outputLog.map((entry, index) => {
                  const isLoopVar = entry.isLoopVar;
                  const isOutput = typeof entry.value === 'string' && (
                    entry.value.startsWith('Output:') || 
                    entry.value.startsWith('cout:') ||
                    entry.value.includes('<<')
                  );
                  
                  let content;
                  if (isLoopVar) {
                    content = (
                      <span className="text-yellow-300">
                        🔁 {entry.value}
                      </span>
                    );
                  } else if (isOutput) {
                    content = (
                      <span className="text-green-300">
                        📤 {entry.value}
                      </span>
                    );
                  } else if (typeof entry.value === 'string' && entry.value.includes('=')) {
                    content = (
                      <span className="text-cyan-300">
                        📝 {entry.value}
                      </span>
                    );
                  } else {
                    content = <span>{entry.value}</span>;
                  }
                  
                  return (
                    <div key={index} className="mb-1 flex items-start">
                      <span className="text-gray-500 text-xs mt-0.5 mr-2">[{entry.step}]</span>
                      <span className="text-gray-400 mr-2">L{entry.line}:</span>
                      <span className="flex-1">{content}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 italic">
                  No output yet. The output will appear here when you run the code.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex flex-wrap justify-between items-center text-sm text-gray-600">
          <div className="flex gap-6">
            <div>
              <span className="font-medium">Current Line:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono">
                {executionState.currentLine || '--'}
              </span>
            </div>
            <div>
              <span className="font-medium">Call Stack:</span>
              <span className="ml-2 font-mono">
                {callStack.length > 0 ? callStack.slice(-3).join(' → ') : 'empty'}
                {callStack.length > 3 && ` (+${callStack.length - 3})`}
              </span>
            </div>
            <div>
              <span className="font-medium">Loop Iterations:</span>
              <span className="ml-2">
                {executionState.totalIterations > 0 ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {executionState.totalIterations}
                  </span>
                ) : (
                  'none'
                )}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">Memory:</span>
              <span className="ml-2">
                {memoryHeap.length} objects, {Object.keys(variables).length} variables
              </span>
            </div>
            
            <div>
              <span className="font-medium">Status:</span>
              <span className={`ml-2 px-3 py-1 rounded-full text-xs ${
                executionState.isRunning
                  ? 'bg-green-100 text-green-800'
                  : executionState.isPaused
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {executionState.isRunning ? 'Running' : executionState.isPaused ? 'Paused' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example algorithms to demonstrate loop visualization
const exampleAlgorithms = {
  bubbleSort: `// Bubble Sort Algorithm
#include <iostream>
using namespace std;

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr)/sizeof(arr[0]);
    
    cout << "Original array: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    // Bubble sort
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                // Swap arr[j] and arr[j+1]
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
        cout << "After iteration " << i+1 << ": ";
        for (int k = 0; k < n; k++) {
            cout << arr[k] << " ";
        }
        cout << endl;
    }
    
    cout << "Sorted array: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    return 0;
}`,

  binarySearch: `// Binary Search Algorithm
#include <iostream>
using namespace std;

int binarySearch(int arr[], int size, int target) {
    int left = 0;
    int right = size - 1;
    int iterations = 0;
    
    while (left <= right) {
        iterations++;
        int mid = left + (right - left) / 2;
        
        cout << "Iteration " << iterations << ": ";
        cout << "left=" << left << ", right=" << right << ", mid=" << mid;
        cout << ", arr[mid]=" << arr[mid] << endl;
        
        if (arr[mid] == target) {
            cout << "Found at index " << mid << " after " << iterations << " iterations" << endl;
            return mid;
        }
        
        if (arr[mid] < target) {
            left = mid + 1;
            cout << "Target is in right half" << endl;
        } else {
            right = mid - 1;
            cout << "Target is in left half" << endl;
        }
    }
    
    cout << "Target not found after " << iterations << " iterations" << endl;
    return -1;
}

int main() {
    int arr[] = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int size = sizeof(arr)/sizeof(arr[0]);
    int target = 23;
    
    cout << "Array: ";
    for (int i = 0; i < size; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    cout << "Searching for: " << target << endl;
    
    int result = binarySearch(arr, size, target);
    
    return 0;
}`,

  fibonacci: `// Fibonacci Sequence with Loop
#include <iostream>
using namespace std;

int main() {
    int n = 10;
    cout << "Fibonacci sequence for first " << n << " numbers:" << endl;
    
    int a = 0, b = 1;
    cout << a << " " << b << " ";
    
    for (int i = 2; i < n; i++) {
        int next = a + b;
        cout << next << " ";
        a = b;
        b = next;
        
        cout << "[a=" << a << ", b=" << b << ", i=" << i << "]" << endl;
    }
    
    cout << endl;
    return 0;
}`
};

export default AdvancedCodeVisualizer;
export { exampleAlgorithms };