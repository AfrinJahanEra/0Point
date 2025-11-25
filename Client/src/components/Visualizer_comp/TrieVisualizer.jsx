import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const TrieVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);

  // Auto-advance every 2 seconds automatically
  useEffect(() => {
    if (isPlaying && steps && steps.length > 0) {
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          if (onNext) onNext();
        } else {
          if (onStop) onStop();
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop]);

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Trie Visualization Steps', 105, 15, null, null, 'center');
    
    // Add steps with visual representations - one step per page
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      // Add a new page for each step (except the first one)
      if (index > 0) {
        doc.addPage();
      }
      
      // Add step header
      doc.setFontSize(16);
      doc.text(`Step ${index + 1} of ${steps.length}`, 105, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(getOperationDescription(step), 105, 35, null, null, 'center');
      
      // Add a visual representation of the trie
      if (step.tree || step.operation) {
        drawTrieInPDF(doc, step.tree || { children: {}, isEnd: false }, '', 105, 60);
      } else {
        doc.text('Empty trie', 105, 60, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('trie-steps.pdf');
  };
  
  // Helper function to draw trie in PDF
  const drawTrieInPDF = (doc, node, prefix = '', x = 105, y = 45, level = 0) => {
    if (!node) return;
    
    const nodeSize = 5; // Increased node size
    const verticalSpacing = 40; // Increased spacing
    const horizontalSpacing = Math.max(60 / (level + 1), 25); // Increased horizontal spacing
    
    // Get the character for this node (last character of prefix, or 'root' for root)
    const nodeLabel = prefix ? prefix.slice(-1) : 'root';
    
    // Draw node circle
    if (node.isEnd) {
      doc.setFillColor(16, 185, 129); // green-500
    } else {
      doc.setFillColor(255, 255, 255); // white
    }
    doc.setDrawColor(156, 163, 175); // gray-400
    doc.setLineWidth(0.7); // Slightly thicker lines
    doc.circle(x, y, nodeSize, 'FD');
    
    // Draw node value
    doc.setFontSize(8); // Larger font
    doc.setTextColor(0, 0, 0); // black
    doc.text(nodeLabel, x, y + 2, null, null, 'center');
    
    // Draw end marker for end nodes
    if (node.isEnd) {
      doc.setFontSize(6);
      doc.setTextColor(16, 185, 129); // green-500
      doc.text('END', x, y - 10, null, null, 'center'); // Moved further up
    }
    
    // Draw children
    const children = node.children ? Object.keys(node.children) : [];
    children.forEach((char, index) => {
      const child = node.children[char];
      const childX = x + (index - (children.length - 1) / 2) * horizontalSpacing;
      const childY = y + verticalSpacing;
      
      // Connection line
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.7);
      doc.line(x, y + nodeSize, childX, childY - nodeSize); // Adjusted line endpoints
      
      // Character label on the line
      doc.setFontSize(7);
      doc.setTextColor(59, 130, 246); // blue-600
      doc.text(char, (x + childX) / 2, (y + childY) / 2 - 3, null, null, 'center'); // Moved up slightly
      
      // Child node
      drawTrieInPDF(doc, child, prefix + char, childX, childY, level + 1);
    });
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting Trie visualization...';
    } else if (operation === 'insert_start') {
      return `Starting insertion of word "${stepData.insertedWord}"`;
    } else if (operation === 'create_node') {
      return `Creating node for character '${stepData.currentChar}' in path "${stepData.path}"`;
    } else if (operation === 'traverse') {
      return `Traversing to character '${stepData.currentChar}' in path "${stepData.path}"`;
    } else if (operation === 'mark_end') {
      return `Marking end of word "${stepData.insertedWord}" at character '${stepData.currentChar}'`;
    } else if (operation === 'complete') {
      return 'Trie construction complete!';
    } else {
      return 'Processing...';
    }
  };

  // Function to render trie nodes
  const renderTrieNode = (node, prefix = '', x = 300, y = 50, level = 0) => {
    if (!node) return null;
    
    const nodeId = `${prefix}-${level}`;
    const nodeSize = 30;
    const verticalSpacing = 70;
    const horizontalSpacing = Math.max(200 / (level + 1), 80);
    
    const nodeLabel = prefix ? prefix.slice(-1) : 'root';
    
    return (
      <g key={nodeId}>
        <circle
          cx={x}
          cy={y}
          r={nodeSize / 2}
          fill={node.isEnd ? "#10B981" : "#FFFFFF"}
          stroke="#9CA3AF"
          strokeWidth="2"
          className="cursor-pointer hover:stroke-blue-500 transition-all duration-300 drop-shadow-sm"
          onMouseEnter={() => setHoveredNode(prefix || 'root')}
          onMouseLeave={() => setHoveredNode(null)}
        />
        
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className="font-bold text-black text-base drop-shadow-sm"
        >
          {nodeLabel}
        </text>
        
        {node.isEnd && (
          <text
            x={x}
            y={y - 25}
            textAnchor="middle"
            className="text-xs text-green-600 font-bold drop-shadow-sm"
          >
            END
          </text>
        )}
        
        {node.children && Object.keys(node.children).map((char, index) => {
          const child = node.children[char];
          const childX = x + (index - (Object.keys(node.children).length - 1) / 2) * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          return (
            <g key={`${nodeId}-${char}`}>
              <line
                x1={x}
                y1={y + nodeSize / 2}
                x2={childX}
                y2={childY - nodeSize / 2}
                stroke="#9CA3AF"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              
              <text
                x={(x + childX) / 2}
                y={(y + childY) / 2 - 10}
                textAnchor="middle"
                className="text-sm text-blue-600 font-bold bg-white px-1 rounded"
              >
                {char}
              </text>
              
              {renderTrieNode(child, prefix + char, childX, childY, level + 1)}
            </g>
          );
        })}
      </g>
    );
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Trie Visualization</h3>
        <div className="flex gap-2">
          {/* ADDED: Download PDF Button */}
          <button 
            onClick={downloadStepsAsPDF}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
          >
            Download PDF
          </button>
          {isPlaying ? null : isCompleted ? (
            <button 
              onClick={() => {
                if (onRestart) {
                  onRestart();
                }
              }}
              className="px-3 py-1 bg-blue-800 text-white rounded text-sm font-medium hover:bg-blue-900 transition-colors flex items-center"
            >
              Play Again
            </button>
          ) : null}
        </div>
      </div>
      
      <div className="bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto">
        <div className="mb-6 bg-white p-3 border-2 border-gray-300">
          <h4 className="text-sm font-bold text-black mb-2 flex items-center">
            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs mr-2">
              {safeCurrentStep + 1}
            </span>
            Step {safeCurrentStep + 1} of {steps.length}
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black text-xs font-medium rounded">
              Current
            </span>
          </h4>
          
          <div className="flex justify-center items-center mb-3 overflow-auto py-2 max-h-[500px]">
            {currentStepData ? (
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-auto">
                <svg width="100%" height="500" className="border border-gray-200 rounded min-w-[600px]" viewBox="0 0 600 500">
                  <defs>
                    <marker 
                      id="arrowhead" 
                      markerWidth="10" 
                      markerHeight="7" 
                      refX="9" 
                      refY="3.5" 
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
                    </marker>
                  </defs>
                  
                  {renderTrieNode(currentStepData.tree || { children: {}, isEnd: false }, '', 350, 80)}
                </svg>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Empty trie
              </div>
            )}
          </div>
          
          <div className="text-center p-2 bg-white border border-gray-200">
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(currentStepData)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 border border-gray-200 p-4 bg-white">
        <h4 className="text-md font-bold text-blue-800 mb-3">All Steps:</h4>
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {steps.map((step, index) => {
            return (
              <div 
                key={index}
                className={`p-3 border rounded transition-all ${index === currentStep ? 'bg-blue-50 border-blue-800 shadow-sm' : 'bg-white border-gray-300'}`}
                id={`step-${index}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-black">Step {index + 1}</div>
                    <div className="text-gray-600 text-sm mt-1">{getOperationDescription(step)}</div>
                    
                    <div className="mt-3 min-h-[200px] flex items-center justify-center overflow-auto">
                      {step.tree || step.operation ? (
                        <div className="w-full min-h-[200px] overflow-auto">
                          <svg width="100%" height="400" className="border border-gray-200 rounded min-w-[400px]" viewBox="0 0 400 400">
                            <defs>
                              <marker 
                                id="arrowhead" 
                                markerWidth="10" 
                                markerHeight="7" 
                                refX="9" 
                                refY="3.5" 
                                orient="auto"
                              >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
                              </marker>
                            </defs>
                            
                            {renderTrieNode(step.tree || { children: {}, isEnd: false }, '', 250, 50)}
                          </svg>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          Empty trie
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrieVisualizer;