import React, { useState, useEffect, useRef } from 'react';

const AdvancedCodeVisualizer = ({ initialCode = '', language = 'cpp' }) => {
  // State management
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [stdinInput, setStdinInput] = useState('');
  const [executionState, setExecutionState] = useState({
    isRunning: false,
    isPaused: false,
    currentLine: 0,
    speed: 1,
    stepCount: 0
  });
  
  const [variables, setVariables] = useState({});
  const [callStack, setCallStack] = useState([]);
  const [memoryHeap, setMemoryHeap] = useState([]);
  const [outputLog, setOutputLog] = useState([]);
  const [executionTrace, setExecutionTrace] = useState([]);
  const [dataStructures, setDataStructures] = useState({});
  const [algorithmInfo, setAlgorithmInfo] = useState(null);
  const [visualizationType, setVisualizationType] = useState('flow');
  
  const codeRef = useRef(null);
  const executionInterval = useRef(null);
  const pyodideRef = useRef(null);
  const jsInterpreterLoaded = useRef(false);

  // Load Pyodide for Python execution
  useEffect(() => {
    const loadPyodideLib = async () => {
      let pyodidePKG = await import('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs');
      const pyodide = await pyodidePKG.loadPyodide();
      pyodideRef.current = pyodide;
    };
    loadPyodideLib();

    // Load JSInterpreter
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/js-interpreter@1.10.1/interpreter.js';
    script.onload = () => {
      jsInterpreterLoaded.current = true;
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Supported languages and their parsers
  const languages = {
    cpp: {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx'],
      keywords: ['#include', 'using namespace', 'int main', 'for', 'while', 'if', 'else', 'class', 'struct'],
      executionSupported: false
    },
    python: {
      name: 'Python',
      extensions: ['.py', '.pyw'],
      keywords: ['def', 'class', 'import', 'for', 'while', 'if', 'elif', 'else', 'try', 'except'],
      executionSupported: true
    },
    java: {
      name: 'Java',
      extensions: ['.java'],
      keywords: ['public class', 'static void', 'main', 'for', 'while', 'if', 'else', 'class', 'interface'],
      executionSupported: false
    },
    javascript: {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      keywords: ['function', 'const', 'let', 'var', 'for', 'while', 'if', 'else', 'class', 'async'],
      executionSupported: true
    }
  };

  // Algorithm detection patterns
  const algorithmPatterns = {
    sorting: {
      keywords: ['sort', 'bubble', 'quick', 'merge', 'insertion', 'selection', 'heap'],
      type: 'comparison',
      complexity: 'O(n log n)'
    },
    searching: {
      keywords: ['search', 'binary', 'linear', 'dfs', 'bfs', 'dijkstra'],
      type: 'search',
      complexity: 'O(log n)'
    },
    dp: {
      keywords: ['dp', 'dynamic', 'memoization', 'fibonacci', 'knapsack'],
      type: 'dynamic',
      complexity: 'O(n^2)'
    },
    graph: {
      keywords: ['graph', 'node', 'edge', 'adjacency', 'shortest path', 'traversal'],
      type: 'graph',
      complexity: 'O(V + E)'
    },
    tree: {
      keywords: ['tree', 'node', 'binary', 'bst', 'avl', 'traversal'],
      type: 'tree',
      complexity: 'O(log n)'
    }
  };

  // Detect algorithm type from code
  const detectAlgorithm = (code) => {
    const codeLower = code.toLowerCase();
    let detected = [];
    
    for (const [algo, pattern] of Object.entries(algorithmPatterns)) {
      if (pattern.keywords.some(keyword => codeLower.includes(keyword))) {
        detected.push({
          name: algo,
          type: pattern.type,
          complexity: pattern.complexity,
          confidence: pattern.keywords.filter(k => codeLower.includes(k)).length
        });
      }
    }
    
    return detected.length > 0 ? detected.sort((a, b) => b.confidence - a.confidence)[0] : null;
  };

  // Parse code into structured format
  const parseCode = (code, language) => {
    const lines = code.split('\n').map((line, index) => ({
      id: index,
      lineNumber: index + 1,
      content: line,
      indent: line.search(/\S/),
      type: determineLineType(line, language),
      isExecutable: isLineExecutable(line, language)
    }));
    
    return {
      lines,
      functions: extractFunctions(code, language),
      variables: extractVariables(code, language),
      complexity: estimateComplexity(code, language)
    };
  };

  const determineLineType = (line, language) => {
    const trimmed = line.trim();
    
    // Common patterns across languages
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return 'comment';
    if (trimmed.startsWith('import ') || trimmed.startsWith('#include')) return 'import';
    if (trimmed.includes('class ') || trimmed.includes('struct ')) return 'definition';
    if (trimmed.includes('=') && !trimmed.includes('==')) return 'assignment';
    if (trimmed.includes('if(') || trimmed.includes('if ')) return 'conditional';
    if (trimmed.includes('for(') || trimmed.includes('for ')) return 'loop';
    if (trimmed.includes('while(') || trimmed.includes('while ')) return 'loop';
    if (trimmed.includes('return')) return 'return';
    if (trimmed.includes('cout') || trimmed.includes('printf') || trimmed.includes('print')) return 'output';
    if (trimmed.includes('cin') || trimmed.includes('scanf') || trimmed.includes('input')) return 'input';
    
    return 'execution';
  };

  const isLineExecutable = (line, language) => {
    const trimmed = line.trim();
    if (trimmed === '') return false;
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) return false;
    if (trimmed.startsWith('import ') || trimmed.startsWith('#include')) return false;
    if (trimmed.startsWith('using ')) return false;
    
    return true;
  };

  const extractFunctions = (code, language) => {
    const functions = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (language === 'cpp' || language === 'java') {
        const funcMatch = line.match(/(\w+)\s+(\w+)\s*\(([^)]*)\)/);
        if (funcMatch && (line.includes('{') || (i + 1 < lines.length && lines[i + 1].trim().startsWith('{')))) {
          functions.push({
            name: funcMatch[2],
            returnType: funcMatch[1],
            params: funcMatch[3],
            line: i + 1
          });
        }
      } else if (language === 'python') {
        const funcMatch = line.match(/def\s+(\w+)\s*\(([^)]*)\)/);
        if (funcMatch) {
          functions.push({
            name: funcMatch[1],
            returnType: 'def',
            params: funcMatch[2],
            line: i + 1
          });
        }
      } else if (language === 'javascript') {
        const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/);
        if (funcMatch) {
          functions.push({
            name: funcMatch[1],
            returnType: 'function',
            params: funcMatch[2],
            line: i + 1
          });
        }
      }
    }
    
    return functions;
  };

  const extractVariables = (code, language) => {
    const variables = {};
    const lines = code.split('\n');
    
    const patterns = {
      cpp: /(int|float|double|char|bool|string|auto)\s+(\w+)\s*(?:=\s*([^;]+))?/g,
      java: /(int|float|double|char|boolean|String)\s+(\w+)\s*(?:=\s*([^;]+))?/g,
      python: /(\w+)\s*=\s*([^#\n]+)/g,
      javascript: /(?:const|let|var)\s+(\w+)\s*=\s*([^;]+)/g
    };
    
    lines.forEach((line, index) => {
      const pattern = patterns[language];
      if (!pattern) return;
      
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const varName = match[2] || match[1];
        const value = match[3] || match[2] || 'undefined';
        
        variables[varName] = {
          name: varName,
          type: match[1] || 'auto',
          value: value.trim(),
          line: index + 1,
          scope: determineScope(index, lines, language)
        };
      }
    });
    
    return variables;
  };

  const determineScope = (lineIndex, lines, language) => {
    let scope = 'global';
    let braceCount = 0;
    
    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      
      if (line.includes('main(') || line.includes('def ') || line.includes('function ')) {
        scope = 'function';
      }
      
      if (line.includes('class ') || line.includes('struct ')) {
        scope = 'class';
      }
    }
    
    return scope;
  };

  const estimateComplexity = (code, language) => {
    const lines = code.toLowerCase().split('\n');
    let complexity = 'O(1)';
    
    // Simple heuristic-based complexity estimation
    const hasNestedLoops = (lines.join('').match(/for.*{.*for|while.*{.*for|for.*{.*while/g) || []).length > 0;
    const hasRecursion = lines.some(line => line.includes('return') && line.includes('('));
    const hasLoops = lines.some(line => line.includes('for') || line.includes('while'));
    
    if (hasNestedLoops) {
      complexity = 'O(n²)';
    } else if (hasRecursion) {
      complexity = 'O(2ⁿ)';
    } else if (hasLoops) {
      complexity = 'O(n)';
    }
    
    return complexity;
  };

  // Initialize code parsing
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
    }
  }, [code, selectedLanguage]);

  // Simulate execution for unsupported languages
  const simulateExecution = () => {
    const lines = code.split('\n');
    const trace = [];
    const variablesState = { ...variables };
    const heap = [];
    const output = [];
    const callStack = ['main'];
    
    let lineIndex = 0;
    let step = 0;
    
    // Basic simulation for demonstration
    while (lineIndex < lines.length && step < 100) {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        lineIndex++;
        continue;
      }
      
      // Simulate variable assignments
      if (trimmed.includes('=') && !trimmed.includes('==')) {
        const match = trimmed.match(/(\w+)\s*=\s*([^;]+)/);
        if (match) {
          const varName = match[1];
          const value = evaluateExpression(match[2], variablesState);
          
          variablesState[varName] = {
            ...variablesState[varName],
            value: value,
            lastModified: step
          };
        }
      }
      
      // Simulate output
      if (trimmed.includes('cout') || trimmed.includes('printf') || trimmed.includes('print')) {
        const outputMatch = trimmed.match(/<<\s*(.*?)\s*;|%\w+\s*,\s*(\w+)|print\(([^)]+)\)/);
        if (outputMatch) {
          const outputValue = outputMatch[1] || outputMatch[2] || outputMatch[3];
          output.push({
            step,
            value: evaluateExpression(outputValue, variablesState),
            line: lineIndex + 1
          });
        }
      }
      
      // Simulate loops
      if (trimmed.includes('for') || trimmed.includes('while')) {
        trace.push({
          step,
          line: lineIndex + 1,
          type: 'loop_start',
          variables: { ...variablesState },
          output: [...output],
          stack: [...callStack],
          description: `Loop iteration at line ${lineIndex + 1}`
        });
      }
      
      // Simulate conditionals
      if (trimmed.includes('if')) {
        trace.push({
          step,
          line: lineIndex + 1,
          type: 'conditional',
          variables: { ...variablesState },
          output: [...output],
          stack: [...callStack],
          description: `Condition check at line ${lineIndex + 1}`
        });
      }
      
      trace.push({
        step,
        line: lineIndex + 1,
        type: 'execution',
        variables: { ...variablesState },
        output: [...output],
        stack: [...callStack],
        description: `Executing line ${lineIndex + 1}`
      });
      
      lineIndex++;
      step++;
    }
    
    return { trace, variables: variablesState, heap, output, callStack };
  };

  const evaluateExpression = (expr, variables) => {
    // Basic expression evaluation
    try {
      let evaluated = expr;
      Object.entries(variables).forEach(([name, data]) => {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        evaluated = evaluated.replace(regex, data.value);
      });
      
      const clean = evaluated.replace(/[^0-9+\-*/().]/g, '');
      if (clean) {
        return new Function(`return ${clean}`)();
      }
      
      return expr;
    } catch {
      return expr;
    }
  };

  const executePythonCode = async () => {
    try {
      const py = pyodideRef.current;
      if (!py) throw new Error('Pyodide not loaded');
      
      await py.loadPackagesFromImports(code);
      
      py.runPython(`
import sys
from io import StringIO
sys.stdin = StringIO('''${stdinInput.replace(/'/g, "\\'")}''')
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);
      
      // Set up tracing
      py.runPython(`
import sys
import inspect
trace = []
output_lines = []
original_print = print
def traced_print(*args, **kwargs):
  frame = inspect.currentframe().f_back
  line_no = frame.f_lineno
  output_str = ' '.join(map(str, args))
  output_lines.append({'line': line_no, 'output': output_str})
  original_print(*args, **kwargs)
__builtins__['print'] = traced_print
def tracer(frame, event, arg):
  if event == 'line':
    locals_copy = {k: str(v) for k, v in frame.f_locals.items() if not k.startswith('__')}
    globals_copy = {k: str(v) for k, v in frame.f_globals.items() if not k.startswith('__') and k not in ['tracer', 'traced_print', 'original_print', 'trace', 'output_lines']}
    stack = []
    current = frame
    while current:
      stack.append(current.f_code.co_name)
      current = current.f_back
    stack.reverse()
    trace.append({
      'line': frame.f_lineno,
      'variables': {**globals_copy, **locals_copy},
      'stack': stack
    })
  return tracer
sys.settrace(tracer)
      `);
      
      // Run user code
      await py.runPythonAsync(code);
      
      // Disable trace
      py.runPython(`sys.settrace(None)`);
      
      const stderr = py.runPython('sys.stderr.getvalue()');
      if (stderr) {
        setOutputLog([{ step: 0, value: `Error: ${stderr}`, line: 0 }]);
        return;
      }
      
      const trace_js = py.runPython('trace').toJs({ dict_converter: Object.fromEntries });
      const output_lines_js = py.runPython('output_lines').toJs({ dict_converter: Object.fromEntries });
      
      let processed_trace = [];
      let cumulative_output = [];
      let output_index = 0;
      
      trace_js.forEach((step, i) => {
        while (output_index < output_lines_js.length && output_lines_js[output_index].line === step.line) {
          cumulative_output.push(output_lines_js[output_index].output);
          output_index++;
        }
        processed_trace.push({
          step: i,
          line: step.line,
          variables: step.variables,
          stack: step.stack,
          output: [...cumulative_output],
          description: `Executing line ${step.line}`
        });
      });
      
      setExecutionTrace(processed_trace);
      
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
      
      const initFunc = function(interpreter, globalObject) {
        const consoleWrapper = interpreter.createObject(interpreter.OBJECT);
        interpreter.setProperty(globalObject, 'console', consoleWrapper);
        
        const logFunc = function(...args) {
          const state = interpreter.stateStack[interpreter.stateStack.length - 1];
          const line = state.node.loc ? state.node.loc.start.line : 0;
          const outputStr = args.map(arg => interpreter.pseudoToNative(arg)).join(' ');
          output_lines.push({line, output: outputStr});
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
      let output_index = 0;
      
      while (interpreter.step() && stepCount < 10000) {
        const state = interpreter.stateStack[interpreter.stateStack.length - 1];
        if (!state) continue;
        
        const line = state.node.loc ? state.node.loc.start.line : 0;
        
        const scope = interpreter.getScope();
        const variables = {};
        for (let prop in scope.properties) {
          if (!prop.startsWith('_')) {
            variables[prop] = String(interpreter.pseudoToNative(scope.properties[prop]));
          }
        }
        
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
        
        while (output_index < output_lines.length && output_lines[output_index].line === line) {
          cumulative_output.push(output_lines[output_index].output);
          output_index++;
        }
        
        trace.push({
          step: stepCount,
          line,
          variables,
          stack,
          output: [...cumulative_output],
          description: `Executing line ${line}`
        });
        
        stepCount++;
      }
      
      setExecutionTrace(trace);
      
    } catch (err) {
      setOutputLog([{ step: 0, value: `Execution error: ${err.message}`, line: 0 }]);
    }
  };

  // Start/Stop execution
  const toggleExecution = () => {
    if (executionState.isRunning) {
      pauseExecution();
    } else {
      startExecution();
    }
  };

  const startExecution = async () => {
    setExecutionState(prev => ({ ...prev, isRunning: true, currentLine: 0, stepCount: 0 }));
    
    if (languages[selectedLanguage].executionSupported) {
      if (selectedLanguage === 'python') {
        await executePythonCode();
      } else if (selectedLanguage === 'javascript') {
        executeJavascriptCode();
      }
    } else {
      const { trace } = simulateExecution();
      setExecutionTrace(trace);
    }
    
    executeStepByStep(executionTrace);
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
        stepCount: currentStep
      }));
      
      setVariables(step.variables);
      setCallStack(step.stack || []);
      setOutputLog(step.output.map((v, i) => ({ step: i, value: v, line: step.line })));
      
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
      stepCount: 0
    });
    
    setVariables({});
    setCallStack([]);
    setMemoryHeap([]);
    setOutputLog([]);
    setExecutionTrace([]);
  };

  const handleCodePaste = (event) => {
    const pastedCode = event.clipboardData.getData('text');
    setCode(pastedCode);
    
    // Try to detect language from code
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

  // Render visualizations based on algorithm type
  const renderAlgorithmVisualization = () => {
    // If table view is selected, show table regardless of algorithm type
    if (visualizationType === 'table') {
      return renderTableVisualization();
    }
    
    if (!algorithmInfo) {
      // If no algorithm detected but we have code and execution trace, show generic visualization
      if (code.trim() && executionTrace.length > 0) {
        return renderGenericVisualization();
      }
      return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-lg mb-4">Visualization</h3>
          <div className="text-gray-600 italic">
            Run the code to see visualization. Select "Line-by-Line Table" from the dropdown for detailed execution view.
          </div>
        </div>
      );
    }
    
    switch (algorithmInfo.type) {
      case 'comparison':
        return renderSortingVisualization();
      case 'search':
        return renderSearchVisualization();
      case 'graph':
        return renderGraphVisualization();
      case 'tree':
        return renderTreeVisualization();
      default:
        return renderGenericVisualization();
    }
  };

  const renderSortingVisualization = () => {
    // Extract array data from variables
    const arrayVars = Object.entries(variables).filter(([_, data]) => 
      typeof data.value === 'string' && data.value.startsWith('[') && data.value.endsWith(']')
    );
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Sorting Visualization</h3>
        <div className="space-y-4">
          {arrayVars.map(([name, data]) => {
            const arrayStr = data.value.slice(1, -1);
            const elements = arrayStr.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
            const maxVal = Math.max(...elements, 1);
            return (
              <div key={name}>
                <div className="flex justify-between mb-2">
                  <span className="font-mono font-medium">{name}</span>
                  <span className="text-sm text-gray-600">Size: {elements.length}</span>
                </div>
                <div className="flex items-end h-32 border border-gray-300 p-2 rounded">
                  {elements.map((value, index) => (
                    <div
                      key={index}
                      className="flex-1 mx-1 bg-[#001F3F] hover:bg-[#001F3F]/80 transition-all"
                      style={{
                        height: `${(value / maxVal) * 100}%`
                      }}
                      title={`${value}`}
                    >
                      <div className="text-xs text-white text-center mt-1">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSearchVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Search Visualization</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(variables).map(([name, data]) => (
            <div key={name} className="p-2 bg-gray-50 border border-gray-200 rounded">
              <div className="font-mono">{name} = {data.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGraphVisualization = () => {
    // Hardcoded for now; in a full implementation, parse graph structures from variables
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Graph Visualization (Example)</h3>
        <svg width="100%" height="300" className="border border-gray-300 rounded">
          <circle cx="100" cy="150" r="20" fill="#001F3F" stroke="black" />
          <text x="100" y="150" textAnchor="middle" fill="white">A</text>
          <circle cx="200" cy="100" r="20" fill="#001F3F" stroke="black" />
          <text x="200" y="100" textAnchor="middle" fill="white">B</text>
          <circle cx="300" cy="150" r="20" fill="#001F3F" stroke="black" />
          <text x="300" y="150" textAnchor="middle" fill="white">C</text>
          <line x1="100" y1="150" x2="200" y2="100" stroke="black" strokeWidth="2" />
          <line x1="200" y1="100" x2="300" y2="150" stroke="black" strokeWidth="2" />
          <line x1="300" y1="150" x2="100" y2="150" stroke="black" strokeWidth="2" />
        </svg>
      </div>
    );
  };

  const renderTreeVisualization = () => {
    // Hardcoded for now; in a full implementation, parse tree structures from variables
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Tree Visualization (Example)</h3>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 flex items-center justify-center bg-[#001F3F] text-white rounded-full mb-8 border border-black">
            R
          </div>
          <div className="flex space-x-8">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-[#001F3F] text-white rounded-full mb-4 border border-black">
                L
              </div>
              <div className="text-xs text-gray-600">Left Child</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-[#001F3F] text-white rounded-full mb-4 border border-black">
                R
              </div>
              <div className="text-xs text-gray-600">Right Child</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGenericVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Execution Flow</h3>
        <div className="space-y-2">
          {executionTrace.slice(Math.max(0, executionState.stepCount - 9), executionState.stepCount + 1).map((step, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                step.step === executionState.stepCount
                  ? 'bg-[#001F3F]/10 border-[#001F3F]/20'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between text-sm">
                <span className="font-medium">Line {step.line}</span>
                <span className="text-gray-600">Step {step.step}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">{step.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTableVisualization = () => {
    // Split code into lines
    const codeLines = code.split('\n');
    
    // Create a map of line executions for highlighting
    const lineExecutions = {};
    executionTrace.forEach(step => {
      if (!lineExecutions[step.line]) {
        lineExecutions[step.line] = [];
      }
      lineExecutions[step.line].push(step);
    });
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Line-by-Line Execution Table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-300 px-4 py-2 text-left">Line #</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Executions</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Variables</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Output</th>
              </tr>
            </thead>
            <tbody>
              {codeLines.map((line, index) => {
                const lineNumber = index + 1;
                const executions = lineExecutions[lineNumber] || [];
                const lastExecution = executions[executions.length - 1];
                
                // Get variables at this line execution
                let variablesDisplay = '';
                if (lastExecution && lastExecution.variables) {
                  variablesDisplay = Object.entries(lastExecution.variables)
                    .slice(0, 3) // Show only first 3 variables
                    .map(([name, value]) => {
                      // Format objects and functions specially
                      if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value)) {
                          return `${name}=[...]`;
                        } else {
                          return `${name}={...}`;
                        }
                      } else if (typeof value === 'function') {
                        return `${name}=function() {...}`;
                      } else {
                        return `${name}=${value}`;
                      }
                    })
                    .join(', ');
                  if (Object.keys(lastExecution.variables).length > 3) {
                    variablesDisplay += ` (+${Object.keys(lastExecution.variables).length - 3} more)`;
                  }
                }
                
                // Get output at this line
                let outputDisplay = '';
                if (lastExecution && lastExecution.output) {
                  outputDisplay = lastExecution.output.join(', ');
                }
                
                return (
                  <tr 
                    key={lineNumber}
                    className={`${executionState.currentLine === lineNumber ? 'bg-[#001F3F] text-white' : ''} ${executions.length > 0 ? 'bg-blue-50' : ''}`}
                  >
                    <td className={`border border-gray-300 px-4 py-2 font-mono text-sm ${executionState.currentLine === lineNumber ? 'text-white font-bold' : ''}`}>{lineNumber}</td>
                    <td className={`border border-gray-300 px-4 py-2 font-mono text-sm whitespace-pre ${executionState.currentLine === lineNumber ? 'text-white' : ''}`}>{line || <span className="text-gray-400">&nbsp;</span>}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-center ${executionState.currentLine === lineNumber ? 'text-white' : ''}`}>{executions.length}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm max-w-xs truncate ${executionState.currentLine === lineNumber ? 'text-white' : ''}`} title={variablesDisplay}>{variablesDisplay}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm max-w-xs truncate ${executionState.currentLine === lineNumber ? 'text-white' : ''}`} title={outputDisplay}>{outputDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-black p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Advanced Code Visualizer</h1>
            <p className="text-gray-600">Paste any algorithm code to visualize its execution (Full support for Python and JavaScript)</p>
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
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCode(event.target.result);
                          // Automatically switch to table view when file is loaded
                          setVisualizationType('table');
                          // Automatically start execution after a short delay to allow state updates
                          setTimeout(() => {
                            if (!executionState.isRunning) {
                              startExecution();
                            }
                          }, 100);
                        };
                        reader.readAsText(file);
                      }
                    }}
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
Or try these examples:

1. Bubble Sort
2. Binary Search
3. Graph BFS
4. Tree Traversal`}
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
                      Estimated Complexity: {algorithmInfo.complexity}
                    </span>
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
                  No known algorithm pattern detected
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
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-600">
                  Step: {executionState.stepCount} / {executionTrace.length}
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
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800">Variable Inspector</h2>
            </div>
            <div className="p-4 overflow-auto max-h-64">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(variables).map(([name, data]) => (
                  <div
                    key={name}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-medium text-[#001F3F]">{name}</div>
                        <div className="text-xs text-gray-500">{data.type} · Line {data.line}</div>
                      </div>
                      <div className="font-mono bg-gray-100 px-3 py-1 rounded text-sm">
                        {data.value}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">Scope: {data.scope}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Output Console */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800">Output Console</h2>
            </div>
            <div className="p-4 font-mono text-sm bg-black text-white rounded-b-lg max-h-48 overflow-auto">
              {outputLog.length > 0 ? (
                outputLog.map((entry, index) => (
                  <div key={index} className="mb-2">
                    <span className="text-green-400">[Step {entry.step}]</span>
                    <span className="text-gray-400 mx-2">Line {entry.line}:</span>
                    <span className="text-white">{entry.value}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No output yet. Run the code to see results.</div>
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
              <span className="ml-2">
                {callStack.length > 0 ? callStack.join(' → ') : 'empty'}
              </span>
            </div>
            <div>
              <span className="font-medium">Memory Usage:</span>
              <span className="ml-2">
                {memoryHeap.length} objects
              </span>
            </div>
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
  );
};

// Example usage with predefined algorithms (unchanged)
const exampleAlgorithms = {
  // ... (omitted for brevity, same as original)
};

export default AdvancedCodeVisualizer;
export { exampleAlgorithms };