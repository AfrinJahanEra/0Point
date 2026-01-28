import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const AVLVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [rotationPhase, setRotationPhase] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFloating, setIsFloating] = useState(false);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);
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

  // Handle rotation phases for AVL trees with enhanced animations
  useEffect(() => {
    const currentStepData = steps && steps[currentStep];
    if (isRotationStep(currentStepData)) {
      if (window.rotationTimeouts) {
        window.rotationTimeouts.forEach(timeout => clearTimeout(timeout));
      }
      window.rotationTimeouts = [];
      
      setRotationPhase('preparing');
      
      const preparingTimer = setTimeout(() => {
        setRotationPhase('highlighting');
        
        const highlightingTimer = setTimeout(() => {
          setRotationPhase('breaking');
          
          const rotatingTimer = setTimeout(() => {
            setRotationPhase('rotating');
            
            const attachingTimer = setTimeout(() => {
              setRotationPhase('attaching');
              
              const stabilizingTimer = setTimeout(() => {
                setRotationPhase('stabilizing');
                
                const resetTimer = setTimeout(() => {
                  setRotationPhase(null);
                }, 1000);
                
                window.rotationTimeouts.push(resetTimer);
              }, 1000);
              
              window.rotationTimeouts.push(stabilizingTimer);
            }, 1500);
            
            window.rotationTimeouts.push(attachingTimer);
          }, 1500);
          
          window.rotationTimeouts.push(rotatingTimer);
        }, 1000);
        
        window.rotationTimeouts.push(highlightingTimer);
      }, 700);
      
      window.rotationTimeouts.push(preparingTimer);
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
    doc.text('AVL Tree Visualization Steps', 148.5, 15, null, null, 'center');
    
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
    doc.save('avl-steps.pdf');
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
    
    // Draw height for AVL trees
    if (node.height) {
      doc.setFontSize(5 * scale);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`h:${node.height}`, x, y - 8 * scale, null, null, 'center');
    }
  };

  // Function to get node styling based on state
  const getNodeStyle = (stepData, nodeValue) => {
    if (!stepData) {
      return "w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-gradient-to-br from-white to-gray-100 text-gray-800 border-indigo-300 shadow-sm";
    }
    
    let baseStyle = "w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-700 ease-out ";
    
    if (stepData.inserted !== undefined && stepData.inserted === nodeValue) {
      baseStyle += "animate-bounce scale-110 ";
    }
    
    if (stepData.inserted !== undefined && stepData.inserted === nodeValue) {
      baseStyle += "bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-700 shadow-lg shadow-blue-300";
    } else if (stepData.comparing !== undefined && stepData.comparing === nodeValue) {
      baseStyle += "bg-gradient-to-br from-amber-300 to-orange-400 text-gray-800 border-amber-500 animate-pulse shadow-lg shadow-amber-200";
    } else if (stepData.found !== undefined && stepData.found === nodeValue) {
      baseStyle += "bg-gradient-to-br from-emerald-400 to-green-600 text-white border-green-700 shadow-lg shadow-green-300";
    } else {
      baseStyle += "bg-gradient-to-br from-white to-gray-100 text-gray-800 border-indigo-300 shadow-sm";
    }
    
    if (hoveredNode === nodeValue) {
      baseStyle += " transform scale-125 shadow-xl ring-4 ring-indigo-300 ";
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
    } else if (operation === 'rotate') {
      const phaseDescription = rotationPhase ? 
        `Phase: ${rotationPhase.charAt(0).toUpperCase() + rotationPhase.slice(1)}` : 
        'Starting rotation';
        
      if (stepData.rotationType === 'left') {
        return `Left rotation at node ${stepData.comparing} - Right subtree is heavier. ${phaseDescription}`;
      } else if (stepData.rotationType === 'right') {
        return `Right rotation at node ${stepData.comparing} - Left subtree is heavier. ${phaseDescription}`;
      } else if (stepData.rotationType === 'leftright') {
        return `Left-right rotation at node ${stepData.comparing} - Left-right imbalance. ${phaseDescription}`;
      } else if (stepData.rotationType === 'rightleft') {
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

  // Recursive function to render tree nodes with elastic dragging support
  const renderTreeNode = (node, x, y, level = 0, isLeftChild = false, parentX = null, parentY = null, traversalPath = [], comparingNode = null, insertedNode = null, isRotation = false, rotationNode = null, rotationType = null) => {
    if (!node) return null;
    
    const nodeSize = 45;
    // ADJUSTED: Dynamic horizontal spacing based on tree height to accommodate taller trees
    const treeHeight = calculateTreeHeight(node);
    const baseHorizontalSpacing = 200;
    const adjustedHorizontalSpacing = Math.max(baseHorizontalSpacing / (1 + treeHeight * 0.1), 50); // Reduce spacing for taller trees
    const horizontalSpacing = Math.max(adjustedHorizontalSpacing / (level + 1), 40); // Minimum spacing
    const verticalSpacing = 80;
    
    // Get dragged position if exists
    const draggedPosition = draggedNodes[node.value];
    const actualX = draggedPosition ? draggedPosition.startX : x;
    const actualY = draggedPosition ? draggedPosition.startY : y;
    
    // Check if this node is in the traversal path
    const isInTraversalPath = traversalPath.includes(node.value);
    
    // Check if this is the comparing node
    const isComparingNode = comparingNode && comparingNode === node.value;
    
    // Check if this is the inserted node
    const isInsertedNode = insertedNode && insertedNode === node.value;
    
    // Check if this is a rotation node
    const isRotationNode = rotationNode && rotationNode === node.value;
    
    // Check if this node is related to rotation
    const isRotationRelated = isRotation && (isRotationNode || 
      (node.left && node.left.value === rotationNode) || 
      (node.right && node.right.value === rotationNode));
    
    // Highlight nodes involved in rotation
    const isRotationAffected = isRotation && (
      node.value === rotationNode ||
      (node.left && node.left.value === rotationNode) ||
      (node.right && node.right.value === rotationNode)
    );
    
    return (
      <g key={`${level}-${x}-${y}`}>
        {/* Render connections to children first */}
        {node.left && renderTreeNode(
          node.left, 
          x - horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          true, 
          actualX, 
          actualY,
          traversalPath,
          comparingNode,
          insertedNode,
          isRotation,
          rotationNode,
          rotationType
        )}
        {node.right && renderTreeNode(
          node.right, 
          x + horizontalSpacing, 
          y + verticalSpacing, 
          level + 1, 
          false, 
          actualX, 
          actualY,
          traversalPath,
          comparingNode,
          insertedNode,
          isRotation,
          rotationNode,
          rotationType
        )}
        
        {/* Render connection line to parent with enhanced styling */}
        {parentX !== null && parentY !== null && (
          <line
            x1={actualX}
            y1={actualY}
            x2={parentX}
            y2={parentY}
            stroke={isInTraversalPath ? "url(#gradient-traversal)" : (isInsertedNode ? "url(#gradient-insertion)" : (isComparingNode ? "url(#gradient-comparison)" : "url(#gradient-normal)"))}
            strokeWidth="3"
            className={`animated-line stroke-current ${isRotation && isRotationNode && rotationPhase === 'rotating' ? 'spin-animation pulse-grow-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'breaking' ? 'shake-animation flash-animation detach-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'attaching' ? 'swing-animation bounce-animation attach-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'preparing' ? 'pulse-grow-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'stabilizing' ? 'pulse-grow-animation' : ''}`}
            strokeLinecap="round"
            strokeDasharray={isInTraversalPath ? "0" : "5,5"}
            style={{
              animation: isInTraversalPath ? 'pulse 1.5s infinite' : 'none'
            }}
          />
        )}
        
        {/* Render node circle with enhanced floating animation */}
        <g 
          onMouseDown={(e) => handleNodeMouseDown(node.value, actualX, actualY, e)}
          className={`cursor-move floating-animation glowing delay-3 ${isRotation && isRotationNode && rotationPhase === 'rotating' ? 'spin-animation pulse-grow-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'breaking' ? 'shake-animation flash-animation detach-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'attaching' ? 'swing-animation bounce-animation attach-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'preparing' ? 'pulse-grow-animation' : ''} ${isRotation && isRotationNode && rotationPhase === 'stabilizing' ? 'pulse-grow-animation' : ''}`}
        >
          <g transform={`translate(${actualX}, ${actualY})`}>
            <defs>
              <radialGradient id={`node-gradient-${node.value}`} cx="30%" cy="30%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor={
                  isInTraversalPath ? "#3B82F6" : 
                  (isInsertedNode ? "#3B82F6" : 
                  (isComparingNode ? "#F59E0B" : "#93C5FD"))
                } />
              </radialGradient>
            </defs>
            
            {/* Glow effect for special operations */}
            {(isInsertedNode || isComparingNode || isInTraversalPath) && (
              <circle
                r={nodeSize / 2 + 8}
                fill="none"
                stroke="url(#glow-gradient)"
                strokeWidth="2"
                className="animate-ping"
                opacity="0.6"
              />
            )}
            
            <circle
              r={nodeSize / 2}
              fill={isInTraversalPath ? "url(#node-gradient-" + node.value + ")" : (isInsertedNode ? "url(#node-gradient-" + node.value + ")" : (isComparingNode ? "url(#node-gradient-" + node.value + ")" : (isRotationAffected ? "url(#node-gradient-" + node.value + ")" : "url(#node-gradient-" + node.value + ")")))}
              stroke={isInTraversalPath ? "#2563EB" : (isInsertedNode ? "#1D4ED8" : (isComparingNode ? "#D97706" : (isRotationAffected ? "#EF4444" : "#4F46E5")))}
              strokeWidth={isRotationAffected ? "5" : "3"}
              className={`hover:stroke-indigo-700 transition-all duration-700 ease-out ${level % 4 === 0 ? 'delay-1' : level % 4 === 1 ? 'delay-2' : level % 4 === 2 ? 'delay-3' : 'delay-4'} ${isInsertedNode ? 'ring-4 ring-blue-300' : ''} ${isRotationAffected ? 'animate-pulse ring-2 ring-red-400' : ''}`}
              onMouseEnter={() => setHoveredNode(node.value)}
              onMouseLeave={() => setHoveredNode(null)}
              filter="url(#glow-filter)"
            />
            
            {/* Particle effect for insertion */}
            {isInsertedNode && (
              <g className="particle-effect">
                {[...Array(8)].map((_, i) => {
                  const angle = (i * Math.PI * 2) / 8;
                  const distance = 25;
                  const x = Math.cos(angle) * distance;
                  const y = Math.sin(angle) * distance;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="2"
                      fill="#3B82F6"
                      className="particle"
                      opacity="0.7"
                    />
                  );
                })}
              </g>
            )}
            
            {/* Render node value - no animation */}
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-bold text-xs select-none drop-shadow-sm"
              fill={isInTraversalPath ? "#1E3A8A" : (isInsertedNode ? "#FFFFFF" : (isComparingNode ? "#1F2937" : "#1F2937"))}
            >
              {node.value}
            </text>
            
            {/* Render height value for AVL nodes - no animation */}
            <text
              x="0"
              y={nodeSize / 2 + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-medium text-xs select-none"
              fill="#4B5563"
            >
              h:{node.height}
            </text>
          </g>
        </g>
        
        {/* Render rotation indicator */}
        {isRotation && isRotationNode && (
          <g transform={`translate(${actualX}, ${actualY})`}>
            {/* Main rotation indicator */}
            <rect
              x={-40}
              y={20}
              width="80"
              height="25"
              rx="5"
              fill={rotationPhase === 'preparing' ? "#6366F1" : 
                    rotationPhase === 'highlighting' ? "#8B5CF6" : 
                    rotationPhase === 'breaking' ? "#F59E0B" : 
                    rotationPhase === 'rotating' ? "#EC4899" : 
                    rotationPhase === 'attaching' ? "#10B981" : 
                    rotationPhase === 'stabilizing' ? "#06B6D4" : "#6366F1"}
              className={`opacity-80 ${rotationPhase ? 'animate-pulse' : ''} ${rotationPhase === 'rotating' ? 'rotate-element pulse-grow-animation' : ''} ${rotationPhase === 'breaking' ? 'shake-animation flash-animation detach-animation' : ''} ${rotationPhase === 'attaching' ? 'swing-animation bounce-animation attach-animation' : ''} ${rotationPhase === 'preparing' ? 'pulse-grow-animation' : ''} ${rotationPhase === 'stabilizing' ? 'pulse-grow-animation' : ''}`}
              filter="url(#glow-filter)"
            />
            <text
              y={37}
              textAnchor="middle"
              className={`text-xs font-bold fill-white ${rotationPhase === 'rotating' ? 'rotate-element color-change-animation' : ''} ${rotationPhase === 'breaking' ? 'shake-animation flash-animation detach-animation' : ''} ${rotationPhase === 'attaching' ? 'swing-animation bounce-animation attach-animation' : ''} ${rotationPhase === 'preparing' ? 'pulse-grow-animation' : ''} ${rotationPhase === 'stabilizing' ? 'pulse-grow-animation' : ''}`}
            >
              {rotationPhase ? rotationPhase.replace(/\b\w/g, l => l.toUpperCase()) : 'ROTATING'}
            </text>
            
            {/* Additional rotation arrow indicator */}
            <path
              d="M -30 -15 C -40 -25, -40 -5, -30 5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              className={`opacity-80 ${rotationPhase === 'rotating' ? 'rotate-element' : ''}`}
            />
            <polygon
              points="-25,0 -35,-5 -35,5"
              fill="#FFFFFF"
              className={`opacity-80 ${rotationPhase === 'rotating' ? 'rotate-element' : ''}`}
            />
          </g>
        )}
        
        {/* Render rotation type */}
        {isRotation && isRotationNode && (
          <g transform={`translate(${actualX}, ${actualY})`}>
            <rect
              x={-25}
              y={40}
              width="50"
              height="15"
              rx="3"
              fill="#3B82F6"
              className="opacity-20 floating-animation"
            />
            <text
              y={50}
              textAnchor="middle"
              className="text-xs font-bold fill-white floating-text"
            >
              {rotationType ? rotationType.toUpperCase() : 'ROTATE'}
            </text>
          </g>
        )}
      </g>
    );
  };

  // ADDED: Helper function to calculate tree height
  const calculateTreeHeight = (node) => {
    if (!node) return 0;
    return 1 + Math.max(calculateTreeHeight(node.left), calculateTreeHeight(node.right));
  };

  // ADDED: Function to calculate appropriate zoom level based on tree height
  const calculateZoomLevel = (tree) => {
    if (!tree) return 1;
    
    const height = calculateTreeHeight(tree);
    // For trees with height > 4, we gradually zoom out
    if (height > 4) {
      return Math.max(0.7, 1 - (height - 4) * 0.1); // Cap at 30% zoom out
    }
    return 1; // Normal zoom for shorter trees
  };

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    const rect = svgRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  }, [position]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset]);

  // Handle mouse up for dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

  // Handle speed change
  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  // Reset all node positions to their original structure
  const resetStructure = () => {
    setDraggedNodes({});
    setCurrentlyDraggingNode(null);
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
    <div id="avl-visualizer" className="mt-2">
      <style>
        {`
        #avl-visualizer .traversal-highlight {
          animation: traversal-pulse 1s ease-in-out;
        }
        
        @keyframes traversal-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        #avl-visualizer .path-connection {
          stroke-dasharray: 5,5;
          animation: path-dash 2s linear infinite;
        }
        
        @keyframes path-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #avl-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #avl-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #avl-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #avl-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #avl-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #avl-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #avl-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #avl-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #avl-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #avl-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #avl-visualizer .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        
        @keyframes particle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0);
            opacity: 0;
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
        
        .animated-line {
          animation: pulse 1.5s infinite alternate;
        }
        
        .particle {
          animation: particle 1s ease-out forwards;
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
        
        /* Rotation animations */
        .rotate-element {
          animation: rotateAnimation 1s ease-in-out;
        }
        
        @keyframes rotateAnimation {
          0% {
            transform: rotate(0deg) scale(1);
            filter: hue-rotate(0deg);
          }
          25% {
            transform: rotate(90deg) scale(1.2);
            filter: hue-rotate(90deg);
          }
          50% {
            transform: rotate(180deg) scale(1.3);
            filter: hue-rotate(180deg);
          }
          75% {
            transform: rotate(270deg) scale(1.2);
            filter: hue-rotate(270deg);
          }
          100% {
            transform: rotate(360deg) scale(1);
            filter: hue-rotate(360deg);
          }
        }
        
        .shake-animation {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .spin-animation {
          animation: spin 0.8s linear;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1);
               filter: brightness(1); }
          25% { transform: rotate(90deg) scale(1.1);
                filter: brightness(1.3); }
          50% { transform: rotate(180deg) scale(1.2);
                filter: brightness(1.5); }
          75% { transform: rotate(270deg) scale(1.1);
                filter: brightness(1.3); }
          100% { transform: rotate(360deg) scale(1);
                 filter: brightness(1); }
        }
        
        .swing-animation {
          animation: swing 0.6s ease-in-out;
        }
        
        @keyframes swing {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.1); }
          50% { transform: rotate(-15deg) scale(1.15); }
          75% { transform: rotate(10deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        
        .bounce-animation {
          animation: bounce 0.7s ease;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-15px);}
          60% {transform: translateY(-7px);}
        }
        
        .flash-animation {
          animation: flash 0.6s ease;
        }
        
        @keyframes flash {
          0%, 50%, 100% {opacity: 1;}
          25%, 75% {opacity: 0.4;}
        }
        
        .pulse-grow-animation {
          animation: pulse-grow 0.8s ease-in-out;
        }
        
        @keyframes pulse-grow {
          0% {transform: scale(1);}
          50% {transform: scale(1.4);}
          100% {transform: scale(1);}
        }
        
        .color-change-animation {
          animation: color-change 1s linear infinite;
        }
        
        @keyframes color-change {
          0% {fill: #3B82F6;}
          25% {fill: #EF4444;}
          50% {fill: #10B981;}
          75% {fill: #F59E0B;}
          100% {fill: #3B82F6;}
        }
        
        .detach-animation {
          animation: detach 1.2s ease-in-out;
        }
        
        @keyframes detach {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          25% { transform: translate(-10px, -10px) scale(1.1); opacity: 0.9; }
          50% { transform: translate(0, -20px) scale(1.2); opacity: 0.7; }
          75% { transform: translate(10px, -15px) scale(1.1); opacity: 0.8; }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        
        .attach-animation {
          animation: attach 1.2s ease-in-out;
        }
        
        @keyframes attach {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          25% { transform: translate(10px, -15px) scale(1.1); opacity: 0.8; }
          50% { transform: translate(0, -20px) scale(1.2); opacity: 0.7; }
          75% { transform: translate(-10px, -10px) scale(1.1); opacity: 0.9; }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        
        .lift-animation {
          animation: lift 1.5s ease-in-out;
        }
        
        @keyframes lift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        
        .slide-animation {
          animation: slide 1.2s ease-in-out;
        }
        
        @keyframes slide {
          0% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-20px) rotate(-10deg); }
          50% { transform: translateX(0) rotate(0deg); }
          75% { transform: translateX(20px) rotate(10deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }
        `}
      </style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">AVL Tree Visualization</h3>
        <div className="flex gap-2 items-center">
          {/* Speed Control */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">Speed:</span>
            <select 
              value={speed} 
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={100}>Very Fast (0.1s)</option>
              <option value={200}>Super Fast (0.2s)</option>
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
        
        <div className={`mb-6 bg-gradient-to-br from-slate-50 to-blue-50 p-4 border-2 border-indigo-200 rounded-lg shadow-md ${isFullscreen ? '!border-0 !p-0' : ''}`}>
          <h4 className={`text-sm font-bold text-indigo-900 mb-3 flex items-center ${isFullscreen ? 'hidden' : ''}`}>
            <span className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-2">
              {safeCurrentStep + 1}
            </span>
            Step {safeCurrentStep + 1} of {steps.length}
            <span className="ml-2 px-2.5 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-xs font-semibold rounded-full border border-indigo-200">
              Current
            </span>
          </h4>
          
          {/* MODIFIED: Only tree floats, not the entire background */}
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
                    <linearGradient id="gradient-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9CA3AF" />
                      <stop offset="100%" stopColor="#6B717F" />
                    </linearGradient>
                    <linearGradient id="gradient-traversal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#93C5FD" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="gradient-insertion" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#BFDBFE" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="gradient-comparison" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                    <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" stopOpacity="1" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow-filter">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    
                    {/* Animated dash pattern */}
                    <pattern id="dash-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
                      <path d="M0,5 L10,5" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="3,3" />
                    </pattern>
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
          
          <div className={`text-center p-4 bg-gradient-to-r from-indigo-50 to-blue-100 border border-indigo-200 rounded-lg ${isFullscreen ? 'hidden' : ''}`}>
            <p className="font-semibold text-indigo-800 text-sm mb-1">
              {getOperationDescription(currentStepData)}
            </p>
            {traversalPath.length > 0 && (
              <div className="mt-2 text-xs text-indigo-600 font-medium bg-white/50 inline-block px-3 py-1 rounded-full border border-indigo-200">
                Path: {traversalPath.join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 border border-indigo-200 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-sm">
        <h4 className="text-md font-bold text-indigo-800 mb-3 flex items-center">
          <span className="mr-2 text-indigo-600">📋</span>
          All Steps:
        </h4>
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {steps.map((step, index) => {
            // Build traversal path for this step
            const stepTraversalPath = [];
            if (step && step.traversalPath) {
              stepTraversalPath.push(...step.traversalPath);
            } else if (step && step.path) {
              stepTraversalPath.push(...step.path);
            } else if (step && step.operation === 'traverse' && step.comparing && step.tree) {
              const fullPath = findPathToNode(step.tree, step.comparing);
              if (fullPath) {
                stepTraversalPath.push(...fullPath);
              }
            }
            
            return (
              <div 
                key={index}
                className={`p-4 border rounded-xl transition-all duration-300 ${index === currentStep ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-gray-200 hover:shadow-sm'}`}
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
                        Path: {stepTraversalPath.join(' ')}
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