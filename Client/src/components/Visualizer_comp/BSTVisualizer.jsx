import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const BSTVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);

  // Auto-advance based on speed setting
  useEffect(() => {
    if (isPlaying && steps && steps.length > 0) {
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          if (onNext) onNext();
        } else {
          if (onStop) onStop();
        }
      }, speed);
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop, speed]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('BST Visualization Steps', 148.5, 15, null, null, 'center');
    
    // Add steps with visual representations - one step per page
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      // Add a new page for each step (except the first one)
      if (index > 0) {
        doc.addPage();
      }
      
      // Add step header
      doc.setFontSize(16);
      doc.text(`Step ${index + 1} of ${steps.length}`, 148.5, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(getOperationDescription(step), 148.5, 35, null, null, 'center');
      
      // Add a visual representation of the tree
      if (step.tree || step.operation) {
        // Calculate bounding box for scaling
        const bbox = calculateTreeBoundingBox(step.tree);
        const pageWidth = 297; // A4 landscape width in mm
        const pageHeight = 210; // A4 landscape height in mm
        const availableWidth = pageWidth - 40; // Leave 20mm margin on each side
        const availableHeight = pageHeight - 60; // Leave space for header and footer
        
        // Calculate scale to fit
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
        
        // Calculate position to center
        const treeWidth = bbox.width * scale;
        const treeHeight = bbox.height * scale;
        const x = (pageWidth - treeWidth) / 2 - bbox.minX * scale;
        const y = (availableHeight - treeHeight) / 2 + 50 - bbox.minY * scale; // +50 for header space
        
        drawTreeInPDF(doc, step.tree, x, y, 0, null, null, scale);
      } else {
        doc.text('Empty tree', 148.5, 105, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('bst-steps.pdf');
  };
  
  // Helper function to calculate tree bounding box
  const calculateTreeBoundingBox = (node, level = 0, x = 0, y = 0, bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) => {
    if (!node) return bbox;
    
    const nodeSize = 6; // Diameter of node circle
    const horizontalSpacing = Math.max(50 / (level + 1), 20);
    const verticalSpacing = 25;
    
    // Update bounding box
    bbox.minX = Math.min(bbox.minX, x - nodeSize/2);
    bbox.maxX = Math.max(bbox.maxX, x + nodeSize/2);
    bbox.minY = Math.min(bbox.minY, y - nodeSize/2);
    bbox.maxY = Math.max(bbox.maxY, y + nodeSize/2);
    
    // Process children
    if (node.left) {
      calculateTreeBoundingBox(node.left, level + 1, x - horizontalSpacing, y + verticalSpacing, bbox);
    }
    if (node.right) {
      calculateTreeBoundingBox(node.right, level + 1, x + horizontalSpacing, y + verticalSpacing, bbox);
    }
    
    // Add some padding
    bbox.width = bbox.maxX - bbox.minX + 20;
    bbox.height = bbox.maxY - bbox.minY + 20;
    
    return bbox;
  };
  
  // Helper function to draw tree in PDF
  const drawTreeInPDF = (doc, node, x, y, level = 0, parentX = null, parentY = null, scale = 1) => {
    if (!node) return;
    
    const nodeSize = 3 * scale;
    const horizontalSpacing = Math.max(50 / (level + 1), 20) * scale;
    const verticalSpacing = 25 * scale;
    
    // Draw connections to children
    if (node.left) {
      drawTreeInPDF(doc, node.left, x - horizontalSpacing, y + verticalSpacing, level + 1, x, y, scale);
    }
    if (node.right) {
      drawTreeInPDF(doc, node.right, x + horizontalSpacing, y + verticalSpacing, level + 1, x, y, scale);
    }
    
    // Draw connection line to parent
    if (parentX !== null && parentY !== null) {
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.5 * scale);
      doc.line(x, y, parentX, parentY);
    }
    
    // Draw node circle
    doc.setFillColor(255, 255, 255); // white
    doc.setDrawColor(156, 163, 175); // gray-400
    doc.setLineWidth(0.5 * scale);
    doc.circle(x, y, nodeSize, 'FD');
    
    // Draw node value
    doc.setFontSize(6 * scale);
    doc.setTextColor(0, 0, 0); // black
    doc.text(String(node.value), x, y + 2 * scale, null, null, 'center');
  };

  // Function to get node styling based on state
  const getNodeStyle = (stepData, nodeValue) => {
    if (!stepData) {
      return "w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-white text-black border-gray-400";
    }
    
    let baseStyle = "w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 ";
    
    if (stepData.inserted !== undefined && stepData.inserted === nodeValue) {
      baseStyle += "animate-pulse scale-110 ";
    }
    
    if (stepData.inserted !== undefined && stepData.inserted === nodeValue) {
      baseStyle += "bg-blue-500 text-white border-blue-600";
    } else if (stepData.comparing !== undefined && stepData.comparing === nodeValue) {
      baseStyle += "bg-gray-300 text-black border-gray-700";
    } else if (stepData.found !== undefined && stepData.found === nodeValue) {
      baseStyle += "bg-green-500 text-white border-green-600";
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
      return 'Starting BST visualization...';
    } else if (operation === 'insert_root') {
      return `Inserting root node with value ${stepData.inserted}`;
    } else if (operation === 'insert_start') {
      return `Starting insertion of value ${stepData.inserted}`;
    } else if (operation === 'traverse') {
      return `Traversing to insert ${stepData.inserted}, currently at node ${stepData.comparing}`;
    } else if (operation === 'insert') {
      return `Inserting node with value ${stepData.inserted} as child of ${stepData.comparing}`;
    } else if (operation === 'after_insert') {
      return `Value ${stepData.inserted} inserted successfully`;
    } else if (operation === 'duplicate') {
      return `Value ${stepData.inserted} already exists in tree`;
    } else if (operation === 'complete') {
      return 'BST construction complete!';
    } else {
      return 'Processing...';
    }
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

  // Recursive function to render tree nodes
  const renderTreeNode = (node, x, y, level = 0, isLeftChild = false, parentX = null, parentY = null, traversalPath = []) => {
    if (!node) return null;
    
    const nodeId = `${level}-${x}-${y}`;
    const nodeSize = 40;
    const horizontalSpacing = Math.max(200 / (level + 1), 60);
    const verticalSpacing = 80;
    
    // Check if this node is in the traversal path
    const isInTraversalPath = traversalPath.includes(node.value);
    
    // Check if this is the comparing node
    const isComparingNode = steps[currentStep] && steps[currentStep].comparing === node.value;
    
    // Check if this is the inserted node
    const isInsertedNode = steps[currentStep] && steps[currentStep].inserted === node.value;
    
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
            className={isInTraversalPath ? 'path-connection' : 'stroke-gray-400'}
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
          className="cursor-pointer hover:stroke-blue-500 transition-all duration-500"
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
      </g>
    );
  };

  // Toggle fullscreen mode using Fullscreen API
  const toggleFullscreen = () => {
    if (!fullscreenContainerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      const element = fullscreenContainerRef.current;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Handle speed change
  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  if (!data || !steps || steps.length === 0) return null;

  // Check if visualization has completed (safety check)
  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  // Ensure currentStep doesn't exceed steps length
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
      
      <style jsx>{`
        /* Custom scrollbar styling - transparent by default, grey on hover */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        .fullscreen-container::-webkit-scrollbar-thumb,
        .fullscreen-container::-webkit-scrollbar-track,
        .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">BST Visualization</h3>
        <div className="flex gap-2 items-center">
          {/* Speed Control */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">Speed:</span>
            <select 
              value={speed} 
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              disabled={isPlaying}
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Medium (1s)</option>
              <option value={2000}>Slow (2s)</option>
              <option value={3000}>Very Slow (3s)</option>
            </select>
          </div>
          
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
      
      <div 
        ref={fullscreenContainerRef}
        className={`bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative group ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}
      >
        {/* Fullscreen icon positioned like YouTube */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 z-10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        
        <div className={`mb-6 bg-white p-3 border-2 border-gray-300 ${isFullscreen ? '!border-0 !p-0' : ''}`}>
          <h4 className={`text-sm font-bold text-black mb-2 flex items-center ${isFullscreen ? 'hidden' : ''}`}>
            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs mr-2">
              {safeCurrentStep + 1}
            </span>
            Step {safeCurrentStep + 1} of {steps.length}
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black text-xs font-medium rounded">
              Current
            </span>
          </h4>
          
          <div className={`flex justify-center items-center mb-3 overflow-hidden py-2 max-h-[500px] ${isFullscreen ? 'scale-125' : ''}`}>
            {currentStepData ? (
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-hidden">
                <svg width="100%" height="500" className={`border border-gray-200 rounded min-w-[600px] ${isFullscreen ? '!border-0' : ''}`} viewBox="0 0 600 500">
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
          
          <div className={`text-center p-2 bg-white border border-gray-200 ${isFullscreen ? 'hidden' : ''}`}>
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

export default BSTVisualizer;