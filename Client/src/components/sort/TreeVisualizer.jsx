import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const TreeVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [rotationPhase, setRotationPhase] = useState(null); // 'breaking', 'rotating', 'attaching'
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
          // Stop automatically when we reach the end
          if (onStop) onStop();
        }
      }, 2000); // Advance every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop]);

  // Ensure currentStep doesn't exceed steps length
  useEffect(() => {
    if (steps && steps.length > 0 && currentStep >= steps.length) {
      // Reset to last valid step
      // This should be handled by the parent component, but we add this as a safety check
    }
  }, [steps, currentStep]);

  // Reset completion status when steps change
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [steps]);
  
  // Handle rotation phases for AVL trees
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (isRotationStep(currentStepData)) {
      // Clear any existing timeouts
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
      }
      window.rotationTimeouts = [];
      
      // Start rotation sequence
      setRotationPhase('breaking');
      
      // After a delay, move to rotating phase
      const rotatingTimer = setTimeout(() => {
        setRotationPhase('rotating');
        
        // After another delay, move to attaching phase
        const attachingTimer = setTimeout(() => {
          setRotationPhase('attaching');
          
          // After final delay, reset phase
          const resetTimer = setTimeout(() => {
            setRotationPhase(null);
          }, 1000);
          
          window.rotationTimeouts.push(resetTimer);
        }, 1000);
        
        window.rotationTimeouts.push(attachingTimer);
      }, 1000);
      
      window.rotationTimeouts.push(rotatingTimer);
    } else {
      // Clear any existing timeouts when not in rotation step
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
        window.rotationTimeouts = [];
      }
      setRotationPhase(null);
    }
    
    // Cleanup function
    return () => {
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
        window.rotationTimeouts = [];
      }
    };
  }, [currentStep, steps]);

  // Function to get node styling based on state
  const getNodeStyle = (stepData, nodeValue) => {
    // Add null check for stepData
    if (!stepData) {
      return "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-white text-black border-gray-400";
    }
    
    let baseStyle = "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 ";
    
    // Add animation classes based on state
    if (stepData.insertedValue !== undefined && stepData.insertedValue === nodeValue) {
      baseStyle += "animate-pulse scale-110 ";
    }
    
    // Handle different algorithm states based on operation
    if (stepData.insertedValue !== undefined && stepData.insertedValue === nodeValue) {
      baseStyle += "bg-blue-500 text-white border-blue-600"; // Inserted node
    } else if (stepData.comparing !== undefined && stepData.comparing === nodeValue) {
      baseStyle += "bg-gray-300 text-black border-gray-700"; // Comparing node
    } else if (stepData.found !== undefined && stepData.found === nodeValue) {
      baseStyle += "bg-green-500 text-white border-green-600"; // Found node
    } else if (isRotationStep(stepData) && getRotationNodeValue(stepData) === nodeValue) {
      // Use rotation phase to determine animation
      if (rotationPhase === 'breaking') {
        baseStyle += "bg-yellow-500 text-white border-yellow-600 animate-pulse opacity-70"; // Breaking phase
      } else if (rotationPhase === 'rotating') {
        const rotationType = getRotationType(stepData);
        if (rotationType === 'left' || rotationType === 'right') {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-spin"; // Single rotation with spin
        } else {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-pulse"; // Double rotation with pulse
        }
      } else if (rotationPhase === 'attaching') {
        baseStyle += "bg-green-500 text-white border-green-600 animate-bounce"; // Attaching phase
      } else {
        // Default rotation styling
        const rotationType = getRotationType(stepData);
        if (rotationType === 'left' || rotationType === 'right') {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-spin"; // Single rotation with spin
        } else {
          baseStyle += "bg-purple-500 text-white border-purple-600 animate-pulse"; // Double rotation with pulse
        }
      }
    } else {
      baseStyle += "bg-white text-black border-gray-400";
    }
    
    // Add hover effect
    if (hoveredNode === nodeValue) {
      baseStyle += " transform scale-110 shadow-lg ";
    }
    
    return baseStyle;
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    // Add null check for stepData and operation
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting tree visualization...';
    } else if (operation === 'insert_root') {
      return `Inserting root node with value ${stepData.insertedValue}`;
    } else if (operation === 'traverse') {
      return `Traversing to insert ${stepData.insertedValue}, currently at node ${stepData.comparing}`;
    } else if (operation === 'insert') {
      return `Inserting node with value ${stepData.insertedValue} as child of ${stepData.comparing}`;
    } else if (operation === 'rotate') {
      // Add rotation phase information
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
    } else if (operation === 'insert_start') {
      return `Starting insertion of word "${stepData.insertedWord}"`;
    } else if (operation === 'create_node') {
      return `Creating node for character '${stepData.currentChar}' in path "${stepData.path}"`;
    } else if (operation === 'mark_end') {
      return `Marking end of word "${stepData.insertedWord}" at character '${stepData.currentChar}'`;
    } else if (operation === 'complete') {
      return 'Tree construction complete!';
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

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Tree Visualization Steps', 105, 15, null, null, 'center');
    
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
        // Draw tree visualization based on algorithm type
        if (step.operation && (
          step.operation.includes('trie') || 
          step.operation === 'start' || 
          step.operation === 'insert_start' || 
          step.operation === 'create_node' || 
          step.operation === 'traverse' || 
          step.operation === 'mark_end' || 
          step.operation === 'complete'
        )) {
          // For Trie, center it better on the page
          drawTrieInPDF(doc, step.tree || { children: {}, isEnd: false }, '', 105, 60);
        } else {
          // For other trees, center it better on the page
          drawTreeInPDF(doc, step.tree, 105, 60);
        }
      } else {
        doc.text('Empty tree', 105, 60, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('tree-steps.pdf');
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
    
    // Draw rotation indicator for AVL trees
    // Note: In PDF we can't show animations, but we can show a text indicator
    // This would require passing the current step data to know if this node is being rotated
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

  // Recursive function to render tree nodes
  const renderTreeNode = (node, x, y, level = 0, isLeft = false, parentX = null, parentY = null) => {
    if (!node) return null;
    
    const nodeId = `${level}-${x}-${y}`;
    const nodeSize = 30; // Increased from 20 to 30
    const horizontalSpacing = Math.max(150 / (level + 1), 60);
    const verticalSpacing = 80;
    
    // Check if this node is involved in a rotation
    const isRotation = isRotationStep(currentStepData);
    const rotationType = getRotationType(currentStepData);
    const rotationNodeValue = getRotationNodeValue(currentStepData);
    
    // Determine if this node is the rotation node or related to it
    const isRotationNode = node.value === rotationNodeValue;
    const isRotationRelated = isRotation && (isRotationNode || 
      (node.left && node.left.value === rotationNodeValue) || 
      (node.right && node.right.value === rotationNodeValue));
    
    // Apply rotation animation classes
    let nodeClass = "cursor-pointer hover:stroke-blue-500 transition-all duration-500";
    
    // Special styling for rotation phases
    if (isRotation && isRotationNode) {
      if (rotationPhase === 'breaking') {
        nodeClass += " fill-yellow-500 stroke-yellow-600 animate-pulse opacity-70";
      } else if (rotationPhase === 'rotating') {
        nodeClass += " fill-purple-500 stroke-purple-600";
        // Add spin or pulse based on rotation type
        if (rotationType === 'left' || rotationType === 'right') {
          nodeClass += " animate-spin";
        } else {
          nodeClass += " animate-pulse";
        }
      } else if (rotationPhase === 'attaching') {
        nodeClass += " fill-green-500 stroke-green-600 animate-bounce";
      } else {
        // Default rotation animation
        nodeClass += " fill-purple-500 stroke-purple-600";
        if (rotationType === 'left' || rotationType === 'right') {
          nodeClass += " animate-spin";
        } else {
          nodeClass += " animate-pulse";
        }
      }
    }
    
    // Special styling for related nodes during rotation
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
        {/* Render connections to children */}
        {node.left && renderTreeNode(
          node.left, 
          x - horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          true, 
          x, 
          y
        )}
        {node.right && renderTreeNode(
          node.right, 
          x + horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          false, 
          x, 
          y
        )}
        
        {/* Render connection line to parent */}
        {parentX !== null && parentY !== null && (
          <line
            x1={x}
            y1={y}
            x2={parentX}
            y2={parentY}
            stroke="#9CA3AF"
            strokeWidth="2"
            className={isRotationRelated ? "transition-all duration-500 " + (rotationPhase === 'breaking' ? 'stroke-dashed stroke-yellow-500 opacity-50' : rotationPhase === 'attaching' ? 'stroke-green-500 animate-pulse' : 'stroke-purple-500') : 'stroke-gray-400'}
          />
        )}
        
        {/* Render node circle */}
        <circle
          cx={x}
          cy={y}
          r={nodeSize / 2}
          fill="#FFFFFF"
          stroke="#9CA3AF"
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
          className="font-bold text-black"
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
        
        {/* Render rotation indicator with phase */}
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
              {rotationType.toUpperCase()}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Function to render trie nodes
  const renderTrieNode = (node, prefix = '', x = 300, y = 50, level = 0) => {
    if (!node) return null;
    
    const nodeId = `${prefix}-${level}`;
    const nodeSize = 30; // Increased node size for better visibility
    const verticalSpacing = 70; // Increased vertical spacing
    const horizontalSpacing = Math.max(200 / (level + 1), 80); // Increased horizontal spacing
    
    // Get the character for this node (last character of prefix, or 'root' for root)
    const nodeLabel = prefix ? prefix.slice(-1) : 'root';
    
    return (
      <g key={nodeId}>
        {/* Render node circle */}
        <circle
          cx={x}
          cy={y}
          r={nodeSize / 2}
          fill={node.isEnd ? "#10B981" : "#FFFFFF"} // Green for end nodes
          stroke="#9CA3AF"
          strokeWidth="2"
          className="cursor-pointer hover:stroke-blue-500 transition-all duration-300 drop-shadow-sm"
          onMouseEnter={() => setHoveredNode(prefix || 'root')}
          onMouseLeave={() => setHoveredNode(null)}
        />
        
        {/* Render node value (character) */}
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className="font-bold text-black text-base drop-shadow-sm"
        >
          {nodeLabel}
        </text>
        
        {/* Render end marker for end nodes */}
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
        
        {/* Render children */}
        {node.children && Object.keys(node.children).map((char, index) => {
          const child = node.children[char];
          // Calculate child position with better spacing
          const childX = x + (index - (Object.keys(node.children).length - 1) / 2) * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          return (
            <g key={`${nodeId}-${char}`}>
              {/* Connection line with arrow marker */}
              <line
                x1={x}
                y1={y + nodeSize / 2}
                x2={childX}
                y2={childY - nodeSize / 2}
                stroke="#9CA3AF"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              
              {/* Character label on the line */}
              <text
                x={(x + childX) / 2}
                y={(y + childY) / 2 - 10}
                textAnchor="middle"
                className="text-sm text-blue-600 font-bold bg-white px-1 rounded"
              >
                {char}
              </text>
              
              {/* Child node */}
              {renderTrieNode(child, prefix + char, childX, childY, level + 1)}
            </g>
          );
        })}
      </g>
    );
  };

  if (!data || !steps || steps.length === 0) return null;

  // Check if visualization has completed (safety check)
  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  // Ensure currentStep doesn't exceed steps length
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));

  // Get current step data
  const currentStepData = steps[safeCurrentStep];

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Tree Visualization</h3>
        <div className="flex gap-2">
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
        {/* Single animated frame showing current step */}
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
                  {/* Define arrow marker for connection lines */}
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
                  {currentStepData.operation && (
                    currentStepData.operation.includes('trie') || 
                    currentStepData.operation === 'start' || 
                    currentStepData.operation === 'insert_start' || 
                    currentStepData.operation === 'create_node' || 
                    currentStepData.operation === 'traverse' || 
                    currentStepData.operation === 'mark_end' || 
                    currentStepData.operation === 'complete'
                  )
                    ? renderTrieNode(currentStepData.tree || { children: {}, isEnd: false }, '', 350, 80) 
                    : renderTreeNode(currentStepData.tree, 300, 100)}
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
          </div>
        </div>
      </div>
      
      {/* Show all steps in a separate frame with visualizations */}
      <div className="mt-6 border border-gray-200 p-4 bg-white">
        <h4 className="text-md font-bold text-blue-800 mb-3">All Steps:</h4>
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`p-3 border rounded transition-all ${index === currentStep ? 'bg-blue-50 border-blue-800 shadow-sm' : 'bg-white border-gray-300'}`}
              id={`step-${index}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-black">Step {index + 1}</div>
                  <div className="text-gray-600 text-sm mt-1">{getOperationDescription(step)}</div>
                  
                  {/* Visual representation of this step */}
                  <div className="mt-3 min-h-[200px] flex items-center justify-center overflow-auto">
                    {step.tree || step.operation ? (
                      <div className="w-full min-h-[200px] overflow-auto">
                        <svg width="100%" height="400" className="border border-gray-200 rounded min-w-[400px]" viewBox="0 0 400 400">
                          {/* Define arrow marker for connection lines */}
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
                          {step.operation && (
                            step.operation.includes('trie') || 
                            step.operation === 'start' || 
                            step.operation === 'insert_start' || 
                            step.operation === 'create_node' || 
                            step.operation === 'traverse' || 
                            step.operation === 'mark_end' || 
                            step.operation === 'complete'
                          )
                            ? renderTrieNode(step.tree || { children: {}, isEnd: false }, '', 250, 50) 
                            : renderTreeNode(step.tree, 200, 80)}
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        Empty tree
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TreeVisualizer;