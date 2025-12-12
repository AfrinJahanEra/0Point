import React, { useState, useEffect } from 'react';

const CodeVisualizer = ({ algorithmId, algorithmCode, inputData }) => {
  const [customCode, setCustomCode] = useState(algorithmCode || '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int t;\n    cin >> t;\n    while(t--) {\n        int n;\n        cin >> n;\n        vector<int> a(n);\n        for(int i = 0; i < n; i++) {\n            cin >> a[i];\n        }\n        int ans = INT_MAX;\n        for(int i = 0; i < n-1; i++) {\n            ans = min(ans, a[i] * a[i+1]);\n        }\n        cout << ans << endl;\n    }\n    return 0;\n}');
  const [executionSteps, setExecutionSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [variables, setVariables] = useState({});
  const [callStack, setCallStack] = useState(['main']);
  const [highlightedLines, setHighlightedLines] = useState([1]);
  const [memoryAllocation, setMemoryAllocation] = useState({});
  const [programCounter, setProgramCounter] = useState(1);
  const [output, setOutput] = useState('');
  const [inputValues, setInputValues] = useState('');

  // Parse code into lines with line numbers
  const parseCode = (code) => {
    if (!code) return [];
    return code.trim().split('\n').map((line, index) => ({
      lineNumber: index + 1,
      content: line,
      indent: line.search(/\S/)
    }));
  };

  const codeLines = parseCode(customCode);

  // Initialize with sample input data
  useEffect(() => {
    if (inputData) {
      if (typeof inputData === 'string') {
        setInputValues(inputData);
      } else if (Array.isArray(inputData)) {
        setInputValues(inputData.join('\n'));
      }
    } else {
      setInputValues('2\n5\n3 4 2 1 5\n4\n2 3 1 4');
    }
  }, [inputData]);

  // Simulate C++ code execution
  const simulateExecution = () => {
    const steps = [];
    let stepCount = 1;
    
    // Parse input values
    const inputLines = inputValues.trim().split('\n');
    let inputIndex = 0;
    
    // Variables for simulation
    let t = 0, n = 0, a = [];
    let ans = 0;
    let i = 0;
    
    // Memory addresses (simulated)
    const memory = {
      't': { type: 'int', value: 0, address: '0x1000' },
      'n': { type: 'int', value: 0, address: '0x1004' },
      'a': { type: 'vector<int>', value: [], address: '0x2000' },
      'ans': { type: 'int', value: 0, address: '0x3000' },
      'i': { type: 'int', value: 0, address: '0x3004' },
      'INT_MAX': { type: 'const int', value: 2147483647, address: '0x4000' }
    };
    
    // Step 1: Include statement
    steps.push({
      stepNumber: stepCount++,
      line: 1,
      description: 'Including header files',
      variables: {},
      callStack: ['main'],
      highlightedLines: [1],
      memory: { ...memory },
      programCounter: 1,
      output: ''
    });
    
    // Step 2: Namespace
    steps.push({
      stepNumber: stepCount++,
      line: 2,
      description: 'Using standard namespace',
      variables: {},
      callStack: ['main'],
      highlightedLines: [2],
      memory: { ...memory },
      programCounter: 2,
      output: ''
    });
    
    // Step 3: Main function start
    steps.push({
      stepNumber: stepCount++,
      line: 4,
      description: 'Entering main function',
      variables: {},
      callStack: ['main'],
      highlightedLines: [4],
      memory: { ...memory },
      programCounter: 4,
      output: ''
    });
    
    // Step 4: Reading t
    if (inputIndex < inputLines.length) {
      t = parseInt(inputLines[inputIndex++]);
      memory['t'].value = t;
      
      steps.push({
        stepNumber: stepCount++,
        line: 5,
        description: `Reading number of test cases: t = ${t}`,
        variables: { t },
        callStack: ['main'],
        highlightedLines: [5],
        memory: { ...memory },
        programCounter: 5,
        output: ''
      });
    }
    
    // Step 5: While loop start
    steps.push({
      stepNumber: stepCount++,
      line: 6,
      description: `Starting while loop (t = ${t})`,
      variables: { t },
      callStack: ['main'],
      highlightedLines: [6],
      memory: { ...memory },
      programCounter: 6,
      output: ''
    });
    
    let testCaseCount = 1;
    
    while (t > 0 && inputIndex < inputLines.length) {
      // Step: Inside while loop
      steps.push({
        stepNumber: stepCount++,
        line: 6,
        description: `Test case ${testCaseCount}, t = ${t}`,
        variables: { t },
        callStack: ['main'],
        highlightedLines: [6],
        memory: { ...memory },
        programCounter: 6,
        output: ''
      });
      
      // Step: Reading n
      if (inputIndex < inputLines.length) {
        n = parseInt(inputLines[inputIndex++]);
        memory['n'].value = n;
        
        steps.push({
          stepNumber: stepCount++,
          line: 7,
          description: `Reading array size: n = ${n}`,
          variables: { t, n },
          callStack: ['main'],
          highlightedLines: [7],
          memory: { ...memory },
          programCounter: 7,
          output: ''
        });
      }
      
      // Step: Creating vector
      steps.push({
        stepNumber: stepCount++,
        line: 8,
        description: `Creating vector<int> a of size ${n}`,
        variables: { t, n },
        callStack: ['main'],
        highlightedLines: [8],
        memory: { ...memory },
        programCounter: 8,
        output: ''
      });
      
      // Read array elements
      a = [];
      if (inputIndex < inputLines.length) {
        const elements = inputLines[inputIndex++].split(' ').map(Number);
        a = elements.slice(0, n);
        memory['a'].value = [...a];
        
        steps.push({
          stepNumber: stepCount++,
          line: 9,
          description: `Reading array elements: [${a.join(', ')}]`,
          variables: { t, n, a: [...a] },
          callStack: ['main'],
          highlightedLines: [9],
          memory: { ...memory },
          programCounter: 9,
          output: ''
        });
        
        // For loop to show element reading
        for (let idx = 0; idx < n; idx++) {
          memory['i'].value = idx;
          
          steps.push({
            stepNumber: stepCount++,
            line: 10,
            description: `Reading a[${idx}] = ${a[idx]}`,
            variables: { t, n, a: [...a], i: idx },
            callStack: ['main'],
            highlightedLines: [10],
            memory: { ...memory },
            programCounter: 10,
            output: ''
          });
        }
      }
      
      // Step: Initialize ans with INT_MAX
      ans = 2147483647;
      memory['ans'].value = ans;
      
      steps.push({
        stepNumber: stepCount++,
        line: 12,
        description: `Initializing ans = INT_MAX (${ans})`,
        variables: { t, n, a: [...a], ans },
        callStack: ['main'],
        highlightedLines: [12],
        memory: { ...memory },
        programCounter: 12,
        output: ''
      });
      
      // Step: For loop to find min product
      steps.push({
        stepNumber: stepCount++,
        line: 13,
        description: `Starting loop to find minimum product of adjacent elements`,
        variables: { t, n, a: [...a], ans },
        callStack: ['main'],
        highlightedLines: [13],
        memory: { ...memory },
        programCounter: 13,
        output: ''
      });
      
      for (i = 0; i < n - 1; i++) {
        memory['i'].value = i;
        
        steps.push({
          stepNumber: stepCount++,
          line: 13,
          description: `Loop iteration ${i + 1}/${n - 1}, i = ${i}`,
          variables: { t, n, a: [...a], ans, i },
          callStack: ['main'],
          highlightedLines: [13],
          memory: { ...memory },
          programCounter: 13,
          output: ''
        });
        
        const product = a[i] * a[i + 1];
        
        steps.push({
          stepNumber: stepCount++,
          line: 14,
          description: `Calculating product: a[${i}] * a[${i + 1}] = ${a[i]} * ${a[i + 1]} = ${product}`,
          variables: { t, n, a: [...a], ans, i, product },
          callStack: ['main'],
          highlightedLines: [14],
          memory: { ...memory },
          programCounter: 14,
          output: ''
        });
        
        if (product < ans) {
          ans = product;
          memory['ans'].value = ans;
          
          steps.push({
            stepNumber: stepCount++,
            line: 14,
            description: `Updating ans = min(${ans}, ${product}) = ${product}`,
            variables: { t, n, a: [...a], ans, i, product },
            callStack: ['main'],
            highlightedLines: [14],
            memory: { ...memory },
            programCounter: 14,
            output: ''
          });
        } else {
          steps.push({
            stepNumber: stepCount++,
            line: 14,
            description: `ans remains ${ans} (${product} is not smaller)`,
            variables: { t, n, a: [...a], ans, i, product },
            callStack: ['main'],
            highlightedLines: [14],
            memory: { ...memory },
            programCounter: 14,
            output: ''
          });
        }
      }
      
      // Step: Output result
      steps.push({
        stepNumber: stepCount++,
        line: 15,
        description: `Outputting result: ${ans}`,
        variables: { t, n, a: [...a], ans },
        callStack: ['main'],
        highlightedLines: [15],
        memory: { ...memory },
        programCounter: 15,
        output: `${steps[steps.length - 1]?.output || ''}${ans}\n`
      });
      
      // Step: Decrement t
      t--;
      memory['t'].value = t;
      testCaseCount++;
      
      steps.push({
        stepNumber: stepCount++,
        line: 6,
        description: `Decrementing t to ${t}`,
        variables: { t, n, a: [...a], ans },
        callStack: ['main'],
        highlightedLines: [6],
        memory: { ...memory },
        programCounter: 6,
        output: `${steps[steps.length - 1]?.output || ''}`
      });
    }
    
    // Step: Return statement
    steps.push({
      stepNumber: stepCount++,
      line: 17,
      description: 'Returning from main function',
      variables: { t, n, a: [...a], ans },
      callStack: ['main'],
      highlightedLines: [17],
      memory: { ...memory },
      programCounter: 17,
      output: steps[steps.length - 1]?.output || ''
    });
    
    // Step: Program end
    steps.push({
      stepNumber: stepCount++,
      line: 18,
      description: 'Program execution completed',
      variables: { t, n, a: [...a], ans },
      callStack: [],
      highlightedLines: [18],
      memory: { ...memory },
      programCounter: 18,
      output: steps[steps.length - 1]?.output || ''
    });
    
    return steps;
  };

  // Initialize execution steps
  useEffect(() => {
    const steps = simulateExecution();
    setExecutionSteps(steps);
    setCurrentStep(0);
    setIsRunning(false);
    
    if (steps.length > 0) {
      const firstStep = steps[0];
      setVariables(firstStep.variables || {});
      setCallStack(firstStep.callStack || []);
      setHighlightedLines(firstStep.highlightedLines || []);
      setMemoryAllocation(firstStep.memory || {});
      setProgramCounter(firstStep.programCounter || 1);
      setOutput(firstStep.output || '');
    }
  }, [customCode, inputValues]);

  // Run/pause execution
  const toggleExecution = () => {
    setIsRunning(!isRunning);
  };

  // Reset visualization
  const resetVisualization = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setVariables({});
    setCallStack(['main']);
    setHighlightedLines([1]);
    setMemoryAllocation({});
    setProgramCounter(1);
    setOutput('');
  };

  // Step forward
  const stepForward = () => {
    if (currentStep < executionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      updateStateFromStep(currentStep + 1);
    }
  };

  // Step backward
  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      updateStateFromStep(currentStep - 1);
    }
  };

  // Update state based on current step
  const updateStateFromStep = (stepIndex) => {
    const step = executionSteps[stepIndex];
    if (step) {
      setVariables(step.variables || {});
      setCallStack(step.callStack || []);
      setHighlightedLines(step.highlightedLines || []);
      setMemoryAllocation(step.memory || {});
      setProgramCounter(step.programCounter || 1);
      setOutput(step.output || '');
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isRunning && currentStep < executionSteps.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          const next = prev + 1;
          updateStateFromStep(next);
          if (next >= executionSteps.length - 1) {
            setIsRunning(false);
          }
          return next;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isRunning, executionSteps, speed]);

  // Render memory visualization
  const renderMemoryVisualization = () => {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">Memory Allocation</h3>
        {Object.keys(memoryAllocation).length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold bg-gray-200 p-2 rounded">
              <div>Variable</div>
              <div>Type</div>
              <div>Address</div>
              <div>Value</div>
            </div>
            {Object.entries(memoryAllocation).map(([key, value]) => (
              <div key={key} className="grid grid-cols-4 gap-2 text-sm p-2 border-b border-gray-200 hover:bg-gray-100">
                <div className="font-mono font-medium text-blue-600">{key}</div>
                <div className="text-gray-600">{value.type}</div>
                <div className="font-mono text-green-600">{value.address}</div>
                <div className="font-mono">
                  {value.type === 'array' || value.type === 'vector<int>'
                    ? `[${value.value.join(', ')}]`
                    : String(value.value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No memory allocated</p>
        )}
      </div>
    );
  };

  // Render call stack
  const renderCallStack = () => {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">Call Stack</h3>
        {callStack.length > 0 ? (
          <div className="space-y-1">
            {callStack.map((func, index) => (
              <div
                key={index}
                className={`font-mono text-sm px-3 py-2 rounded ${
                  index === callStack.length - 1
                    ? 'bg-green-100 border-l-4 border-green-500'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <span className="text-gray-500 mr-2">{callStack.length - index}.</span>
                {func}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Call stack is empty</p>
        )}
      </div>
    );
  };

  // Render current step info
  const renderStepInfo = () => {
    const currentStepData = executionSteps[currentStep] || {};
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Step Information</h3>
        <p className="text-sm text-blue-700 mb-3">
          {currentStepData.description || 'No step information available'}
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs text-blue-600">
          <div className="bg-white p-2 rounded border border-blue-100">
            <div className="font-semibold">Line</div>
            <div>{currentStepData.line || 'N/A'}</div>
          </div>
          <div className="bg-white p-2 rounded border border-blue-100">
            <div className="font-semibold">Step</div>
            <div>{currentStep + 1} / {executionSteps.length}</div>
          </div>
          <div className="bg-white p-2 rounded border border-blue-100">
            <div className="font-semibold">PC</div>
            <div>{programCounter}</div>
          </div>
        </div>
      </div>
    );
  };

  // Render variable table
  const renderVariableTable = () => {
    const varEntries = Object.entries(variables);
    if (varEntries.length === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Variables</h3>
          <p className="text-gray-500 text-sm">No variables defined</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">Variables</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-3 text-left">Name</th>
                <th className="py-2 px-3 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {varEntries.map(([key, value]) => (
                <tr key={key} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-2 px-3 font-mono font-medium text-blue-600">{key}</td>
                  <td className="py-2 px-3 font-mono">
                    {Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div id="code-visualizer" className="flex flex-col h-full">
      <style>
        {`
        /* Custom scrollbar styling - ash color and transparent */
        #code-visualizer ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        
        #code-visualizer ::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 6px;
        }
        
        #code-visualizer ::-webkit-scrollbar-thumb {
          background: #9ca3af; /* ash color */
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        #code-visualizer ::-webkit-scrollbar-thumb:hover {
          background: #6b7280; /* darker ash color on hover */
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        #code-visualizer ::-webkit-scrollbar-corner {
          background: transparent;
        }
        `}
      </style>
      {/* Controls Bar - Top */}
      <div className="bg-white p-4 rounded-t-lg border-b border-gray-200 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleExecution}
            className={`px-5 py-2.5 rounded-md font-medium flex items-center gap-2 ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-800 hover:bg-blue-900 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Run
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={stepBackward}
              disabled={currentStep === 0}
              className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-md font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Prev
            </button>

            <button
              onClick={stepForward}
              disabled={currentStep >= executionSteps.length - 1}
              className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-md font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <button
            onClick={resetVisualization}
            className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-md font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reset
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-700">Speed:</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="p-2 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2000">0.5x</option>
              <option value="1000">1x</option>
              <option value="500">2x</option>
              <option value="250">4x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-grow gap-4">
        {/* Left Panel - Code */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm flex-grow">
            <div className="space-y-1">
              {codeLines.map((line) => (
                <div
                  key={line.lineNumber}
                  className={`flex ${
                    highlightedLines.includes(line.lineNumber)
                      ? 'bg-yellow-500 bg-opacity-20 border-l-4 border-yellow-500 pl-2'
                      : ''
                  }`}
                >
                  <span className="text-gray-500 mr-4 w-8 select-none text-right">
                    {line.lineNumber}
                  </span>
                  <span
                    className="flex-grow"
                    style={{ paddingLeft: `${line.indent * 8}px` }}
                  >
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Visualization Panels */}
        <div className="lg:w-1/3 space-y-4">
          {/* Step Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Currently executed line</h3>
            <p className="text-sm text-blue-700 mb-2">
              {executionSteps[currentStep]?.description || 'Program not started'}
            </p>
            <div className="text-xs text-blue-600">
              <span className="font-semibold">Step:</span> {currentStep + 1} of {executionSteps.length}
            </div>
          </div>

          {/* Variables */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Variables</h3>
            {Object.keys(variables).length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(variables).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0">
                    <span className="font-mono text-blue-600">{key}</span>
                    <span className="font-mono bg-white px-2 py-1 rounded border">
                      {Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No variables defined</p>
            )}
          </div>

          {/* Input/Output */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Sample Input</h3>
              <div className="w-full h-24 font-mono text-sm p-3 border border-gray-300 rounded-md bg-white overflow-auto">
                <pre className="whitespace-pre-wrap text-sm">{inputValues}</pre>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Code Output</h3>
              <div className="w-full h-24 font-mono text-sm p-3 border border-gray-300 rounded-md bg-white overflow-auto">
                <pre className="whitespace-pre-wrap text-sm">{output}</pre>
              </div>
            </div>
          </div>

          {/* Memory Allocation */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Memory Allocation</h3>
            {Object.keys(memoryAllocation).length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(memoryAllocation).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 text-sm p-2 border-b border-gray-200 hover:bg-gray-100 last:border-0">
                    <div className="font-mono font-medium text-blue-600">{key}</div>
                    <div className="font-mono text-green-600">{value.address}</div>
                    <div className="font-mono truncate">
                      {value.type === 'array' || value.type === 'vector<int>'
                        ? `[${value.value.join(', ')}]`
                        : String(value.value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No memory allocated</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeVisualizer;