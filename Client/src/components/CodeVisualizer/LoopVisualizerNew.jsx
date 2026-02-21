import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../../utils/api';

const LoopVisualizer = () => {
  const [uploadedCode, setUploadedCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [iterations, setIterations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [finalOutput, setFinalOutput] = useState('');
  const [executingLine, setExecutingLine] = useState(-1);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);

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

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      setUploadedCode(content);
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

  // Simulate code compilation and line-by-line execution
  const simulateCompilation = async () => {
    if (!uploadedCode) {
      alert("Upload code first");
      return;
    }

    setIsProcessing(true);

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

  // Determine variable type from value
  const getVariableType = (value) => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'int' : 'float';
    }
    
    if (typeof value === 'string') {
      if (value === 'true' || value === 'false' || value === 'True' || value === 'False') {
        return 'bool';
      }
      if (value.startsWith('[') && value.endsWith(']')) {
        return 'array';
      }
      if (!isNaN(value) && !isNaN(parseFloat(value))) {
        return value.includes('.') ? 'float' : 'int';
      }
      if (value.includes('vector') || value.includes('std::')) {
        return 'array';
      }
      return 'string';
    }
    
    if (Array.isArray(value)) {
      return 'array';
    }
    
    if (value !== null && typeof value === 'object') {
      return 'object';
    }
    
    return 'unknown';
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
    setUploadedCode('');
    setFileName('');
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

  // Variable tracking (only real variables)
  const variableData = useMemo(() => {
    if (iterations.length === 0) return { currentVars: [] };

    const currentStepVars = iterations[currentStep]?.variables || [];
    const prevStepVars = currentStep > 0 ? iterations[currentStep - 1]?.variables || [] : [];
    
    // Build variables list
    const vars = [];
    const allVarNames = new Set();
    
    currentStepVars.forEach(v => allVarNames.add(v.name));
    prevStepVars.forEach(v => allVarNames.add(v.name));
    
    Array.from(allVarNames).sort().forEach(name => {
      const currentVar = currentStepVars.find(v => v.name === name);
      const prevVar = prevStepVars.find(v => v.name === name);
      
      vars.push({
        name,
        type: currentVar?.type || prevVar?.type || 'unknown',
        value: currentVar?.value || '—',
        changed: currentVar && prevVar && currentVar.value !== prevVar.value
      });
    });
    
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