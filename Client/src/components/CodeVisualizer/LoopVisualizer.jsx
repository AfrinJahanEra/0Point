import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/api';

const LoopVisualizer = ({ 
  uploadedCode,
  fileName,
  onCodeChange,
  onFileNameChange,
  onExecutionMetricsChange, 
  onCodePatternsChange, 
  onPerformanceDataChange 
}) => {
  const [iterations, setIterations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [finalOutput, setFinalOutput] = useState('');
  const [executingLine, setExecutingLine] = useState(-1);
  
  // Analysis state
  const [executionMetrics, setExecutionMetrics] = useState({
    totalSteps: 0,
    variablesTracked: 0,
    memoryUsage: 0,
    executionTime: 0
  });
  
  const [codePatterns, setCodePatterns] = useState({
    loops: 0,
    conditionals: 0,
    functionCalls: 0,
    recursionDepth: 0
  });
  
  const [performanceData, setPerformanceData] = useState({
    cpuUsage: 0,
    memoryConsumption: 0,
    executionSpeed: 0
  });
  
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Supported file extensions
  const supportedExtensions = ['.cpp', '.c', '.java', '.js', '.py'];

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(fileExtension)) {
      alert(`Unsupported file type. Please upload one of: ${supportedExtensions.join(', ')}`);
      return;
    }

    onFileNameChange(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      onCodeChange(content);
      // Reset previous results
      setIterations([]);
      setFinalOutput('');
      setCurrentStep(0);
      setIsPlaying(false);
      setExecutingLine(-1);
    };
    
    reader.readAsText(file);
  };

  // Auto-detect language from file extension
  const getLanguageFromExtension = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    const langMap = {
      '.py': 'python',
      '.js': 'javascript',
      '.cpp': 'cpp',
      '.c': 'cpp',
      '.java': 'java'
    };
    return langMap[ext] || 'python';
  };

  // Analyze code patterns with improved detection
  const analyzeCodePatterns = (code) => {
    const patterns = {
      loops: 0,
      conditionals: 0,
      functionCalls: 0,
      recursionDepth: 0,
      functionDefinitions: 0,
      arrayOperations: 0,
      sizeofUsage: 0
    };
    
    // Remove comments and strings for accurate analysis
    const cleanCode = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '')          // Remove single-line comments
      .replace(/"[^"]*"/g, '""')          // Replace strings with empty strings
      .replace(/'[^']*'/g, "''");         // Replace char literals
    
    const lines = cleanCode.split('\n');
    const functionNames = new Set();
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Count loops (for, while, do-while)
      if (/\b(for|while)\s*\(/.test(trimmed)) {
        patterns.loops++;
      }
      if (/\bdo\s*\{/.test(trimmed)) {
        patterns.loops++;
      }
      
      // Count conditionals (if, else if, else, switch, case, ternary)
      if (/\b(if|else\s+if|switch)\s*\(/.test(trimmed)) {
        patterns.conditionals++;
      }
      if (/\belse\s*\{/.test(trimmed) || /\belse\s*$/.test(trimmed)) {
        patterns.conditionals++;
      }
      // Count ternary operators
      const ternaryCount = (trimmed.match(/\?[^:]+:/g) || []).length;
      patterns.conditionals += ternaryCount;
      
      // Detect function definitions (C++ and other languages)
      const funcDefMatch = trimmed.match(/^(?:(?:int|void|bool|char|float|double|long|string|auto|vector|pair|map|set)\s+)+(\w+)\s*\([^)]*\)\s*\{?$/);
      if (funcDefMatch) {
        const funcName = funcDefMatch[1];
        if (funcName !== 'main' && funcName !== 'if' && funcName !== 'while' && funcName !== 'for') {
          functionNames.add(funcName);
          patterns.functionDefinitions++;
        }
      }
      
      // Python function definitions
      if (/^def\s+(\w+)\s*\(/.test(trimmed)) {
        const match = trimmed.match(/^def\s+(\w+)/);
        if (match) {
          functionNames.add(match[1]);
          patterns.functionDefinitions++;
        }
      }
      
      // Count function calls (excluding control structures and declarations)
      const funcCallMatches = trimmed.match(/\b(\w+)\s*\(/g) || [];
      funcCallMatches.forEach(match => {
        const funcName = match.replace(/\s*\($/, '');
        // Exclude control structures and type declarations
        if (!['if', 'while', 'for', 'switch', 'int', 'void', 'bool', 'char', 'float', 'double', 'long', 'string', 'vector', 'pair', 'map', 'set', 'def', 'class'].includes(funcName)) {
          patterns.functionCalls++;
        }
      });
      
      // Detect array/vector operations
      if (/\[\s*\d*\s*\]/.test(trimmed) || /\.push_back\(|\.pop_back\(|\.size\(|\.empty\(|\.begin\(|\.end\(/.test(trimmed)) {
        patterns.arrayOperations++;
      }
      
      // Detect sizeof usage
      if (/sizeof\s*\(/.test(trimmed)) {
        patterns.sizeofUsage++;
      }
    });
    
    // Detect recursion by checking if any defined function is called
    functionNames.forEach(funcName => {
      const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
      const matches = cleanCode.match(callPattern) || [];
      // If function is called more than once (definition + calls), likely recursive
      if (matches.length > 1) {
        patterns.recursionDepth++;
      }
    });
    
    return patterns;
  };

  // Estimate memory usage based on variables
  const estimateMemoryUsage = (steps) => {
    let totalVariables = 0;
    const uniqueVars = new Set();
    
    steps.forEach(step => {
      Object.keys(step.variables || {}).forEach(varName => {
        uniqueVars.add(varName);
      });
    });
    
    // Rough estimation: 8 bytes per variable (simplified)
    return uniqueVars.size * 8;
  };

  // Simulate code compilation and line-by-line execution
  const simulateCompilation = async () => {
    if (!uploadedCode) {
      alert("Upload code first");
      return;
    }

    setIsProcessing(true);
    startTimeRef.current = Date.now(); // Record start time

    try {
      const language = getLanguageFromExtension(fileName);
      
      const response = await fetch(`${BACKEND_URL}/api/executor/execute/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          language: language,
          code: uploadedCode
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Execution failed: ${response.status}`);
      }

      const data = await response.json();

      // Convert backend steps → frontend format
      const mappedIterations = data.steps.map((step, index) => {
        const displayLine = step.line > 0 ? step.line : 1;
        
        return {
          step: index + 1,
          line: displayLine,
          description: step.description || `Line ${displayLine}`,
          variables: Object.entries(step.variables || {}).map(
            ([name, value]) => ({
              name,
              value: String(value),
              type: getVariableType(value)
            })
          ),
          output: step.output || ''
        };
      });

      // Calculate execution time
      const endTime = Date.now();
      const executionTime = endTime - startTimeRef.current;
      
      // Analyze code patterns
      const patterns = analyzeCodePatterns(uploadedCode);
      
      // Estimate memory usage
      const memoryUsage = estimateMemoryUsage(data.steps);
      
      // Calculate performance metrics
      const totalSteps = mappedIterations.length;
      const variablesTracked = new Set(
        mappedIterations.flatMap(step => 
          Object.keys(step.variables || {})
        )
      ).size;
      
      // Update all metrics and notify parent
      const newExecutionMetrics = {
        totalSteps,
        variablesTracked,
        memoryUsage,
        executionTime
      };
      
      const newPerformanceData = {
        cpuUsage: Math.min(95, Math.round((totalSteps / 10) * 15)),
        memoryConsumption: memoryUsage,
        executionSpeed: totalSteps > 0 ? Math.round(totalSteps / (executionTime / 1000)) : 0
      };
      
      setExecutionMetrics(newExecutionMetrics);
      setCodePatterns(patterns);
      setPerformanceData(newPerformanceData);
      
      // Notify parent component
      if (onExecutionMetricsChange) onExecutionMetricsChange(newExecutionMetrics);
      if (onCodePatternsChange) onCodePatternsChange(patterns);
      if (onPerformanceDataChange) onPerformanceDataChange(newPerformanceData);

      setIterations(mappedIterations);
      setFinalOutput(data.final_output || data.steps[data.steps.length - 1]?.output || '');
      setCurrentStep(0);
      setExecutingLine(mappedIterations[0]?.line || 1);
    } catch (error) {
      console.error('Execution error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine variable type from value with improved detection
  const getVariableType = (value) => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'null';
    }
    
    // Handle boolean
    if (typeof value === 'boolean') {
      return 'bool';
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN';
      if (!Number.isFinite(value)) return 'infinity';
      return Number.isInteger(value) ? 'int' : 'float';
    }
    
    // Handle arrays (vectors, C++ arrays)
    if (Array.isArray(value)) {
      if (value.length === 0) return 'array (empty)';
      const elemType = typeof value[0] === 'number' 
        ? (Number.isInteger(value[0]) ? 'int' : 'float')
        : typeof value[0];
      return `array<${elemType}>`;
    }
    
    // Handle strings
    if (typeof value === 'string') {
      // Check for boolean string representations
      if (value === 'true' || value === 'false' || value === 'True' || value === 'False') {
        return 'bool';
      }
      
      // Check for array-like strings (from C++ output)
      if (value.startsWith('[') && value.endsWith(']')) {
        return 'array';
      }
      if (value.startsWith('{') && value.endsWith('}')) {
        return 'array';
      }
      
      // Check for numeric strings
      if (!isNaN(value) && value.trim() !== '') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return value.includes('.') ? 'float' : 'int';
        }
      }
      
      // Check for C++ type indicators
      if (value.includes('vector') || value.includes('std::')) {
        return 'array';
      }
      
      // Check for pointer values
      if (value.startsWith('0x') || value.includes('ptr')) {
        return 'pointer';
      }
      
      // Check for char (single character)
      if (value.length === 1) {
        return 'char';
      }
      
      return 'string';
    }
    
    // Handle objects
    if (typeof value === 'object') {
      if (value.constructor && value.constructor.name !== 'Object') {
        return value.constructor.name.toLowerCase();
      }
      return 'object';
    }
    
    return 'unknown';
  };

  // Format variable value for display
  const formatVariableValue = (value, type) => {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (Array.isArray(value)) {
      if (value.length > 10) {
        return `[${value.slice(0, 10).join(', ')}, ... (${value.length} items)]`;
      }
      return `[${value.join(', ')}]`;
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return `"${value.substring(0, 47)}..."`;
    }
    
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 50 ? str.substring(0, 47) + '...' : str;
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  // Get type color for visual indication
  const getTypeColor = (type) => {
    const colors = {
      'int': 'bg-blue-100 text-blue-800',
      'float': 'bg-purple-100 text-purple-800',
      'double': 'bg-purple-100 text-purple-800',
      'bool': 'bg-green-100 text-green-800',
      'string': 'bg-amber-100 text-amber-800',
      'char': 'bg-orange-100 text-orange-800',
      'array': 'bg-cyan-100 text-cyan-800',
      'pointer': 'bg-red-100 text-red-800',
      'object': 'bg-pink-100 text-pink-800',
      'null': 'bg-gray-100 text-gray-500',
      'unknown': 'bg-gray-100 text-gray-600',
    };
    
    // Check for array subtypes
    if (type.startsWith('array')) {
      return colors['array'];
    }
    
    return colors[type] || colors['unknown'];
  };

  // Navigation functions
  const goToNextStep = () => {
    if (currentStep < iterations.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToFirstStep = () => {
    setCurrentStep(0);
  };

  const goToLastStep = () => {
    if (iterations.length > 0) {
      setCurrentStep(iterations.length - 1);
    }
  };

  // Playback controls
  const startPlayback = () => {
    if (iterations.length === 0) return;
    
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentStep(prevStep => {
        if (prevStep >= iterations.length - 1) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prevStep;
        }
        return prevStep + 1;
      });
    }, 1000 / playbackSpeed);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Reset everything
  const resetAll = () => {
    onCodeChange('');
    onFileNameChange('');
    setIterations([]);
    setFinalOutput('');
    setCurrentStep(0);
    setIsPlaying(false);
    setExecutingLine(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Variable tracking - accumulate all variables across all steps up to current
  const variableData = useMemo(() => {
    if (iterations.length === 0) return { currentVars: [] };

    // Accumulate all variables from step 0 to currentStep
    // This ensures variables persist with their last known value
    const accumulatedVars = {};
    
    for (let stepIdx = 0; stepIdx <= currentStep && stepIdx < iterations.length; stepIdx++) {
      const stepVars = iterations[stepIdx]?.variables || [];
      stepVars.forEach(v => {
        accumulatedVars[v.name] = {
          name: v.name,
          type: v.type,
          value: v.value,
          lastUpdatedStep: stepIdx
        };
      });
    }
    
    // Get current step variables for change detection
    const currentStepVars = iterations[currentStep]?.variables || [];
    const currentStepVarMap = {};
    currentStepVars.forEach(v => {
      currentStepVarMap[v.name] = v.value;
    });
    
    // Get previous step variables for change detection
    const prevStepVars = currentStep > 0 ? iterations[currentStep - 1]?.variables || [] : [];
    const prevStepVarMap = {};
    prevStepVars.forEach(v => {
      prevStepVarMap[v.name] = v.value;
    });
    
    // Build final variables list
    const vars = Object.values(accumulatedVars)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(v => ({
        name: v.name,
        type: v.type,
        value: v.value,
        changed: v.name in currentStepVarMap && 
                 v.name in prevStepVarMap && 
                 currentStepVarMap[v.name] !== prevStepVarMap[v.name]
      }));
    
    return { currentVars: vars };
  }, [iterations, currentStep]);

  // Get output lines that have appeared up to current step
  const outputLines = useMemo(() => {
    if (iterations.length === 0) return [];

    const lines = [];
    let lastOutput = '';
    
    // Process each step up to current
    for (let i = 0; i <= currentStep && i < iterations.length; i++) {
      const currentOutput = iterations[i].output || '';
      
      // Find new lines since last step
      if (currentOutput && currentOutput !== lastOutput) {
        const allLines = currentOutput.split('\n').filter(l => l.trim());
        const lastLines = lastOutput.split('\n').filter(l => l.trim());
        
        // Add only new lines
        allLines.forEach(line => {
          if (!lastLines.includes(line) && !lines.includes(line)) {
            lines.push(line);
          }
        });
      }
      
      lastOutput = currentOutput;
    }
    
    return lines;
  }, [iterations, currentStep]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Interactive Code Execution</h3>
            <p className="text-gray-600 mt-1">Step through code execution with real-time variable tracking</p>
          </div>
          {fileName && (
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${
                getLanguageFromExtension(fileName) === 'cpp' 
                  ? 'bg-red-500' 
                  : getLanguageFromExtension(fileName) === 'python'
                  ? 'bg-blue-500'
                  : 'bg-gray-500'
              }`}></div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{getLanguageFromExtension(fileName)}</div>
                <div className="text-sm font-medium text-gray-900 truncate max-w-32">{fileName}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code Editor */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Code Editor
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Source Code
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".cpp,.c,.java,.js,.py"
                        className="hidden"
                        id="code-file-upload"
                      />
                      <label 
                        htmlFor="code-file-upload"
                        className="flex-1 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#001F3F] hover:bg-gray-50 transition-all duration-200 text-center font-medium"
                      >
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          {fileName || 'Choose a file (.cpp, .py, java, js)' }
                        </div>
                      </label>
                      {fileName && (
                        <button
                          onClick={resetAll}
                          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Code Preview
                    </label>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm h-96 relative">
                      {uploadedCode ? (
                        <pre className="whitespace-pre">
                          {uploadedCode.split('\n').map((line, index) => (
                            <div 
                              key={index} 
                              className={`flex items-center py-0.5 ${
                                iterations.length > 0 && 
                                currentStep < iterations.length && 
                                iterations[currentStep].line === index + 1 
                                  ? 'bg-yellow-900/30' 
                                  : ''
                              }`}
                            >
                              <span className={`text-gray-500 w-8 flex-shrink-0 select-none text-right pr-2 font-mono ${
                                iterations.length > 0 && 
                                currentStep < iterations.length && 
                                iterations[currentStep].line === index + 1 
                                  ? 'text-yellow-400 font-bold' 
                                  : ''
                              }`}>
                                {index + 1}
                              </span>
                              {iterations.length > 0 && 
                               currentStep < iterations.length && 
                               iterations[currentStep].line === index + 1 ? (
                                <span className="text-yellow-400 mr-2">▶</span>
                              ) : (
                                <span className="w-4 mr-2"></span>
                              )}
                              <span className="flex-grow">
                                {line || ' '}
                              </span>
                            </div>
                          ))}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-center px-4">
                          <div>
                            <div className="mb-2">📤 Upload a code file to visualize execution</div>
                            <div className="text-xs text-gray-400">
                              Supported: C++, Python, Java, JavaScript
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Execution Controls */}
                  {iterations.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={goToFirstStep}
                            disabled={currentStep === 0}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              currentStep === 0
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-[#001F3F] text-white hover:bg-[#001429] shadow-sm'
                            }`}
                          >
                            ⏪ First
                          </button>
                          <button
                            onClick={goToPrevStep}
                            disabled={currentStep === 0}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              currentStep === 0
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-[#001F3F] text-white hover:bg-[#001429] shadow-sm'
                            }`}
                          >
                            ⬅ Prev
                          </button>
                          <button
                            onClick={goToNextStep}
                            disabled={currentStep === iterations.length - 1}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              currentStep === iterations.length - 1
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-[#001F3F] text-white hover:bg-[#001429] shadow-sm'
                            }`}
                          >
                            Next ➡
                          </button>
                          <button
                            onClick={goToLastStep}
                            disabled={currentStep === iterations.length - 1}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              currentStep === iterations.length - 1
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-[#001F3F] text-white hover:bg-[#001429] shadow-sm'
                            }`}
                          >
                            Last ⏩
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-700">
                            Step <span className="font-bold text-[#001F3F]">{currentStep + 1}</span> of {iterations.length}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Speed:</span>
                            <select
                              value={playbackSpeed}
                              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                              className="px-2 py-1 border border-gray-300 rounded text-sm bg-white shadow-sm"
                            >
                              <option value={0.5}>0.5x</option>
                              <option value={1}>1x</option>
                              <option value={2}>2x</option>
                              <option value={3}>3x</option>
                            </select>
                          </div>
                          
                          {isPlaying ? (
                            <button
                              onClick={stopPlayback}
                              className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-medium flex items-center shadow-sm"
                            >
                              ⏹ Stop
                            </button>
                          ) : (
                            <button
                              onClick={startPlayback}
                              disabled={currentStep === iterations.length - 1}
                              className={`px-3 py-1.5 rounded text-sm font-medium flex items-center shadow-sm ${
                                currentStep === iterations.length - 1
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              ▶ Play
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 font-medium text-center border border-blue-200">
                        {iterations[currentStep]?.description || `Line ${iterations[currentStep]?.line || '?'}`}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={simulateCompilation}
                      disabled={!uploadedCode || isProcessing}
                      className={`px-6 py-3 rounded-lg font-medium flex items-center shadow-lg transition-all duration-200 ${
                        !uploadedCode || isProcessing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#001F3F] to-gray-800 text-white hover:from-[#001429] hover:to-gray-900 transform hover:-translate-y-0.5'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ▶ Visualize Execution
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Variables & Output */}
          <div className="space-y-6">
            {/* Variable Tracking Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Variables
                </h3>
              </div>
              <div className="p-5">
                {variableData.currentVars.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {variableData.currentVars.map((variable, index) => (
                          <tr 
                            key={index} 
                            className={`${variable.changed ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3 text-sm font-mono font-medium text-gray-800">
                              {variable.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                variable.type === 'int' ? 'bg-blue-100 text-blue-800' :
                                variable.type === 'float' ? 'bg-green-100 text-green-800' :
                                variable.type === 'array' ? 'bg-purple-100 text-purple-800' :
                                variable.type === 'bool' ? 'bg-red-100 text-red-800' :
                                variable.type === 'string' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {variable.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${
                              variable.changed 
                                ? 'text-blue-700 font-bold' 
                                : 'text-gray-800'
                            }`}>
                              {variable.value}
                              {variable.changed && (
                                <span className="ml-2 text-xs text-blue-600">↑ changed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6M5 12h14M5 6h14M5 18h14" />
                    </svg>
                    <p className="text-sm">Upload and run code to see variables</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Real-Time Output Display */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Console Output
                </h3>
              </div>
              <div className="p-5">
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm min-h-32 max-h-64 overflow-y-auto">
                  {outputLines.length > 0 ? (
                    <div className="space-y-1">
                      {outputLines.map((line, index) => (
                        <div 
                          key={index}
                          className={`py-1 pl-2 border-l-2 ${
                            index === outputLines.length - 1 && currentStep < iterations.length - 1
                              ? 'border-l-green-400 bg-green-900/20 animate-pulse rounded-r'
                              : 'border-l-gray-700'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : iterations.length > 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      <div className="flex justify-center mb-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-1 animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-1 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <div>Waiting for output...</div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      Run code to see output
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoopVisualizer;