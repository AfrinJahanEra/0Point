import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const TreeVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [rotationPhase, setRotationPhase] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [speed, setSpeed] = useState(2000);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fullscreenContainerRef = useRef(null);
  const containerRef = useRef(null);
  const dragConstraintsRef = useRef(null);
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState({ x: 300, y: 250 });
  const svgRef = useRef(null);

  // State for individual node dragging
  const [draggedNodes, setDraggedNodes] = useState({});
  const [currentlyDraggingNode, setCurrentlyDraggingNode] = useState(null);

  // Handle mouse down for individual node dragging
  const handleNodeMouseDown = useCallback((nodeValue, initialX, initialY, e) => {
    e.stopPropagation();
    setIsDragging(true);
    setCurrentlyDraggingNode(nodeValue);
    setDraggedNodes(prev => ({
      ...prev,
      [nodeValue]: {
        offsetX: e.clientX - initialX,
        offsetY: e.clientY - initialY,
        startX: initialX,
        startY: initialY
      }
    }));
  }, []);

  // Handle mouse move for individual node dragging
  const handleNodeMouseMove = useCallback((e) => {
    if (!isDragging || !currentlyDraggingNode) return;
    
    setDraggedNodes(prev => ({
      ...prev,
      [currentlyDraggingNode]: {
        ...prev[currentlyDraggingNode],
        startX: e.clientX - prev[currentlyDraggingNode].offsetX,
        startY: e.clientY - prev[currentlyDraggingNode].offsetY
      }
    }));
  }, [isDragging, currentlyDraggingNode]);

  // Handle mouse up for individual node dragging
  const handleNodeMouseUp = useCallback(() => {
    setIsDragging(false);
    setCurrentlyDraggingNode(null);
  }, []);

  // Add event listeners for individual node dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleNodeMouseMove);
      document.addEventListener('mouseup', handleNodeMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleNodeMouseMove);
      document.removeEventListener('mouseup', handleNodeMouseUp);
    };
  }, [isDragging, handleNodeMouseMove, handleNodeMouseUp]);

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

  // Initialize node positions when tree changes
  useEffect(() => {
    if (steps && steps[currentStep] && steps[currentStep].tree) {
      initializeNodePositions(steps[currentStep].tree);
    }
  }, [currentStep, steps]);

  // Initialize node positions recursively
  const initializeNodePositions = (node, level = 0, x = 300, y = 100) => {
    if (!node) return;

    setNodePositions(prev => ({
      ...prev,
      [node.value]: { x, y, level }
    }));

    const horizontalSpacing = Math.max(150 / (level + 1), 40);
    const verticalSpacing = 80;

    if (node.left) {
      initializeNodePositions(node.left, level + 1, x - horizontalSpacing, y + verticalSpacing);
    }
    if (node.right) {
      initializeNodePositions(node.right, level + 1, x + horizontalSpacing, y + verticalSpacing);
    }
  };

  // Handle drag start
  const handleDragStart = (event, nodeValue) => {
    setIsDragging(true);
    setDraggedNode(nodeValue);
    
    const rect = containerRef.current.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;
    const nodePos = nodePositions[nodeValue];
    
    setDragOffset({
      x: startX - nodePos.x,
      y: startY - nodePos.y
    });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  // Handle drag - move all nodes together
  const handleDrag = (event, nodeValue) => {
    if (!isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newX = mouseX - dragOffset.x;
    const newY = mouseY - dragOffset.y;

    const deltaX = newX - nodePositions[nodeValue].x;
    const deltaY = newY - nodePositions[nodeValue].y;

    // Move all nodes by the same delta
    const newPositions = { ...nodePositions };
    Object.keys(newPositions).forEach(nodeId => {
      newPositions[nodeId] = {
        ...newPositions[nodeId],
        x: newPositions[nodeId].x + deltaX,
        y: newPositions[nodeId].y + deltaY
      };
    });

    setNodePositions(newPositions);
  };

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFontSize(22);
    doc.text('Tree Visualization Steps', 148.5, 15, null, null, 'center');
    
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      if (index > 0) {
        doc.addPage();
      }
      
      doc.setFontSize(16);
      doc.text(`Step ${index + 1} of ${steps.length}`, 148.5, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(getOperationDescription(step), 148.5, 35, null, null, 'center');
      
      if (step.tree || step.operation) {
        const bbox = calculateTreeBoundingBox(step.tree);
        const pageWidth = 297;
        const pageHeight = 210;
        const availableWidth = pageWidth - 40;
        const availableHeight = pageHeight - 60;
        
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        const treeWidth = bbox.width * scale;
        const treeHeight = bbox.height * scale;
        const x = (pageWidth - treeWidth) / 2 - bbox.minX * scale;
        const y = (availableHeight - treeHeight) / 2 + 50 - bbox.minY * scale;
        
        drawTreeInPDF(doc, step.tree, x, y, 0, null, null, scale);
      } else {
        doc.text('Empty tree', 148.5, 105, null, null, 'center');
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    doc.save('tree-steps.pdf');
  };
  
  const calculateTreeBoundingBox = (node, level = 0, x = 0, y = 0, bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) => {
    if (!node) return bbox;
    
    const nodeSize = 6;
    const horizontalSpacing = Math.max(50 / (level + 1), 20);
    const verticalSpacing = 25;
    
    bbox.minX = Math.min(bbox.minX, x - nodeSize/2);
    bbox.maxX = Math.max(bbox.maxX, x + nodeSize/2);
    bbox.minY = Math.min(bbox.minY, y - nodeSize/2);
    bbox.maxY = Math.max(bbox.maxY, y + nodeSize/2);
    
    if (node.left) {
      calculateTreeBoundingBox(node.left, level + 1, x - horizontalSpacing, y + verticalSpacing, bbox);
    }
    if (node.right) {
      calculateTreeBoundingBox(node.right, level + 1, x + horizontalSpacing, y + verticalSpacing, bbox);
    }
    
    bbox.width = bbox.maxX - bbox.minX + 20;
    bbox.height = bbox.maxY - bbox.minY + 20;
    
    return bbox;
  };
  
  const drawTreeInPDF = (doc, node, x, y, level = 0, parentX = null, parentY = null, scale = 1) => {
    if (!node) return;
    
    const nodeSize = 3 * scale;
    const horizontalSpacing = Math.max(50 / (level + 1), 20) * scale;
    const verticalSpacing = 25 * scale;
    
    if (node.left) {
      drawTreeInPDF(doc, node.left, x - horizontalSpacing, y + verticalSpacing, level + 1, x, y, scale);
    }
    if (node.right) {
      drawTreeInPDF(doc, node.right, x + horizontalSpacing, y + verticalSpacing, level + 1, x, y, scale);
    }
    
    if (parentX !== null && parentY !== null) {
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.5 * scale);
      doc.line(x, y, parentX, parentY);
    }
    
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.5 * scale);
    doc.circle(x, y, nodeSize, 'FD');
    
    doc.setFontSize(6 * scale);
    doc.setTextColor(0, 0, 0);
    doc.text(String(node.value), x, y + 2 * scale, null, null, 'center');
    
    if (node.height) {
      doc.setFontSize(5 * scale);
      doc.setTextColor(107, 114, 128);
      doc.text(`h:${node.height}`, x, y - 8 * scale, null, null, 'center');
    }
  };

  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting tree visualization...';
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
      return 'Tree construction complete!';
    } else {
      return 'Processing...';
    }
  };
  
  const isRotationStep = (stepData) => {
    return stepData && stepData.operation === 'rotate';
  };
  
  const getRotationType = (stepData) => {
    return stepData && stepData.rotation ? stepData.rotation : null;
  };
  
  const getRotationNodeValue = (stepData) => {
    return stepData && stepData.comparing ? stepData.comparing : null;
  };

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

  // Recursive function to render tree nodes with elastic dragging support
  const renderTreeNode = (node, x, y, level = 0, isDragging = false, parentX = null, parentY = null, traversalPath = []) => {
    if (!node) return null;
    
    const nodeId = node.value;
    const currentStepData = steps && steps[currentStep];
    const isRotation = isRotationStep(currentStepData);
    const rotationType = getRotationType(currentStepData);
    const rotationNodeValue = getRotationNodeValue(currentStepData);
    
    const isRotationNode = node.value === rotationNodeValue;
    const isInTraversalPath = traversalPath.includes(node.value) || false;
    const isComparingNode = currentStepData && currentStepData.comparing === node.value;
    const isInsertedNode = currentStepData && currentStepData.insertedValue === node.value;
    
    // Get dragged position if exists
    const draggedPosition = draggedNodes[nodeId];
    const actualX = draggedPosition ? draggedPosition.startX : (nodePositions[nodeId] ? nodePositions[nodeId].x : x);
    const actualY = draggedPosition ? draggedPosition.startY : (nodePositions[nodeId] ? nodePositions[nodeId].y : y);
    
    // Node styling based on state
    let nodeStyle = {};
    if (isInTraversalPath) {
      nodeStyle = { backgroundColor: '#BFDBFE', borderColor: '#3B82F6' };
    } else if (isInsertedNode) {
      nodeStyle = { backgroundColor: '#3B82F6', borderColor: '#2563EB', color: 'white' };
    } else if (isComparingNode) {
      nodeStyle = { backgroundColor: '#D1D5DB', borderColor: '#374151' };
    } else if (isRotation && isRotationNode) {
      if (rotationPhase === 'breaking') {
        nodeStyle = { backgroundColor: '#F59E0B', borderColor: '#D97706', color: 'white' };
      } else if (rotationPhase === 'rotating') {
        nodeStyle = { backgroundColor: '#8B5CF6', borderColor: '#7C3AED', color: 'white' };
      } else if (rotationPhase === 'attaching') {
        nodeStyle = { backgroundColor: '#10B981', borderColor: '#059669', color: 'white' };
      } else {
        nodeStyle = { backgroundColor: '#6366F1', borderColor: '#4F46E5', color: 'white' };
      }
    } else {
      nodeStyle = { backgroundColor: 'white', borderColor: '#9CA3AF', color: 'black' };
    }

    return (
      <React.Fragment key={nodeId}>
        {/* Render connection line to parent */}
        {parentX !== null && parentY !== null && (
          <line
            x1={actualX}
            y1={actualY}
            x2={parentX}
            y2={parentY}
            stroke={isInTraversalPath ? "#3B82F6" : "#9CA3AF"}
            strokeWidth="2"
            className="floating-animation delay-3"
          />
        )}

        {/* Render node as motion div with enhanced floating animation */}
        <motion.div
          className={`node absolute w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm cursor-move select-none transition-all duration-200 ${
            isBeingDragged ? 'shadow-2xl scale-110' : 'hover:scale-105 hover:shadow-lg'
          } ${isRotationNode ? 'animate-pulse' : 'floating-animation glowing delay-1'}`}
          style={{
            left: actualX - 24,
            top: actualY - 24,
            ...nodeStyle
          }}
          drag
          dragConstraints={dragConstraintsRef}
          dragElastic={0}
          onDragStart={(event, info) => handleNodeMouseDown(nodeId, actualX, actualY, event)}
          onDrag={(event, info) => {
            // Update dragged node position
            setDraggedNodes(prev => ({
              ...prev,
              [nodeId]: {
                ...prev[nodeId],
                startX: info.point.x - prev[nodeId].offsetX,
                startY: info.point.y - prev[nodeId].offsetY
              }
            }));
          }}
          onDragEnd={() => {
            setIsDragging(false);
            setCurrentlyDraggingNode(null);
          }}
        >
          <span>{nodeData.value}</span>
        </motion.div>

        {/* Render children */}
        {node.left && renderTreeNode(node.left, x - 150 / (level + 1), y + 80, level + 1, isDragging, actualX, actualY, traversalPath)}
        {node.right && renderTreeNode(node.right, x + 150 / (level + 1), y + 80, level + 1, isDragging, actualX, actualY, traversalPath)}
      </React.Fragment>
    );
  };

  const toggleFullscreen = () => {
    if (!fullscreenContainerRef.current) return;

    if (!isFullscreen) {
      const element = fullscreenContainerRef.current;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestfullscreen();
      }
    } else {
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

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  // Reset all node positions to their original structure
  const resetStructure = () => {
    setDraggedNodes({});
    setCurrentlyDraggingNode(null);
  };

  // Toggle floating mode
  const toggleFloating = () => {
    setIsFloating(!isFloating);
    // Reset position to center when toggling
    if (!isFloating) {
      setTimeout(() => {
        const container = fullscreenContainerRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          setPosition({
            x: containerRect.width / 2,
            y: containerRect.height / 2
          });
        }
      }, 10);
    }
  };

  const handleMouseDown = (event) => {
    event.stopPropagation();
    const svgRect = svgRef.current.getBoundingClientRect();
    const startX = event.clientX - svgRect.left;
    const startY = event.clientY - svgRect.top;

    const handleMouseMove = (event) => {
      const newX = event.clientX - svgRect.left;
      const newY = event.clientY - svgRect.top;

      setPosition({
        x: position.x + (newX - startX),
        y: position.y + (newY - startY)
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const calculateZoomLevel = (tree) => {
    const bbox = calculateTreeBoundingBox(tree);
    const containerWidth = 600;
    const containerHeight = 500;

    const scaleX = containerWidth / bbox.width;
    const scaleY = containerHeight / bbox.height;

    return Math.min(scaleX, scaleY, 1);
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];
  
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
    <div id="tree-visualizer" className="mt-2">
      <style>
        {`
        .node {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
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
        
        /* Faster floating animation for water-like effect - for nodes and edges */
        @keyframes float {
          0% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-4px) translateX(1px);
          }
          50% {
            transform: translateY(-2px) translateX(0px);
          }
          75% {
            transform: translateY(-3px) translateX(0.5px);
          }
          100% {
            transform: translateY(0px) translateX(0px);
          }
        }
        
        /* Screen floating animation for entire tree structure */
        @keyframes screen-float {
          0% {
            transform: translateX(0px);
          }
          25% {
            transform: translateX(10px);
          }
          50% {
            transform: translateX(0px);
          }
          75% {
            transform: translateX(-10px);
          }
          100% {
            transform: translateX(0px);
          }
        }
        
        @keyframes glow {
          0% {
            filter: drop-shadow(0 0 1px rgba(59, 130, 246, 0.2));
          }
          50% {
            filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.4));
          }
          100% {
            filter: drop-shadow(0 0 1px rgba(59, 130, 246, 0.2));
          }
        }
        
        .floating-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        .screen-floating {
          animation: screen-float 8s ease-in-out infinite;
        }
        
        .glowing {
          animation: glow 2s ease-in-out infinite;
        }
        
        /* Staggered animations */
        .delay-1 {
          animation-delay: 0.1s;
        }
        
        .delay-2 {
          animation-delay: 0.2s;
        }
        
        .delay-3 {
          animation-delay: 0.3s;
        }
        
        .delay-4 {
          animation-delay: 0.4s;
        }
        `}
      </style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Tree Visualization</h3>
        <div className="flex gap-2 items-center">
          {/* Speed Control */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">Speed:</span>
            <select 
              value={speed} 
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Medium (1s)</option>
              <option value={2000}>Slow (2s)</option>
              <option value={3000}>Very Slow (3s)</option>
            </select>
          </div>
          
          {/* Reset Structure Button */}
          <button 
            onClick={resetStructure}
            className="px-3 py-1 bg-blue-800 text-white rounded text-sm font-medium hover:bg-blue-900 transition-colors flex items-center"
          >
            Reset Structure
          </button>

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
        className={`group bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}
      >
        <button 
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-90 z-10"
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
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-hidden relative">
                <svg 
                  width="100%" 
                  height="500" 
                  className={`border border-gray-200 rounded min-w-[600px] ${isFullscreen ? '!border-0' : ''}`} 
                  viewBox={`0 0 ${600 * calculateZoomLevel(currentStepData.tree)} 500`}
                >
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
                  
                  {isFloating ? (
                    <g 
                      ref={svgRef}
                      transform={`translate(${position.x - 300 * calculateZoomLevel(currentStepData.tree)}, ${position.y - 250})`}
                      onMouseDown={handleMouseDown}
                      className="cursor-move screen-floating"
                    >
                      {renderTreeNode(currentStepData.tree, 300 * calculateZoomLevel(currentStepData.tree), 100, 0, false, null, null, traversalPath)}
                    </g>
                  ) : (
                    <g className="screen-floating">
                      {renderTreeNode(currentStepData.tree, 300 * calculateZoomLevel(currentStepData.tree), 100, 0, false, null, null, traversalPath)}
                    </g>
                  )}
                </svg>
                
                {isFloating && (
                  <div className="absolute top-2 right-2 z-10">
                    <button 
                      onClick={toggleFloating}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Dock Tree
                    </button>
                  </div>
                )}
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
      
      {/* Steps list remains the same */}
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
                className={`p-3 border rounded transition-all ${index === currentStep ? 'bg-blue-5 border-blue-800 shadow-sm' : 'bg-white border-gray-300'}`}
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
                            
                            {renderStaticTreeNode(step.tree, 200, 80)}
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

// Helper function for static tree rendering in step list
const renderStaticTreeNode = (node, x, y, level = 0, parentX = null, parentY = null) => {
  if (!node) return null;
  
  const nodeSize = 20;
  const horizontalSpacing = Math.max(80 / (level + 1), 30);
  const verticalSpacing = 50;

  return (
    <g key={`${level}-${x}-${y}`}>
      {node.left && renderStaticTreeNode(node.left, x - horizontalSpacing, y + verticalSpacing, level + 1, x, y)}
      {node.right && renderStaticTreeNode(node.right, x + horizontalSpacing, y + verticalSpacing, level + 1, x, y)}
      
      {parentX !== null && parentY !== null && (
        <line
          x1={x}
          y1={y}
          x2={parentX}
          y2={parentY}
          stroke="#9CA3AF"
          strokeWidth="2"
        />
      )}
      
      <circle
        cx={x}
        cy={y}
        r={nodeSize / 2}
        fill="#FFFFFF"
        stroke="#9CA3AF"
        strokeWidth="2"
      />
      
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        className="font-bold text-black text-sm"
      >
        {node.value}
      </text>
    </g>
  );
};

export default TreeVisualizer;