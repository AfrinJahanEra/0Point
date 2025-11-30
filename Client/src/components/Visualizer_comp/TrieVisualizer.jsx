import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const TrieVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
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

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Trie Visualization Steps', 148.5, 15, null, null, 'center');
    
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
      
      // Add a visual representation of the trie
      if (step.tree || step.operation) {
        // Calculate bounding box for scaling
        const bbox = calculateTrieBoundingBox(step.tree || { children: {}, isEnd: false });
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
        
        drawTrieInPDF(doc, step.tree || { children: {}, isEnd: false }, '', x, y, 0, scale);
      } else {
        doc.text('Empty trie', 148.5, 105, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('trie-steps.pdf');
  };
  
  // Helper function to calculate trie bounding box
  const calculateTrieBoundingBox = (node, prefix = '', level = 0, x = 0, y = 0, bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) => {
    if (!node) return bbox;
    
    const nodeSize = 10; // Diameter of node circle
    const verticalSpacing = 40;
    const horizontalSpacing = Math.max(60 / (level + 1), 25);
    
    // Update bounding box
    bbox.minX = Math.min(bbox.minX, x - nodeSize/2);
    bbox.maxX = Math.max(bbox.maxX, x + nodeSize/2);
    bbox.minY = Math.min(bbox.minY, y - nodeSize/2);
    bbox.maxY = Math.max(bbox.maxY, y + nodeSize/2);
    
    // Process children
    const children = node.children ? Object.keys(node.children) : [];
    children.forEach((char, index) => {
      const child = node.children[char];
      const childX = x + (index - (children.length - 1) / 2) * horizontalSpacing;
      const childY = y + verticalSpacing;
      calculateTrieBoundingBox(child, prefix + char, level + 1, childX, childY, bbox);
    });
    
    // Add some padding
    bbox.width = bbox.maxX - bbox.minX + 20;
    bbox.height = bbox.maxY - bbox.minY + 20;
    
    return bbox;
  };
  
  // Helper function to draw trie in PDF
  const drawTrieInPDF = (doc, node, prefix = '', x = 105, y = 45, level = 0, scale = 1) => {
    if (!node) return;
    
    const nodeSize = 5 * scale; // Increased node size
    const verticalSpacing = 40 * scale; // Increased spacing
    const horizontalSpacing = Math.max(60 / (level + 1), 25) * scale; // Increased horizontal spacing
    
    // Get the character for this node (last character of prefix, or 'root' for root)
    const nodeLabel = prefix ? prefix.slice(-1) : 'root';
    
    // Draw node circle
    if (node.isEnd) {
      doc.setFillColor(16, 185, 129); // green-500
    } else {
      doc.setFillColor(255, 255, 255); // white
    }
    doc.setDrawColor(156, 163, 175); // gray-400
    doc.setLineWidth(0.7 * scale); // Slightly thicker lines
    doc.circle(x, y, nodeSize, 'FD');
    
    // Draw node value
    doc.setFontSize(8 * scale); // Larger font
    doc.setTextColor(0, 0, 0); // black
    doc.text(nodeLabel, x, y + 2 * scale, null, null, 'center');
    
    // Draw end marker for end nodes
    if (node.isEnd) {
      doc.setFontSize(6 * scale);
      doc.setTextColor(16, 185, 129); // green-500
      doc.text('END', x, y - 10 * scale, null, null, 'center'); // Moved further up
    }
    
    // Draw children
    const children = node.children ? Object.keys(node.children) : [];
    children.forEach((char, index) => {
      const child = node.children[char];
      const childX = x + (index - (children.length - 1) / 2) * horizontalSpacing;
      const childY = y + verticalSpacing;
      
      // Connection line
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.7 * scale);
      doc.line(x, y + nodeSize, childX, childY - nodeSize); // Adjusted line endpoints
      
      // Character label on the line
      doc.setFontSize(7 * scale);
      doc.setTextColor(59, 130, 246); // blue-600
      doc.text(char, (x + childX) / 2, (y + childY) / 2 - 3 * scale, null, null, 'center'); // Moved up slightly
      
      // Child node
      drawTrieInPDF(doc, child, prefix + char, childX, childY, level + 1, scale);
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

  // Function to render trie nodes with elastic dragging support
  const renderTrieNode = (node, prefix = '', x = 300, y = 50, level = 0) => {
    if (!node) return null;
    
    const nodeId = `${prefix}-${level}`;
    const nodeSize = 30;
    const verticalSpacing = 70;
    // ADJUSTED: Dynamic horizontal spacing based on trie depth to accommodate wider tries
    const maxDepth = calculateTrieDepth(node);
    const baseHorizontalSpacing = 120;
    const adjustedHorizontalSpacing = Math.max(baseHorizontalSpacing / (1 + maxDepth * 0.1), 40); // Reduce spacing for deeper tries
    const horizontalSpacing = Math.max(adjustedHorizontalSpacing / (level + 1), 30); // Minimum spacing
    
    // Get dragged position if exists
    const draggedPosition = draggedNodes[nodeId];
    const actualX = draggedPosition ? draggedPosition.startX : x;
    const actualY = draggedPosition ? draggedPosition.startY : y;
    
    // Check if this is the current node being processed
    const isCurrentNode = currentStepData && 
      ((currentStepData.path && prefix === currentStepData.path) || 
       (currentStepData.currentChar && prefix && prefix.slice(-1) === currentStepData.currentChar));
       
    // Check if this node represents the end of a word
    const isEndOfWord = node.isEnd === true;
    
    return (
      <g key={nodeId}>
        {/* Render children first */}
        {node.children && Object.keys(node.children).map((char, index) => {
          const child = node.children[char];
          const childrenCount = Object.keys(node.children).length;
          const childX = x + (index - (childrenCount - 1) / 2) * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          return (
            <g key={`${nodeId}-${char}`}>
              {/* Connection line to child */}
              <line
                x1={actualX}
                y1={actualY + nodeSize/2}
                x2={childX}
                y2={childY - nodeSize/2}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="floating-animation delay-3"
              />
              
              {/* Character label on the line - no animation */}
              <text
                x={(actualX + childX) / 2}
                y={(y + childY) / 2 - 5}
                textAnchor="middle"
                className="text-blue-600 font-medium"
              >
                {char}
              </text>
              
              {/* Child node */}
              {renderTrieNode(child, prefix + char, childX, childY, level + 1)}
            </g>
          );
        })}
        
        {/* Render node circle with enhanced floating animation */}
        <g 
          onMouseDown={(e) => handleNodeMouseDown(nodeId, actualX, actualY, e)}
          className="cursor-move floating-animation glowing delay-3"
        >
          <g transform={`translate(${actualX}, ${actualY})`}>
            <circle
              r={nodeSize / 2}
              fill={isEndOfWord ? "#3B82F6" : "#FFFFFF"}
              stroke="#9CA3AF"
              strokeWidth="2"
              className={`hover:stroke-blue-500 transition-all duration-500 ${level % 4 === 0 ? 'delay-1' : level % 4 === 1 ? 'delay-2' : level % 4 === 2 ? 'delay-3' : 'delay-4'}`}
            />
            
            {/* Render node character - no animation */}
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-bold text-xs select-none"
              fill={isEndOfWord ? "#FFFFFF" : "#4B5563"}
            >
              {node.char}
            </text>
          </g>
        </g>

      </g>
    );

  };

  // ADDED: Helper function to calculate trie depth
  const calculateTrieDepth = (node) => {
    if (!node || !node.children) return 0;
    
    let maxDepth = 0;
    const children = Object.keys(node.children);
    for (const child of children) {
      maxDepth = Math.max(maxDepth, calculateTrieDepth(node.children[child]));
    }
    
    return 1 + maxDepth;
  };

  // ADDED: Function to calculate appropriate zoom level based on trie depth
  const calculateZoomLevel = (tree) => {
    if (!tree) return 1;
    
    const depth = calculateTrieDepth(tree);
    // For tries with depth > 4, we gradually zoom out
    if (depth > 4) {
      return Math.max(0.7, 1 - (depth - 4) * 0.1); // Cap at 30% zoom out
    }
    return 1; // Normal zoom for shallower tries
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

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <div id="trie-visualizer" className="mt-2">
      <style>
        {`
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #trie-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #trie-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #trie-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #trie-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #trie-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #trie-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #trie-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #trie-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #trie-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #trie-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #trie-visualizer .fullscreen-container::-webkit-scrollbar-corner {
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
        <h3 className="text-lg text-blue-800">Trie Visualization</h3>
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
      
      <div 
        ref={fullscreenContainerRef}
        className={`group bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}
      >
        {/* Fullscreen toggle icon positioned on the visualization container like YouTube */}
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
          
          {/* MODIFIED: Only tree floats, not the entire background */}
          <div className={`flex justify-center items-center mb-3 overflow-hidden py-2 max-h-[500px] ${isFullscreen ? 'scale-125' : ''}`}>
            {currentStepData ? (
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-hidden relative">
                <svg 
                  width="100%" 
                  height="500" 
                  className={`border border-gray-200 rounded min-w-[600px] ${isFullscreen ? '!border-0' : ''}`} 
                  viewBox={`0 0 ${600 * calculateZoomLevel(currentStepData.root)} 500`}
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
                      transform={`translate(${position.x - 300 * calculateZoomLevel(currentStepData.root)}, ${position.y - 250})`}
                      onMouseDown={handleMouseDown}
                      className="cursor-move screen-floating"
                    >
                      {renderTrieNode(currentStepData.root, '', 300 * calculateZoomLevel(currentStepData.root), 100, 0)}
                    </g>
                  ) : (
                    <g className="screen-floating">
                      {renderTrieNode(currentStepData.root, '', 300 * calculateZoomLevel(currentStepData.root), 100, 0)}
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
                Empty trie
              </div>
            )}
          </div>
          
          <div className={`text-center p-2 bg-white border border-gray-200 ${isFullscreen ? 'hidden' : ''}`}>
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
                    
                    <div className={`mt-3 min-h-[200px] flex items-center justify-center overflow-auto ${isFullscreen ? 'scale-150' : ''}`}>
                      {step.tree || step.operation ? (
                        <div className={`w-full min-h-[200px] overflow-auto ${isFullscreen ? 'scale-150' : ''}`}>
                          <svg width="100%" height="400" className={`border border-gray-200 rounded min-w-[400px] ${isFullscreen ? '!border-0' : ''}`} viewBox={`0 0 ${400 * calculateZoomLevel(step.tree || { children: {}, isEnd: false })} 400`}>
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
                            
                            {renderTrieNode(step.tree || { children: {}, isEnd: false }, '', 250 * calculateZoomLevel(step.tree || { children: {}, isEnd: false }), 50)}
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