import React, { useState, useEffect, useRef } from 'react';

const AdvancedCodeVisualizer = ({ initialCode = '', language = 'cpp' }) => {
  // State management
  const [code, setCode] = useState(initialCode);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
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

  // Supported languages and their parsers
  const languages = {
    cpp: {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx'],
      keywords: ['#include', 'using namespace', 'int main', 'for', 'while', 'if', 'else', 'class', 'struct']
    },
    python: {
      name: 'Python',
      extensions: ['.py', '.pyw'],
      keywords: ['def', 'class', 'import', 'for', 'while', 'if', 'elif', 'else', 'try', 'except']
    },
    java: {
      name: 'Java',
      extensions: ['.java'],
      keywords: ['public class', 'static void', 'main', 'for', 'while', 'if', 'else', 'class', 'interface']
    },
    javascript: {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      keywords: ['function', 'const', 'let', 'var', 'for', 'while', 'if', 'else', 'class', 'async']
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

  // Simulate execution based on language
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
            value: outputValue.trim(),
            line: lineIndex + 1
          });
        }
      }
      
      // Simulate loops
      if (trimmed.includes('for') || trimmed.includes('while')) {
        // Simplified loop simulation
        trace.push({
          step,
          line: lineIndex + 1,
          type: 'loop_start',
          variables: { ...variablesState },
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
          description: `Condition check at line ${lineIndex + 1}`
        });
      }
      
      trace.push({
        step,
        line: lineIndex + 1,
        type: 'execution',
        variables: { ...variablesState },
        description: `Executing line ${lineIndex + 1}`,
        output: output.length > 0 ? output[output.length - 1] : null
      });
      
      lineIndex++;
      step++;
    }
    
    return { trace, variables: variablesState, heap, output, callStack };
  };

  const evaluateExpression = (expr, variables) => {
    // Very basic expression evaluation
    try {
      // Replace variable names with their values
      let evaluated = expr;
      Object.entries(variables).forEach(([name, data]) => {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        evaluated = evaluated.replace(regex, data.value);
      });
      
      // Remove any remaining non-numeric characters and evaluate
      const clean = evaluated.replace(/[^0-9+\-*/().]/g, '');
      if (clean) {
        // Use Function constructor for safe evaluation
        return new Function(`return ${clean}`)();
      }
      
      return expr;
    } catch {
      return expr;
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

  const startExecution = () => {
    const { trace, variables: newVars, heap, output, callStack } = simulateExecution();
    
    setExecutionTrace(trace);
    setVariables(newVars);
    setMemoryHeap(heap);
    setOutputLog(output);
    setCallStack(callStack);
    
    setExecutionState(prev => ({
      ...prev,
      isRunning: true,
      currentLine: 0,
      stepCount: 0
    }));
    
    // Start step-by-step execution
    executeStepByStep(trace);
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
        return;
      }
      
      const step = trace[currentStep];
      
      setExecutionState(prev => ({
        ...prev,
        currentLine: step.line,
        stepCount: currentStep
      }));
      
      setVariables(step.variables);
      
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
    
    // Try to detect language from file extension or content
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
    if (!algorithmInfo) return null;
    
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
      data.value.includes('[') || Array.isArray(data.value)
    );
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Sorting Visualization</h3>
        <div className="space-y-4">
          {arrayVars.map(([name, data]) => (
            <div key={name}>
              <div className="flex justify-between mb-2">
                <span className="font-mono font-medium">{name}</span>
                <span className="text-sm text-gray-600">Size: {data.value}</span>
              </div>
              <div className="flex items-end h-32 border border-gray-300 p-2 rounded">
                {renderArrayBars(data.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderArrayBars = (arrayExpr) => {
    // Parse array expression and generate bars
    const match = arrayExpr.match(/\[([^\]]+)\]/);
    if (!match) return null;
    
    const elements = match[1].split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    const maxVal = Math.max(...elements);
    
    return elements.map((value, index) => (
      <div
        key={index}
        className="flex-1 mx-1 bg-blue-500 hover:bg-blue-600 transition-all"
        style={{
          height: `${(value / maxVal) * 100}%`,
          backgroundColor: executionState.currentLine === index + 1 ? '#10B981' : '#3B82F6'
        }}
        title={`${name}[${index}] = ${value}`}
      >
        <div className="text-xs text-white text-center mt-1">{value}</div>
      </div>
    ));
  };

  const renderGraphVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Graph Visualization</h3>
        <svg width="100%" height="300" className="border border-gray-300 rounded">
          <circle cx="100" cy="150" r="20" fill="#3B82F6" />
          <text x="100" y="150" textAnchor="middle" fill="white">A</text>
          <circle cx="200" cy="100" r="20" fill="#10B981" />
          <text x="200" y="100" textAnchor="middle" fill="white">B</text>
          <circle cx="300" cy="150" r="20" fill="#8B5CF6" />
          <text x="300" y="150" textAnchor="middle" fill="white">C</text>
          <line x1="100" y1="150" x2="200" y2="100" stroke="#6B7280" strokeWidth="2" />
          <line x1="200" y1="100" x2="300" y2="150" stroke="#6B7280" strokeWidth="2" />
          <line x1="300" y1="150" x2="100" y2="150" stroke="#6B7280" strokeWidth="2" />
        </svg>
      </div>
    );
  };

  const renderTreeVisualization = () => {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-lg mb-4">Tree Visualization</h3>
        <div className="flex flex-col items-center">
          {/* Root */}
          <div className="w-12 h-12 flex items-center justify-center bg-green-500 text-white rounded-full mb-8">
            R
          </div>
          {/* Children */}
          <div className="flex space-x-8">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full mb-4">
                L
              </div>
              <div className="text-xs text-gray-600">Left Child</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full mb-4">
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
          {executionTrace.slice(-10).map((step, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                step.line === executionState.currentLine
                  ? 'bg-blue-50 border-blue-200'
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Advanced Code Visualizer</h1>
            <p className="text-gray-600">Paste any algorithm code to visualize its execution</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(languages).map(([key, lang]) => (
                <option key={key} value={key}>{lang.name}</option>
              ))}
            </select>
            
            <select
              value={visualizationType}
              onChange={(e) => setVisualizationType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="flow">Execution Flow</option>
              <option value="memory">Memory View</option>
              <option value="graph">Graph View</option>
              <option value="tree">Tree View</option>
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
                        reader.onload = (event) => setCode(event.target.result);
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
                placeholder={`Paste your ${languages[selectedLanguage].name} code here...\nOr try these examples:\n\n1. Bubble Sort\n2. Binary Search\n3. Graph BFS\n4. Tree Traversal`}
                className="w-full h-full p-6 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
                spellCheck="false"
                rows={20}
              />
            </div>
            
            {/* Algorithm Detection Info */}
            {algorithmInfo && (
              <div className="border-t border-gray-200 p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-blue-800">Detected:</span>
                    <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {algorithmInfo.name.toUpperCase()} ALGORITHM
                    </span>
                    <span className="ml-4 text-sm text-gray-600">
                      Estimated Complexity: {algorithmInfo.complexity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {algorithmInfo.parsedCode?.lines.length} lines, {
                      Object.keys(algorithmInfo.parsedCode?.variables || {}).length
                    } variables
                  </div>
                </div>
              </div>
            )}
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
                      : 'bg-blue-800 hover:bg-blue-900 text-white'
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
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium flex items-center gap-2"
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
                    className="px-3 py-2 border border-gray-300 rounded-md"
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
                        <div className="font-mono font-medium text-blue-600">{name}</div>
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
            <div className="p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-b-lg max-h-48 overflow-auto">
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
              <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
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

// Example usage with predefined algorithms
const exampleAlgorithms = {
  bubbleSort: `// Bubble Sort in C++
#include <iostream>
using namespace std;

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                // Swap arr[j] and arr[j+1]
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr)/sizeof(arr[0]);
    
    bubbleSort(arr, n);
    
    cout << "Sorted array: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    return 0;
}`,

  binarySearch: `// Binary Search in Python
def binary_search(arr, target):
    left = 0
    right = len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1

# Example usage
arr = [2, 3, 4, 10, 40]
target = 10

result = binary_search(arr, target)
if result != -1:
    print(f"Element found at index {result}")
else:
    print("Element not found")`,

  bfs: `// BFS in Java
import java.util.*;

class Graph {
    private int V;
    private LinkedList<Integer> adj[];
    
    Graph(int v) {
        V = v;
        adj = new LinkedList[v];
        for (int i = 0; i < v; ++i)
            adj[i] = new LinkedList();
    }
    
    void addEdge(int v, int w) {
        adj[v].add(w);
    }
    
    void BFS(int s) {
        boolean visited[] = new boolean[V];
        LinkedList<Integer> queue = new LinkedList<>();
        
        visited[s] = true;
        queue.add(s);
        
        while (queue.size() != 0) {
            s = queue.poll();
            System.out.print(s + " ");
            
            Iterator<Integer> i = adj[s].listIterator();
            while (i.hasNext()) {
                int n = i.next();
                if (!visited[n]) {
                    visited[n] = true;
                    queue.add(n);
                }
            }
        }
    }
}`,

  quickSort: `// Quick Sort in JavaScript
function quickSort(arr, left = 0, right = arr.length - 1) {
    if (left < right) {
        const pivotIndex = partition(arr, left, right);
        quickSort(arr, left, pivotIndex - 1);
        quickSort(arr, pivotIndex + 1, right);
    }
    return arr;
}

function partition(arr, left, right) {
    const pivot = arr[right];
    let i = left - 1;
    
    for (let j = left; j < right; j++) {
        if (arr[j] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    
    [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];
    return i + 1;
}

// Example usage
const arr = [10, 7, 8, 9, 1, 5];
console.log("Original array:", arr);
quickSort(arr);
console.log("Sorted array:", arr);`
};

// Main export with example integration
export default AdvancedCodeVisualizer;
export { exampleAlgorithms };