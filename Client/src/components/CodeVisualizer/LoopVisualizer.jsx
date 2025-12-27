import React, { useState, useRef, useEffect, useMemo } from 'react';

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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const language = getLanguageFromExtension(fileName);
      
      const response = await fetch(`${backendUrl}/api/executor/execute/`, {
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

  // Determine variable type from value (fixed version)
  const getVariableType = (value) => {
    // Handle numbers
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'int' : 'float';
    }
    
    // Handle strings
    if (typeof value === 'string') {
      // Check for boolean
      if (value === 'true' || value === 'false' || value === 'True' || value === 'False') {
        return 'bool';
      }
      
      // Check for array/vector representation
      if (value.startsWith('[') && value.endsWith(']')) {
        return 'array';
      }
      
      // Check for numeric string
      if (!isNaN(value) && !isNaN(parseFloat(value))) {
        return value.includes('.') ? 'float' : 'int';
      }
      
      // Check for common C++ types
      if (value.includes('vector') || value.includes('std::')) {
        return 'array';
      }
      
      return 'string';
    }
    
    // Handle arrays/objects from JSON
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

  // Variable tracking logic
  const variableData = useMemo(() => {
    if (iterations.length === 0) return { allVariables: [], currentVars: [] };

    // Collect all variable names across all steps
    const allVariableNames = new Set();
    iterations.forEach(step => {
      step.variables.forEach(v => allVariableNames.add(v.name));
    });

    // Get current step variables with change detection
    const currentVars = [];
    const currentStepVars = iterations[currentStep]?.variables || [];
    const prevStepVars = currentStep > 0 ? iterations[currentStep - 1]?.variables || [] : [];

    Array.from(allVariableNames).forEach(name => {
      const currentVar = currentStepVars.find(v => v.name === name);
      const prevVar = prevStepVars.find(v => v.name === name);
      
      currentVars.push({
        name,
        type: currentVar?.type || prevVar?.type || 'unknown',
        value: currentVar?.value || '—',
        changed: currentVar && prevVar && currentVar.value !== prevVar.value,
        exists: !!currentVar
      });
    });

    return { 
      allVariables: Array.from(allVariableNames),
      currentVars: currentVars.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [iterations, currentStep]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Code Visualizer</h2>
            <p className="text-gray-600 mt-1">Line-by-line execution with variable tracking</p>
          </div>
          {fileName && (
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                getLanguageFromExtension(fileName) === 'cpp' 
                  ? 'bg-red-100 text-red-800' 
                  : getLanguageFromExtension(fileName) === 'python'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {getLanguageFromExtension(fileName).toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">{fileName}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code Editor */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Code Upload</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Code File
                  </label>
                  <div className="flex items-center space-x-2">
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
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-center"
                    >
                      {fileName || 'Choose a file (.cpp, .py, etc.)'}
                    </label>
                    {fileName && (
                      <button
                        onClick={resetAll}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Editor
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
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={goToFirstStep}
                          disabled={currentStep === 0}
                          className={`px-3 py-1.5 rounded text-sm ${
                            currentStep === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          ⏪ First
                        </button>
                        <button
                          onClick={goToPrevStep}
                          disabled={currentStep === 0}
                          className={`px-3 py-1.5 rounded text-sm ${
                            currentStep === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          ⬅ Prev
                        </button>
                        <button
                          onClick={goToNextStep}
                          disabled={currentStep === iterations.length - 1}
                          className={`px-3 py-1.5 rounded text-sm ${
                            currentStep === iterations.length - 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          Next ➡
                        </button>
                        <button
                          onClick={goToLastStep}
                          disabled={currentStep === iterations.length - 1}
                          className={`px-3 py-1.5 rounded text-sm ${
                            currentStep === iterations.length - 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Last ⏩
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-700">
                          Step <span className="font-bold text-blue-700">{currentStep + 1}</span> of {iterations.length}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Speed:</span>
                          <select
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
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
                            className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center"
                          >
                            ⏹ Stop
                          </button>
                        ) : (
                          <button
                            onClick={startPlayback}
                            disabled={currentStep === iterations.length - 1}
                            className={`px-3 py-1.5 rounded text-sm flex items-center ${
                              currentStep === iterations.length - 1
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            ▶ Play
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800 font-medium text-center">
                      {iterations[currentStep]?.description || `Line ${iterations[currentStep]?.line || '?'}`}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <button
                    onClick={simulateCompilation}
                    disabled={!uploadedCode || isProcessing}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                      !uploadedCode || isProcessing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md'
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
                      '▶ Visualize Execution'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Variables & Output */}
          <div className="space-y-6">
            {/* Variable Tracking Table */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Variables
              </h3>
              
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
                          className={`${variable.changed ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
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
                              ? 'text-blue-700 font-bold bg-blue-50 rounded' 
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
                  <p className="text-xs mt-1 text-gray-400">
                    Variables: {variableData.allVariables.length}
                  </p>
                </div>
              )}
            </div>
            
            {/* Output Display */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Console Output
              </h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm min-h-32">
                {finalOutput ? (
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-gray-400 text-xs">Final Output:</span>
                    </div>
                    <div className="whitespace-pre-wrap bg-gray-800/30 p-3 rounded">
                      {finalOutput}
                    </div>
                  </div>
                ) : iterations.length > 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Execution in progress...
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
  );
};

export default LoopVisualizer;