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
  
  // State for individual node dragging
  const [draggedNodes, setDraggedNodes] = useState({});
  const [currentlyDraggingNode, setCurrentlyDraggingNode] = useState(null);

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
      if (step.root || step.tree || step.operation) {
        // Calculate bounding box for scaling
        const rootNode = step.tree || step.root || { children: {}, isEnd: false };
        const bbox = calculateTrieBoundingBox(rootNode);
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
        
        drawTrieInPDF(doc, rootNode, '', x, y, 0, scale);
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
    if (node.children) {
      const children = Object.keys(node.children);
      children.forEach((char, index) => {
        const child = node.children[char];
        const childX = x + (index - (children.length - 1) / 2) * horizontalSpacing;
        const childY = y + verticalSpacing;
        calculateTrieBoundingBox(child, prefix + char, level + 1, childX, childY, bbox);
      });
    }
    
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
    const nodeLabel = node.char || (prefix ? prefix.slice(-1) : 'root');
    
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
    if (node.children) {
      const children = Object.keys(node.children);
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
    }
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

  // Reset all node positions to their original structure
  const resetStructure = () => {
    setDraggedNodes({});
    setCurrentlyDraggingNode(null);
  };

  // Function to render trie nodes (simple version without dragging)
  const renderTrieNode = (node, prefix = '', x = 300, y = 50, level = 0) => {
    if (!node) return null;
    
    const nodeId = `${prefix}-${level}`;
    const nodeSize = 35;
    const verticalSpacing = 70;
    const horizontalSpacing = Math.max(200 / (level + 1), 80);
    
    // Get dragged position if exists
    const draggedPosition = draggedNodes[nodeId];
    const actualX = draggedPosition ? draggedPosition.startX : x;
    const actualY = draggedPosition ? draggedPosition.startY : y;
    
    // Use 'char' property if available, otherwise use prefix logic
    const nodeLabel = node.char || (prefix ? prefix.slice(-1) : 'root');
    
    return (
      <g key={nodeId}>
        {/* Render children first */}
        {node.children && Object.keys(node.children).length > 0 ? (
          Object.keys(node.children).map((char, index) => {
            const child = node.children[char];
            const childrenCount = Object.keys(node.children).length;
            const childX = x + (index - (childrenCount - 1) / 2) * horizontalSpacing;
            const childY = y + verticalSpacing;
            
            // Get dragged position for child if exists
            const childNodeId = `${prefix + char}-${level + 1}`;
            const childDraggedPosition = draggedNodes[childNodeId];
            const actualChildX = childDraggedPosition ? childDraggedPosition.startX : childX;
            const actualChildY = childDraggedPosition ? childDraggedPosition.startY : childY;
            
            return (
              <g key={`${nodeId}-${char}`}>
                {/* Connection line to child with enhanced styling */}
                <line
                  x1={actualX}
                  y1={actualY + nodeSize/2}
                  x2={actualChildX}
                  y2={actualChildY - nodeSize/2}
                  stroke="url(#gradient-normal)"
                  strokeWidth="3"
                  className="animated-line stroke-current"
                  strokeLinecap="round"
                  strokeDasharray="5,5"
                  style={{
                    animation: 'pulse 1.5s infinite'
                  }}
                />
                
                <text
                  x={(actualX + actualChildX) / 2}
                  y={(actualY + actualChildY) / 2 - 10}
                  textAnchor="middle"
                  className="text-sm text-blue-600 font-bold bg-white px-1 rounded"
                >
                  {char}
                </text>
                
                {renderTrieNode(child, prefix + char, childX, childY, level + 1)}
              </g>
            );
          })
        ) : null}
        
        {/* Render node circle with enhanced floating animation */}
        <g 
          onMouseDown={(e) => handleNodeMouseDown(nodeId, actualX, actualY, e)}
          className="cursor-move floating-animation glowing delay-3"
        >
          <g transform={`translate(${actualX}, ${actualY})`}>
            <defs>
              <radialGradient id={`node-gradient-${nodeId}`} cx="30%" cy="30%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor={
                  node.isEnd ? "#10B981" : "#93C5FD"
                } />
              </radialGradient>
            </defs>
            
            <circle
              r={nodeSize / 2}
              fill={node.isEnd ? "url(#node-gradient-" + nodeId + ")" : "url(#node-gradient-" + nodeId + ")"}
              stroke={node.isEnd ? "#059669" : "#4F46E5"}
              strokeWidth="3"
              className={`hover:stroke-indigo-700 transition-all duration-700 ease-out ${level % 4 === 0 ? 'delay-1' : level % 4 === 1 ? 'delay-2' : level % 4 === 2 ? 'delay-3' : 'delay-4'} ${node.isEnd ? 'ring-4 ring-green-300' : 'ring-4 ring-blue-300'}`}
              onMouseEnter={() => setHoveredNode(prefix || 'root')}
              onMouseLeave={() => setHoveredNode(null)}
              filter="url(#glow-filter)"
            />
            
            <text
              x="0"
              y="5"
              textAnchor="middle"
              className="font-bold text-gray-800 text-base drop-shadow-sm"
            >
              {nodeLabel}
            </text>
            
            {node.isEnd && (
              <text
                x="0"
                y="-25"
                textAnchor="middle"
                className="text-xs text-white font-bold drop-shadow-sm"
              >
                END
              </text>
            )}
          </g>
        </g>
      </g>
    );
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];
  
  // Debug log to see the structure
  // console.log('Current step data:', currentStepData);

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
                  viewBox="0 0 600 500"
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
                  
                  <g>
                    {renderTrieNode(currentStepData.tree || currentStepData.root, '', 300, 100, 0)}
                  </g>
                </svg>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Empty trie
              </div>
            )}
          </div>

          <div className={`text-center p-4 bg-gradient-to-r from-indigo-50 to-blue-100 border border-indigo-200 rounded-lg ${isFullscreen ? 'hidden' : ''}`}>
            <p className="font-semibold text-indigo-800 text-sm mb-1">
              {getOperationDescription(currentStepData)}
            </p>
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
                    
                    <div className={`mt-3 min-h-[200px] flex items-center justify-center overflow-auto ${isFullscreen ? 'scale-150' : ''}`}>
                      {step.root || step.operation ? (
                        <div className={`w-full min-h-[200px] overflow-auto ${isFullscreen ? 'scale-150' : ''}`}>
                          <svg width="100%" height="400" className={`border border-gray-200 rounded min-w-[400px] ${isFullscreen ? '!border-0' : ''}`} viewBox="0 0 400 400">
                            <defs>

                            </defs>
                            
                            {renderTrieNode(step.tree || step.root || { children: {}, isEnd: false }, '', 200, 80)}

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