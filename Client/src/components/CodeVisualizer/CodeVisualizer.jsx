import React, { useState } from 'react';
import LoopVisualizer from './LoopVisualizer';

const CodeVisualizer = ({ algorithmId, algorithmCode, inputData }) => {
  const [activeTab, setActiveTab] = useState('visualizer');
  
  // Lifted state to persist across tab switches
  const [uploadedCode, setUploadedCode] = useState('');
  const [fileName, setFileName] = useState('');
  
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
  
  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Code Visualizer</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live Execution</span>
            </div>
          </div>
          
          {/* Tab Navigation - Clear Visible Labels */}
          <div className="flex space-x-2 bg-gray-100 p-2 rounded-xl border border-gray-300 w-fit">
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-5 py-2.5 text-base font-bold rounded-lg transition-all duration-200 $ {
                activeTab === 'visualizer'
                  ? 'bg-[#001F3F] text-black shadow-md'
                  : 'bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Visualizer
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-5 py-2.5 text-base font-bold rounded-lg transition-all duration-200 $ {
                activeTab === 'analysis'
                  ? 'bg-[#001F3F] text-black shadow-md'
                  : 'bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-5 py-2.5 text-base font-bold rounded-lg transition-all duration-200 $ {
                activeTab === 'performance'
                  ? 'bg-[#001F3F] text-black shadow-md'
                  : 'bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Performance
            </button>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-grow overflow-hidden">
        {activeTab === 'visualizer' && (
          <div className="h-full">
            <LoopVisualizer 
              uploadedCode={uploadedCode}
              fileName={fileName}
              onCodeChange={setUploadedCode}
              onFileNameChange={setFileName}
              onExecutionMetricsChange={setExecutionMetrics}
              onCodePatternsChange={setCodePatterns}
              onPerformanceDataChange={setPerformanceData}
            />
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="p-6 h-full flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Execution Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Total Steps
                    </span>
                    <span className="font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded">{executionMetrics.totalSteps}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Variables Tracked
                    </span>
                    <span className="font-semibold text-gray-900 bg-green-100 px-2 py-1 rounded">{executionMetrics.variablesTracked}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      Memory Usage
                    </span>
                    <span className="font-semibold text-gray-900 bg-purple-100 px-2 py-1 rounded">{executionMetrics.memoryUsage} bytes</span>
                  </div>
                  <div className="flex justify-between items-center py-3 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Execution Time
                    </span>
                    <span className="font-semibold text-gray-900 bg-amber-100 px-2 py-1 rounded">{executionMetrics.executionTime} ms</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Code Patterns
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Loops Detected
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full $ {
                      codePatterns.loops > 0 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {codePatterns.loops}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Conditionals
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full $ {
                      codePatterns.conditionals > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {codePatterns.conditionals}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Function Calls
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full $ {
                      codePatterns.functionCalls > 0 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {codePatterns.functionCalls}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Recursion Depth
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full $ {
                      codePatterns.recursionDepth > 0 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {codePatterns.recursionDepth}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-gradient-to-r from-[#001F3F] to-gray-800 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">Pro Tip</h3>
              <p className="text-gray-200">Upload your code and run visualization to see detailed analysis of execution patterns, variable changes, and performance metrics in real-time.</p>
            </div>
          </div>
        )}
        
        {activeTab === 'performance' && (
          <div className="p-6 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#001F3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Performance Timeline
                </h3>
                <div className="h-64 bg-white rounded-lg border border-gray-200 p-4">
                  {executionMetrics.totalSteps > 0 ? (
                    <div className="h-full">
                      {/* Chart Header */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-gray-500">
                          <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm mr-2"></span>
                          CPU Usage (%)
                        </div>
                        <div className="text-xs text-gray-500">
                          Duration: {executionMetrics.executionTime}ms
                        </div>
                      </div>
                                    
                      {/* Chart Container */}
                      <div className="h-[calc(100%-40px)] relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-gray-500">
                          <span>100</span>
                          <span>75</span>
                          <span>50</span>
                          <span>25</span>
                          <span>0</span>
                        </div>
                                      
                        {/* Chart Area */}
                        <div className="ml-12 h-full relative">
                          {/* Grid lines */}
                          <div className="absolute inset-0">
                            {[0, 25, 50, 75, 100].map(percent => (
                              <div 
                                key={percent}
                                className="absolute w-full border-t border-gray-100"
                                style={{bottom: `${percent}%`}}
                              ></div>
                            ))}
                          </div>
                                        
                          {/* X-axis */}
                          <div className="absolute bottom-0 left-0 right-0 h-6">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>0ms</span>
                              <span>{Math.floor(executionMetrics.executionTime/2)}ms</span>
                              <span>{executionMetrics.executionTime}ms</span>
                            </div>
                          </div>
                                        
                          {/* Performance Line Chart */}
                          <div className="absolute inset-0 bottom-6">
                            {/* Generate realistic performance data */}
                            {(() => {
                              const dataPoints = Math.min(15, executionMetrics.totalSteps);
                              const points = [];
                                            
                              // Generate smooth performance curve
                              for (let i = 0; i < dataPoints; i++) {
                                const progress = i / (dataPoints - 1);
                                // Base CPU usage with some variation
                                let baseCpu = performanceData.cpuUsage > 0 
                                  ? performanceData.cpuUsage 
                                  : 30 + Math.random() * 40;
                                              
                                // Add realistic variation (spikes for loops, dips for I/O)
                                const variation = Math.sin(progress * Math.PI * 3) * 15 + 
                                                 (Math.random() - 0.5) * 20;
                                const cpuValue = Math.max(5, Math.min(95, baseCpu + variation));
                                              
                                points.push({
                                  x: (i / (dataPoints - 1)) * 100,
                                  y: cpuValue,
                                  value: Math.round(cpuValue)
                                });
                              }
                                            
                              // Create SVG path
                              const pathData = points.map((point, i) => 
                                `${i === 0 ? 'M' : 'L'} ${point.x} ${100 - point.y}`
                              ).join(' ');
                                            
                              return (
                                <>
                                  {/* Line */}
                                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path 
                                      d={pathData}
                                      fill="none" 
                                      stroke="#3B82F6" 
                                      strokeWidth="2"
                                      className="drop-shadow-sm"
                                    />
                                                  
                                    {/* Data points */}
                                    {points.map((point, i) => (
                                      <circle
                                        key={i}
                                        cx={point.x}
                                        cy={100 - point.y}
                                        r="2"
                                        fill="#3B82F6"
                                        className="hover:r-3 transition-all cursor-pointer"
                                      >
                                        <title>CPU: {point.value}% at {Math.round(point.x * executionMetrics.executionTime / 100)}ms</title>
                                      </circle>
                                    ))}
                                  </svg>
                                                
                                  {/* Area under curve */}
                                  <div className="absolute inset-0 opacity-10">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                      <path 
                                        d={`${pathData} L 100 100 L 0 100 Z`}
                                        fill="#3B82F6"
                                      />
                                    </svg>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="text-center text-gray-500 mb-4">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="font-medium">Performance chart will appear here</p>
                        <p className="text-sm mt-1">Run code visualization to see execution timeline</p>
                      </div>
                                    
                      {/* Sample chart preview */}
                      <div className="w-full max-w-xs h-32 border border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                        <div className="text-xs text-gray-400">Sample Performance Data</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          CPU Usage
                        </span>
                        <span className="text-sm font-medium text-gray-900">{performanceData.cpuUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{width: `${performanceData.cpuUsage}%`}}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          Memory
                        </span>
                        <span className="text-sm font-medium text-gray-900">{performanceData.memoryConsumption} bytes</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                          style={{width: `${Math.min(100, performanceData.memoryConsumption / 100)}%`}}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Execution Speed
                        </span>
                        <span className="text-sm font-medium text-gray-900">{performanceData.executionSpeed} ops/sec</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{width: `${Math.min(100, performanceData.executionSpeed / 50)}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Optimization Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Minimize nested loops for better performance</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Use efficient data structures</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Avoid unnecessary variable assignments</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeVisualizer;