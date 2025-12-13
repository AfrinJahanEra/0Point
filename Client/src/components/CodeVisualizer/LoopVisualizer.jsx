import React, { useState, useRef } from 'react';

const LoopVisualizer = () => {
  const [uploadedCode, setUploadedCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [loopVariables, setLoopVariables] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

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
      setLoopVariables([]);
      setIterations([]);
      setOutput('');
    };
    
    reader.readAsText(file);
  };

  // Simulate code compilation and loop detection
  const simulateCompilation = () => {
    if (!uploadedCode) {
      alert('Please upload a code file first');
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      try {
        // Extract loops and variables (simplified simulation)
        const extractedData = extractLoopData(uploadedCode);
        setLoopVariables(extractedData.variables);
        setIterations(extractedData.iterations);
        setOutput(extractedData.output);
      } catch (error) {
        console.error('Compilation simulation error:', error);
        setOutput('Error in code compilation simulation: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  // Simplified loop data extraction (in a real app, this would be more complex)
  const extractLoopData = (code) => {
    // This is a simplified simulation - in reality, you'd need a proper parser
    const lines = code.split('\n');
    const variables = [];
    const iterations = [];
    let output = '';
    
    // Look for common loop patterns
    const forLoopRegex = /for\s*\([^)]*\)\s*\{/g;
    const whileLoopRegex = /while\s*\([^)]*\)\s*\{/g;
    const varRegex = /(int|float|double|char|bool|string|let|const|var)\s+(\w+)/g;
    
    // Extract variables
    let varMatch;
    while ((varMatch = varRegex.exec(code)) !== null) {
      if (!variables.includes(varMatch[2])) {
        variables.push(varMatch[2]);
      }
    }
    
    // Simulate iterations for demonstration
    if (variables.length > 0) {
      // Create sample iterations
      for (let i = 0; i < 5; i++) {
        const iteration = { iteration: i + 1 };
        variables.forEach(variable => {
          // Simulate changing values
          if (variable === 'i') {
            iteration[variable] = i;
          } else if (variable === 'sum') {
            iteration[variable] = (i + 1) * (i + 2) / 2;
          } else if (variable === 'count') {
            iteration[variable] = i * 2;
          } else {
            iteration[variable] = `${variable}_${i}`;
          }
        });
        iterations.push(iteration);
      }
      
      output = `Loop executed ${iterations.length} times.\nFinal variable states:\n`;
      variables.forEach(variable => {
        output += `${variable} = ${iterations[iterations.length - 1][variable]}\n`;
      });
    } else {
      // Default simulation if no variables found
      for (let i = 0; i < 3; i++) {
        iterations.push({
          iteration: i + 1,
          i: i,
          j: i * 2,
          temp: `val_${i}`
        });
      }
      
      output = "Sample loop execution:\n";
      iterations.forEach(iter => {
        output += `Iteration ${iter.iteration}: i=${iter.i}, j=${iter.j}, temp=${iter.temp}\n`;
      });
    }
    
    return { variables: [...new Set(variables)], iterations, output };
  };

  // Reset everything
  const resetAll = () => {
    setUploadedCode('');
    setFileName('');
    setLoopVariables([]);
    setIterations([]);
    setOutput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-black shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black">Loop Visualizer</h2>
            <p className="text-gray-600 mt-1">Upload code files and visualize loop iterations</p>
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
                  <div className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm h-64">
                    {uploadedCode ? (
                      <pre>{uploadedCode}</pre>
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
                      'Compile and Visualize Loops'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Visualization and Output */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-black">
              <h3 className="text-lg font-semibold text-black mb-4">Loop Iteration Visualization</h3>
              
              {iterations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Iteration</th>
                        {loopVariables.length > 0 ? (
                          loopVariables.map((variable, index) => (
                            <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {variable}
                            </th>
                          ))
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">i</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">j</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">temp</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {iterations.map((iteration, index) => (
                        <tr 
                          key={index} 
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{iteration.iteration}</td>
                          {loopVariables.length > 0 ? (
                            loopVariables.map((variable, varIndex) => (
                              <td key={varIndex} className="px-4 py-3 text-sm text-gray-700">
                                {iteration[variable]}
                              </td>
                            ))
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-700">{iteration.i}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{iteration.j}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{iteration.temp}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 11-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Upload and compile code to visualize loop iterations</p>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-5 rounded-xl border border-black">
              <h3 className="text-lg font-semibold text-black mb-4">Output</h3>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto">
                {output ? (
                  <pre>{output}</pre>
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