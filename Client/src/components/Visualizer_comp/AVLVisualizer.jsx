import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const AVLVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [rotationPhase, setRotationPhase] = useState(null);
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

  // Handle rotation phases for AVL trees
  useEffect(() => {
    const currentStepData = steps && steps[currentStep];
    if (isRotationStep(currentStepData)) {
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
      }
      window.rotationTimeouts = [];
      
      setRotationPhase('breaking');
      
      const rotatingTimer = setTimeout(() => {
        setRotationPhase('rotating');
        
        const attachingTimer = setTimeout(() => {
          setRotationPhase('attaching');
          
          const resetTimer = setTimeout(() => {
            setRotationPhase(null);
          }, 1000);
          
          window.rotationTimeouts.push(resetTimer);
        }, 1000);
        
        window.rotationTimeouts.push(attachingTimer);
      }, 1000);
      
      window.rotationTimeouts.push(rotatingTimer);
    } else {
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
        window.rotationTimeouts = [];
      }
      setRotationPhase(null);
    }
    
    return () => {
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
        window.rotationTimeouts = [];
      }
    };
  }, [currentStep, steps]);

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('AVL Tree Visualization Steps', 105, 15, null, null, 'center');
    
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
      
      // Add a visual representation of the tree
      if (step.tree || step.operation) {
        drawTreeInPDF(doc, step.tree, 105, 60);
      } else {
        doc.text('Empty tree', 105, 60, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('avl-steps.pdf');
  };
  
  // Helper function to draw tree in PDF
  const drawTreeInPDF = (doc, node, x, y, level = 0, parentX = null, parentY = null) => {
    if (!node) return;
    
    const nodeSize = 3;
    const horizontalSpacing = Math.max(50 / (level + 1), 20);
    const verticalSpacing = 25;
    
    // Draw connections to children
    if (node.left) {
      drawTreeInPDF(doc, node.left, x - horizontalSpacing, y + verticalSpacing, level + 1, x, y);
    }
    if (node.right) {
      drawTreeInPDF(doc, node.right, x + horizontalSpacing, y + verticalSpacing, level + 1, x, y);
    }
    
    // Draw connection line to parent
    if (parentX !== null && parentY !== null) {
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.5);
      doc.line(x, y, parentX, parentY);
    }
    
    // Draw node circle
    doc.setFillColor(255, 255, 255); // white
    doc.setDrawColor(156, 163, 175); // gray-400
    doc.setLineWidth(0.5);
    doc.circle(x, y, nodeSize, 'FD');
    
    // Draw node value
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0); // black
    doc.text(String(node.value), x, y + 2, null, null, 'center');
    
    // Draw height for AVL trees
    if (node.height) {
      doc.setFontSize(5);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`h:${node.height}`, x, y - 8, null, null, 'center');
    }
  };

  // Function to get node styling based on state
  const getNodeStyle = (stepData, nodeValue) => {
    if (!stepData) {
      return "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-white text-black border-gray-400";
    }
    
    let baseStyle = "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 ";
    
    if (stepData.insertedValue !== undefined && stepData.insertedValue === nodeValue) {
      baseStyle += "animate-pulse scale-110 ";
    }
    
    if (stepData.insertedValue !== undefined && stepData.insertedValue === nodeValue) {
      baseStyle += "bg-blue-500 text-white border-blue-600";
    } else if (stepData.comparing !== undefined && stepData.comparing === nodeValue) {
      baseStyle += "bg-gray-300 text-black border-gray-700";
    } else if (stepData.found !== undefined && stepData.found === nodeValue) {
      baseStyle += "bg-green-500 text-white border-green-600";
    } else if (isRotationStep(stepData) && getRotationNodeValue(stepData) === nodeValue) {
      if (rotationPhase === 'breaking') {
        baseStyle += "bg-yellow-500 text-white border-yellow-600 animate-pulse opacity-70";
      } else if (rotationPhase === 'rotating') {
        const rotationType = getRotationType(stepData);
        if (rotationType === 'left' || rotationType === 'right') {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-spin";
        } else {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-pulse";
        }
      } else if (rotationPhase === 'attaching') {
        baseStyle += "bg-green-500 text-white border-green-600 animate-bounce";
      } else {
        const rotationType = getRotationType(stepData);
        if (rotationType === 'left' || rotationType === 'right') {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-spin";
        } else {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-pulse";
        }
      }
    } else {
      baseStyle += "bg-white text-black border-gray-400";
    }
    
    if (hoveredNode === nodeValue) {
      baseStyle += " transform scale-110 shadow-lg ";
    }
    
    return baseStyle;
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting AVL tree visualization...';
    } else if (operation === 'insert_root') {
      return `Inserting root node with value ${stepData.insertedValue}`;
    } else if (operation === 'insert_start') {
      return `Starting insertion of value ${stepData.insertedValue}`;
    } else if (operation === 'traverse') {
      return `Traversing to insert ${stepData.insertedValue}, currently at node ${stepData.comparing}`;
    } else if (operation === 'insert') {
      return `Inserting node with value ${stepData.insertedValue} as child of ${stepData.comparing}`;
    } else if (operation === 'after_insert') {
      return `Value ${stepData.insertedValue} inserted successfully`;
    } else if (operation === 'duplicate') {
      return `Value ${stepData.insertedValue} already exists in tree`;
    } else if (operation === 'rotate') {
      const phaseDescription = rotationPhase ? 
        `Phase: ${rotationPhase.charAt(0).toUpperCase() + rotationPhase.slice(1)}` : 
        'Starting rotation';
        
      if (stepData.rotation === 'left') {
        return `Left rotation at node ${stepData.comparing} - Right subtree is heavier. ${phaseDescription}`;
      } else if (stepData.rotation === 'right') {
        return `Right rotation at node ${stepData.comparing} - Left subtree is heavier. ${phaseDescription}`;
      } else if (stepData.rotation === 'leftright') {
        return `Left-right rotation at node ${stepData.comparing} - Left-right imbalance. ${phaseDescription}`;
      } else if (stepData.rotation === 'rightleft') {
        return `Right-left rotation at node ${stepData.comparing} - Right-left imbalance. ${phaseDescription}`;
      }
      return `Balancing tree at node ${stepData.comparing}. ${phaseDescription}`;
    } else if (operation === 'complete') {
      return 'AVL tree construction complete!';
    } else {
      return 'Processing...';
    }
  };
  
  // Function to check if current step is a rotation
  const isRotationStep = (stepData) => {
    return stepData && stepData.operation === 'rotate';
  };
  
  // Function to get rotation type
  const getRotationType = (stepData) => {
    return stepData && stepData.rotation ? stepData.rotation : null;
  };
  
  // Function to get rotation node value
  const getRotationNodeValue = (stepData) => {
    return stepData && stepData.comparing ? stepData.comparing : null;
  };

  // Recursive function to find path from root to target node
  const findPathToNode = (node, targetValue, path = []) => {
    if (!node) return null;
    
    const currentPath = [...path, node.value];
    
    if (node.value === targetValue) {
      return currentPath;
    }
    
    const leftPath = findPathToNode(node.left, targetValue, currentPath);
    if (leftPath) return leftPath;
    
    const rightPath = findPathToNode(node.right, targetValue, currentPath);
    if (rightPath) return rightPath;
    
    return null;
  };

  // Recursive function to render AVL tree nodes
  const renderTreeNode = (node, x, y, level = 0, isLeft = false, parentX = null, parentY = null, traversalPath = []) => {
    if (!node) {
      return null;
    }
    
    const nodeId = `${level}-${x}-${y}`;
    const nodeSize = 30;
    const horizontalSpacing = Math.max(150 / (level + 1), 60);
    const verticalSpacing = 80;
    
    const currentStepData = steps && steps[currentStep];
    const isRotation = isRotationStep(currentStepData);
    const rotationType = getRotationType(currentStepData);
    const rotationNodeValue = getRotationNodeValue(currentStepData);
    
    const isRotationNode = node.value === rotationNodeValue;
    const isRotationRelated = isRotation && (isRotationNode || 
      (node.left && node.left.value === rotationNodeValue) || 
      (node.right && node.right.value === rotationNodeValue));
    
    const isInTraversalPath = traversalPath.includes(node.value);
    const isComparingNode = currentStepData && currentStepData.comparing === node.value;
    const isInsertedNode = currentStepData && currentStepData.insertedValue === node.value;
    
    let nodeClass = "cursor-pointer hover:stroke-blue-500 transition-all duration-500";
    
    if (isInTraversalPath) {
      nodeClass += " fill-blue-200 stroke-blue-500 traversal-highlight";
    } else if (isRotation && isRotationNode) {
      if (rotationPhase === 'breaking') {
        nodeClass += " fill-yellow-500 stroke-yellow-600 animate-pulse opacity-70";
      } else if (rotationPhase === 'rotating') {
        nodeClass += " fill-purple-500 stroke-purple-600";
        if (rotationType === 'left' || rotationType === 'right') {
          nodeClass += " animate-spin";
        } else {
          nodeClass += " animate-pulse";
        }
      } else if (rotationPhase === 'attaching') {
        nodeClass += " fill-green-500 stroke-green-600 animate-bounce";
      } else {
        nodeClass += " fill-purple-500 stroke-purple-600";
        if (rotationType === 'left' || rotationType === 'right') {
          nodeClass += " animate-spin";
        } else {
          nodeClass += " animate-pulse";
        }
      }
    } else if (isComparingNode) {
      nodeClass += " fill-gray-300 stroke-gray-700 animate-pulse";
    } else if (isInsertedNode) {
      nodeClass += " fill-blue-500 stroke-blue-600";
    } else {
      nodeClass += " fill-white stroke-gray-400";
    }
    
    if (isRotation && isRotationRelated && !isRotationNode) {
      if (rotationPhase === 'breaking') {
        nodeClass += " opacity-50";
      } else if (rotationPhase === 'rotating') {
        nodeClass += " animate-pulse";
      } else if (rotationPhase === 'attaching') {
        nodeClass += " animate-bounce";
      }
    }
    
    return (
      <g key={nodeId}>
        {/* Render connections to children first */}
        {node.left && renderTreeNode(
          node.left, 
          x - horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          true, 
          x, 
          y,
          traversalPath
        )}
        {node.right && renderTreeNode(
          node.right, 
          x + horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          false, 
          x, 
          y,
          traversalPath
        )}
        
        {/* Render connection line to parent */}
        {parentX !== null && parentY !== null && (
          <line
            x1={x}
            y1={y}
            x2={parentX}
            y2={parentY}
            stroke={isInTraversalPath ? "#3B82F6" : "#9CA3AF"}
            strokeWidth={isInTraversalPath ? "3" : "2"}
            className={isRotationRelated ? "transition-all duration-500 " + (rotationPhase === 'breaking' ? 'stroke-dashed stroke-yellow-500 opacity-50' : rotationPhase === 'attaching' ? 'stroke-green-500 animate-pulse' : 'stroke-purple-500') : (isInTraversalPath ? 'path-connection' : 'stroke-gray-400')}
          />
        )}
        
        {/* Render node circle */}
        <circle
          cx={x}
          cy={y}
          r={nodeSize / 2}
          fill={isInTraversalPath ? "#BFDBFE" : (isInsertedNode ? "#3B82F6" : (isComparingNode ? "#D1D5DB" : "#FFFFFF"))}
          stroke={isInTraversalPath ? "#3B82F6" : (isInsertedNode ? "#2563EB" : (isComparingNode ? "#374151" : "#9CA3AF"))}
          strokeWidth="2"
          className={nodeClass}
          onMouseEnter={() => setHoveredNode(node.value)}
          onMouseLeave={() => setHoveredNode(null)}
        />
        
        {/* Render node value */}
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className={`font-bold ${isInTraversalPath ? 'text-blue-800' : (isInsertedNode ? 'text-white' : (isComparingNode ? 'text-black' : 'text-black'))}`}
        >
          {node.value}
        </text>
        
        {/* Render height for AVL trees */}
        {node.height && (
          <text
            x={x}
            y={y - 20}
            textAnchor="middle"
            className="text-xs text-gray-500"
          >
            h:{node.height}
          </text>
        )}
        
        {/* Render rotation indicator */}
        {isRotation && isRotationNode && (
          <g>
            <rect
              x={x - 30}
              y={y + 20}
              width="60"
              height="20"
              rx="3"
              fill={rotationPhase === 'breaking' ? "#F59E0B" : rotationPhase === 'rotating' ? "#8B5CF6" : rotationPhase === 'attaching' ? "#10B981" : "#6366F1"}
              className="opacity-20"
            />
            <text
              x={x}
              y={y + 35}
              textAnchor="middle"
              className="text-xs font-bold fill-white"
            >
              {rotationPhase ? rotationPhase.toUpperCase() : 'ROTATING'}
            </text>
          </g>
        )}
        
        {/* Render rotation type */}
        {isRotation && isRotationNode && (
          <g>
            <rect
              x={x - 25}
              y={y + 40}
              width="50"
              height="15"
              rx="3"
              fill="#3B82F6"
              className="opacity-20"
            />
            <text
              x={x}
              y={y + 50}
              textAnchor="middle"
              className="text-xs font-bold fill-white"
            >
              {rotationType ? rotationType.toUpperCase() : 'ROTATE'}
            </text>
          </g>
        )}
      </g>
    );
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];
  
  // Build traversal path for current step
  const traversalPath = [];
  if (currentStepData && currentStepData.traversalPath) {
    traversalPath.push(...currentStepData.traversalPath);
  } else if (currentStepData && currentStepData.path) {
    traversalPath.push(...currentStepData.path);
  } else if (currentStepData && currentStepData.operation === 'traverse' && currentStepData.comparing && currentStepData.tree) {
    const fullPath = findPathToNode(currentStepData.tree, currentStepData.comparing);
    if (fullPath) {
      traversalPath.push(...fullPath);
    }
  }

  return (
    <div className="mt-2">
      <style jsx>{`
        .traversal-highlight {
          animation: traversal-pulse 1s ease-in-out;
        }
        
        @keyframes traversal-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .path-connection {
          stroke-dasharray: 5,5;
          animation: path-dash 2s linear infinite;
        }
        
        @keyframes path-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">AVL Tree Visualization</h3>
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
                  
                  {renderTreeNode(currentStepData.tree, 300, 100, 0, false, null, null, traversalPath)}
                </svg>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Empty tree
              </div>
            )}
          </div>
          
          <div className="text-center p-2 bg-white border border-gray-200">
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(currentStepData)}
            </p>
            {traversalPath.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Traversal Path: {traversalPath.join(' → ')}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 border border-gray-200 p-4 bg-white">
        <h4 className="text-md font-bold text-blue-800 mb-3">All Steps:</h4>
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {steps.map((step, index) => {
            const stepTraversalPath = [];
            if (step.traversalPath) {
              stepTraversalPath.push(...step.traversalPath);
            } else if (step.path) {
              stepTraversalPath.push(...step.path);
            } else if (step.operation === 'traverse' && step.comparing && step.tree) {
              const fullPath = findPathToNode(step.tree, step.comparing);
              if (fullPath) {
                stepTraversalPath.push(...fullPath);
              }
            }
            
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
                            
                            {renderTreeNode(step.tree, 200, 80, 0, false, null, null, stepTraversalPath)}
                          </svg>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          Empty tree
                        </div>
                      )}
                    </div>
                    
                    {stepTraversalPath.length > 0 && (
                      <div className="mt-2 text-xs text-blue-600">
                        Path: {stepTraversalPath.join(' → ')}
                      </div>
                    )}
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

export default AVLVisualizer;