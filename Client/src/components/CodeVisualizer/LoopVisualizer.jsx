import React, { useState, useRef } from 'react';

const LoopVisualizer = () => {
  const [uploadedCode, setUploadedCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [variables, setVariables] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [output, setOutput] = useState([]);
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
      setVariables([]);
      setIterations([]);
      setOutput([]);
      setFinalOutput('');
      setCurrentStep(0);
      setIsPlaying(false);
      setExecutingLine(-1);
    };
    
    reader.readAsText(file);
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
    const response = await fetch(`${backendUrl}/api/executor/execute/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: "python",
        code: uploadedCode
      })
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Execution failed with status ${response.status}`);
    }

    const data = await response.json();

    // Convert backend steps → frontend format
    const mappedIterations = data.steps.map((step, index) => ({
      step: index + 1,
      executingLine: step.line,
      description: step.description,
      variables: Object.entries(step.variables).map(
        ([name, value]) => ({
          name,
          type: typeof value,
          value
        })
      )
    }));

    setIterations(mappedIterations);
    // Set variables to all unique variables across all steps
    const allUniqueVariables = [];
    const variableNames = new Set();
    
    mappedIterations.forEach(iteration => {
      iteration.variables.forEach(variable => {
        if (!variableNames.has(variable.name)) {
          variableNames.add(variable.name);
          allUniqueVariables.push(variable);
        }
      });
    });
    
    setVariables(allUniqueVariables);
    setOutput(
      data.steps.map((s, i) => [
        `Step ${i + 1}: ${s.description}`,
        ...Object.entries(s.variables).map(
          ([k, v]) => `${k} = ${v}`
        )
      ])
    );

    setFinalOutput(data.final_output);
    setCurrentStep(0);
    setExecutingLine(mappedIterations[0]?.executingLine ?? -1);
  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    setIsProcessing(false);
  }
};


  // Extract line-by-line execution data


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
    setVariables([]);
    setIterations([]);
    setOutput([]);
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
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-black shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black">Code Visualizer</h2>
            <p className="text-gray-600 mt-1">Upload code files and visualize line-by-line execution</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - File Upload and Code Display */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-black">
              <h3 className="text-lg font-semibold text-black mb-4">Code Upload</h3>
              
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
                      className="flex-1 px-4 py-2 bg-white border border-black rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-center"
                    >
                      {fileName || 'Choose a file (.cpp, .c, .java, .js, .py)'}
                    </label>
                    {fileName && (
                      <button
                        onClick={resetAll}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: C++, C, Java, JavaScript, Python
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uploaded Code
                  </label>
                  <div className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm h-64 relative">
                    {uploadedCode ? (
                      <pre>
                        {uploadedCode.split('\n').map((line, index) => (
                          <div 
                            key={index} 
                            className="flex items-center"
                          >
                            <span className="text-gray-500 w-8 flex-shrink-0 select-none text-right pr-2">
                              {index + 1}
                            </span>
                            {iterations.length > 0 && currentStep < iterations.length && 
                             iterations[currentStep].executingLine === index + 1 ? (
                              <span className="text-yellow-400 mr-2">→</span>
                            ) : (
                              <span className="w-4 mr-2"></span>
                            )}
                            <span className="flex-grow">
                              {line}
                            </span>
                          </div>
                        ))}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>No code uploaded yet. Please upload a file to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={simulateCompilation}
                    disabled={!uploadedCode || isProcessing}
                    className={`px-6 py-3 rounded-lg font-medium ${
                      !uploadedCode || isProcessing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#001F3F] text-white hover:bg-[#001F3F]/90 transition-colors'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Compile and Visualize Code'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Visualization and Output */}
          <div className="space-y-6">
            {/* Step Navigation Controls */}
            {iterations.length > 0 && (
              <div className="bg-gray-50 p-5 rounded-xl border border-black">
                <h3 className="text-lg font-semibold text-black mb-4">Execution Navigation</h3>
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={goToFirstStep}
                        disabled={currentStep === 0}
                        className={`px-4 py-2 rounded-lg ${
                          currentStep === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#001F3F] text-white hover:bg-[#001F3F]/90'
                        }`}
                      >
                        First
                      </button>
                      <button
                        onClick={goToPrevStep}
                        disabled={currentStep === 0}
                        className={`px-4 py-2 rounded-lg ${
                          currentStep === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#001F3F] text-white hover:bg-[#001F3F]/90'
                        }`}
                      >
                        Prev
                      </button>
                      <button
                        onClick={goToNextStep}
                        disabled={currentStep === iterations.length - 1}
                        className={`px-4 py-2 rounded-lg ${
                          currentStep === iterations.length - 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#001F3F] text-white hover:bg-[#001F3F]/90'
                        }`}
                      >
                        Next
                      </button>
                      <button
                        onClick={goToLastStep}
                        disabled={currentStep === iterations.length - 1}
                        className={`px-4 py-2 rounded-lg ${
                          currentStep === iterations.length - 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#001F3F] text-white hover:bg-[#001F3F]/90'
                        }`}
                      >
                        Last
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">Speed:</span>
                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        className="p-2 border border-black rounded-md"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="3">3x</option>
                      </select>
                      
                      {isPlaying ? (
                        <button
                          onClick={stopPlayback}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={startPlayback}
                          disabled={currentStep === iterations.length - 1}
                          className={`px-4 py-2 rounded-lg ${
                            currentStep === iterations.length - 1
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          Play
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-700">
                    Step {currentStep + 1} of {iterations.length}
                  </div>
                  
                  {iterations.length > 0 && currentStep < iterations.length && (
                    <div className="text-center text-sm text-yellow-600 font-medium">
                      {iterations[currentStep].description}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Variable Tracking Table */}
            <div className="bg-gray-50 p-5 rounded-xl border border-black">
              <h3 className="text-lg font-semibold text-black mb-4">Variable Tracking</h3>
              
              {variables.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Variable</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        try {
                          // Get current step variables
                          const currentStepVariables = iterations[currentStep]?.variables || [];
                          
                          // Check if we have any variables to display
                          if (currentStepVariables.length === 0) {
                            return (
                              <tr>
                                <td colSpan="3" className="px-4 py-3 text-center text-gray-500">
                                  No variable data available for current step
                                </td>
                              </tr>
                            );
                          }
                          
                          return currentStepVariables.map((variable, index) => {
                            try {
                              return (
                                <tr key={index} className="bg-white">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{variable.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{variable.type}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{String(variable.value)}</td>
                                </tr>
                              );
                            } catch (rowError) {
                              console.error('Error rendering variable row:', rowError);
                              return (
                                <tr key={index}>
                                  <td colSpan="3" className="px-4 py-3 text-red-500">
                                    Error displaying variable {variable.name}
                                  </td>
                                </tr>
                              );
                            }
                          });
                        } catch (tableError) {
                          console.error('Error in variable tracking table:', tableError);
                          return (
                            <tr>
                              <td colSpan="3" className="px-4 py-3 text-red-500">
                                Error loading variable tracking data
                              </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 11-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Upload and compile code to track variables</p>
                  <p className="text-xs mt-2">Variables: {variables.length}, Iterations: {iterations.length}</p>
                </div>
              )}
            </div>
            
            {/* Output Display */}
            <div className="bg-gray-50 p-5 rounded-xl border border-black">
              <h3 className="text-lg font-semibold text-black mb-4">Output</h3>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto">
                {finalOutput && currentStep === iterations.length - 1 ? (
                  <div>
                    <div className="text-gray-400 mb-2">Final Output:</div>
                    <div>{finalOutput}</div>
                  </div>
                ) : output.length > 0 && currentStep < output.length ? (
                  <div>
                    <div className="text-gray-400 mb-2">Step {currentStep + 1} Output:</div>
                    {output[currentStep].map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                ) : output.length > 0 ? (
                  <div>
                    {output.map((stepOutput, stepIndex) => (
                      <div key={stepIndex} className="mb-4">
                        <div className="text-gray-400">Step {stepIndex + 1} Output:</div>
                        {stepOutput.map((line, lineIndex) => (
                          <div key={lineIndex}>{line}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Compilation output will appear here</p>
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