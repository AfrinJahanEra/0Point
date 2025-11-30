import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Maximize, Minimize } from 'lucide-react';

const HeapTreeVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, viewMode = 'tree' }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);
  
  // State for individual node dragging
  const [draggedNodes, setDraggedNodes] = useState({});
  const [currentlyDraggingNode, setCurrentlyDraggingNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle mouse down for individual node dragging
  const handleNodeMouseDown = useCallback((nodeIndex, initialX, initialY, e) => {
    e.stopPropagation();
    setIsDragging(true);
    setCurrentlyDraggingNode(nodeIndex);
    setDraggedNodes(prev => ({
      ...prev,
      [nodeIndex]: {
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
  
  // Reset all node positions to their original structure
  const resetStructure = () => {
    setDraggedNodes({});
    setCurrentlyDraggingNode(null);
  };
  
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
  
  // Add mouse move and up event listeners to document
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
  
  // Animation state
  const [interpolatedData, setInterpolatedData] = useState(data);
  
  // Auto-advance based on speed setting
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        onNext();
      } else {
        // Loop back to the beginning
        // This requires the parent component to reset currentStep to 0
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [steps.length, currentStep, onNext, speed]);
  
  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Heap Sort Visualization Steps', 148.5, 15, null, null, 'center');
    
    // Add steps with visual representations
    let currentPageY = 30;
    const pageHeight = 200; // A4 landscape height minus margins
    
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      if (index > 0) {
        doc.addPage();
        currentPageY = 30;
      }
      
      doc.setFontSize(16);
      doc.text(`Step ${index + 1} of ${steps.length}`, 148.5, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(getOperationDescription(step), 148.5, 35, null, null, 'center');
      
      // Add array representation
      const arrayStr = `Array: [${step.array.join(', ')}]`;
      doc.text(arrayStr, 148.5, 45, null, null, 'center');
      
      // Add visual tree representation using jsPDF drawing functions
      drawTreeVisualization(doc, step, 148.5, 60);
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('heap-sort-steps-with-visuals.pdf');
  };
  
  // Function to download steps as PDF with screenshots (alternative method)
  const downloadStepsAsPDFWithScreenshots = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFontSize(22);
    doc.text('Heap Sort Visualization Steps', 148.5, 15, null, null, 'center');
    
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      if (index > 0) {
        doc.addPage();
      }
      
      doc.setFontSize(16);
      doc.text(`Step ${index + 1} of ${steps.length}`, 148.5, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(getOperationDescription(step), 148.5, 35, null, null, 'center');
      
      // Add array representation
      const arrayStr = `Array: [${step.array.join(', ')}]`;
      doc.text(arrayStr, 148.5, 45, null, null, 'center');
      
      // Create a temporary element for this step
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '600px';
      tempContainer.style.padding = '20px';
      
      // Generate step visualization
      const stepPositions = calculateTreePositions(step.array);
      const stepConnections = getConnections(step.array);
      
      // Simple SVG representation
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "600");
      svg.setAttribute("height", "300");
      svg.setAttribute("viewBox", "0 0 300 200");
      
      // Draw connections
      stepConnections.forEach(conn => {
        const fromPos = stepPositions[conn.from];
        const toPos = stepPositions[conn.to];
        
        if (fromPos && toPos) {
          const line = document.createElementNS(svgNS, "line");
          line.setAttribute("x1", fromPos.x * 0.6);
          line.setAttribute("y1", fromPos.y * 0.6 + 20);
          line.setAttribute("x2", toPos.x * 0.6);
          line.setAttribute("y2", toPos.y * 0.6 + 20);
          line.setAttribute("stroke", "#9ca3af");
          line.setAttribute("stroke-width", "1");
          svg.appendChild(line);
        }
      });
      
      // Draw nodes
      stepPositions.forEach((pos, posIdx) => {
        // Circle
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", pos.x * 0.6);
        circle.setAttribute("cy", pos.y * 0.6 + 20);
        circle.setAttribute("r", "12");
        
        // Node styling
        const nodeStyle = getNodeStyle(step, posIdx);
        circle.setAttribute("class", nodeStyle);
        svg.appendChild(circle);
        
        // Text
        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", pos.x * 0.6);
        text.setAttribute("y", pos.y * 0.6 + 20);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dy", ".3em");
        text.setAttribute("font-size", "8");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("fill", getNodeTextColor(step, posIdx));
        text.textContent = pos.value;
        svg.appendChild(text);
      });
      
      tempContainer.appendChild(svg);
      document.body.appendChild(tempContainer);
      
      try {
        // Capture screenshot
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 20, 50, 257, 128);
      } catch (error) {
        console.error('Error capturing step screenshot:', error);
        // Fallback to drawing method
        drawTreeVisualization(doc, step, 148.5, 60);
      }
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('heap-sort-steps-with-screenshots.pdf');
  };
  
  // Function to draw tree visualization using jsPDF
  const drawTreeVisualization = (doc, step, x, y) => {
    const positions = calculateTreePositions(step.array);
    const connections = getConnections(step.array);
    
    // Calculate bounding box for scaling
    if (positions.length === 0) {
      doc.text('Empty tree', x, y, null, null, 'center');
      return;
    }
    
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    
    const bbox = {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    // Scale to fit page
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const availableWidth = pageWidth - 40; // Leave 20mm margin on each side
    const availableHeight = pageHeight - 80; // Leave space for header and footer
    
    const scaleX = availableWidth / bbox.width;
    const scaleY = availableHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
    
    // Calculate offset to center
    const treeWidth = bbox.width * scale;
    const treeHeight = bbox.height * scale;
    const offsetX = (pageWidth - treeWidth) / 2 - bbox.minX * scale;
    const offsetY = (availableHeight - treeHeight) / 2 + 60 - bbox.minY * scale;
    
    // Draw connections
    connections.forEach(conn => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      
      if (fromPos && toPos) {
        doc.setDrawColor(156, 163, 175); // gray-400
        doc.setLineWidth(0.5 * scale);
        doc.line(
          offsetX + fromPos.x * scale,
          offsetY + fromPos.y * scale,
          offsetX + toPos.x * scale,
          offsetY + toPos.y * scale
        );
      }
    });
    
    // Draw nodes
    positions.forEach((pos, idx) => {
      // Node circle
      const isComparing = step.comparing && step.comparing.includes(idx);
      const isSwapping = step.swapping && step.swapping.includes(idx);
      const isHeapRoot = step.heapRoot !== undefined && idx === step.heapRoot;
      
      if (isHeapRoot) {
        doc.setFillColor(30, 64, 175); // blue-800
      } else if (isComparing) {
        doc.setFillColor(209, 213, 219); // gray-300
      } else if (isSwapping) {
        doc.setFillColor(156, 163, 175); // gray-400
      } else {
        doc.setFillColor(255, 255, 255); // white
      }
      
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.5);
      doc.circle(offsetX + pos.x * scale, offsetY + pos.y * scale, 8 * scale, 'FD');
      
      // Node value
      doc.setFontSize(8 * scale);
      if (isHeapRoot) {
        doc.setTextColor(255, 255, 255); // white
      } else {
        doc.setTextColor(0, 0, 0); // black
      }
      doc.text(
        String(pos.value),
        offsetX + pos.x * scale,
        offsetY + pos.y * scale + 3 * scale,
        null,
        null,
        'center'
      );
    });
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting heap sort visualization...';
    } else if (operation === 'build_heap_start') {
      return 'Building max heap from array';
    } else if (operation === 'heapify') {
      return `Heapifying subtree rooted at index ${stepData.heapRoot}`;
    } else if (operation === 'after_heapify') {
      return `Max heap successfully built`;
    } else if (operation === 'extract_max') {
      return `Extracting maximum element from heap`;
    } else if (operation === 'after_extract') {
      return `Maximum element moved to sorted portion`;
    } else if (operation === 'complete') {
      return 'Array is fully sorted!';
    } else if (stepData.comparing && stepData.comparing.length > 0) {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.swapping && stepData.swapping.length > 0) {
      return `Swapping elements at positions ${stepData.swapping.join(' and ')}`;
    } else if (stepData.heapRoot !== undefined) {
      return `Heap root at position ${stepData.heapRoot}`;
    } else {
      return 'Processing...';
    }
  };

  // Function to calculate tree positions with better spacing
  const calculateTreePositions = (array) => {
    if (!array || array.length === 0) return [];
    
    const positions = [];
    const levelHeight = 80;
    const baseNodeSpacing = 300;
    
    // Calculate positions for each node
    for (let i = 0; i < array.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const levelNodes = Math.pow(2, level);
      const levelStartIndex = levelNodes - 1;
      const nodeIndexInLevel = i - levelStartIndex;
      
      // Calculate x position (centered within level) with dynamic spacing
      // Increase spacing for deeper levels to prevent overlap
      const levelSpacing = Math.max(baseNodeSpacing / (level + 1), 80);  // Keep minimum spacing
      const levelWidth = (levelNodes - 1) * levelSpacing;
      const startX = 350 - levelWidth / 2;  // Center within 700px width for better centering
      const x = startX + nodeIndexInLevel * levelSpacing;
      
      // Calculate y position
      const y = level * levelHeight + 20;  // Reduced vertical offset to fit on screen
      
      positions.push({ x, y, value: array[i] });
    }
    
    return positions;
  };

  // Function to get connections between nodes
  const getConnections = (array) => {
    if (!array || array.length === 0) return [];
    
    const connections = [];
    
    // Connect each node to its children
    for (let i = 0; i < array.length; i++) {
      const leftChildIndex = 2 * i + 1;
      const rightChildIndex = 2 * i + 2;
      
      if (leftChildIndex < array.length) {
        connections.push({ from: i, to: leftChildIndex });
      }
      
      if (rightChildIndex < array.length) {
        connections.push({ from: i, to: rightChildIndex });
      }
    }
    
    return connections;
  };

  // Function to get node styling
  const getNodeStyle = (stepData, index) => {
    if (!stepData) return 'fill-white stroke-gray-400';
    
    if (stepData.heapRoot !== undefined && index === stepData.heapRoot) {
      return 'fill-blue-800 stroke-blue-900';
    } else if (stepData.comparing && stepData.comparing.includes(index)) {
      return 'fill-gray-300 stroke-gray-700';
    } else if (stepData.swapping && stepData.swapping.includes(index)) {
      return 'fill-gray-400 stroke-black';
    } else {
      return 'fill-white stroke-gray-400';
    }
  };

  // Function to get node text color
  const getNodeTextColor = (stepData, index) => {
    if (!stepData) return 'black';
    
    if (stepData.heapRoot !== undefined && index === stepData.heapRoot) {
      return 'white';
    } else {
      return 'black';
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

  if (!data || !steps || steps.length === 0) return null;
  
    // Helper function to determine if a step should be shown based on viewMode
    const shouldShowStep = (step) => {
      // Since we're in the HeapTreeVisualizer, we should only show steps when in tree mode
      return viewMode === 'tree';
    };

  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];
  const treePositions = calculateTreePositions(currentStepData.array);
  const connections = getConnections(currentStepData.array);

  return (
    <div id="heap-tree-visualizer" className="mt-2">
      <style>
        {`
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #heap-tree-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #heap-tree-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #heap-tree-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #heap-tree-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #heap-tree-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #heap-tree-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #heap-tree-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #heap-tree-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #heap-tree-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #heap-tree-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #heap-tree-visualizer .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
        }
        
        /* Screen floating animation for nodes and edges only */
        @keyframes screen-float {
          0% {
            transform: translateX(0px) translateY(0px);
          }
          25% {
            transform: translateX(5px) translateY(-3px);
          }
          50% {
            transform: translateX(0px) translateY(0px);
          }
          75% {
            transform: translateX(-5px) translateY(2px);
          }
          100% {
            transform: translateX(0px) translateY(0px);
          }
        }
        
        .screen-floating-nodes-edges {
          animation: screen-float 6s ease-in-out infinite;
        }
        
        /* No animation for text elements */
        .no-animation {
          animation: none;
        }
        `}
      </style>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Heap Tree Visualization</h3>
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
            onClick={downloadStepsAsPDFWithScreenshots}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
          >
            Export PDF
          </button>
        </div>
      </div>
      
      <div ref={fullscreenContainerRef} className={`group bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}>
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
          
          <div className={`flex justify-center items-center mb-3 py-2 ${isFullscreen ? 'scale-125' : ''}`}>
            <div className="w-full min-h-[400px] flex items-center justify-center mx-auto overflow-hidden">
              <svg 
                ref={svgRef} 
                width="100%" 
                height="350" 
                className={`border border-gray-200 rounded ${isFullscreen ? '!border-0' : ''}`}
                viewBox="0 0 600 250"  // Adjusted viewBox for better centering
              >
                {/* Draw connections */}
                {connections.map((conn, index) => {
                  const fromPos = treePositions[conn.from];
                  const toPos = treePositions[conn.to];
                  
                  // Get dragged positions if they exist
                  const draggedFromPos = draggedNodes[conn.from];
                  const draggedToPos = draggedNodes[conn.to];
                  
                  const actualFromX = draggedFromPos ? draggedFromPos.startX : (fromPos ? fromPos.x * 0.7 : 0);
                  const actualFromY = draggedFromPos ? draggedFromPos.startY : (fromPos ? fromPos.y * 0.7 + 20 : 0);
                  const actualToX = draggedToPos ? draggedToPos.startX : (toPos ? toPos.x * 0.7 : 0);
                  const actualToY = draggedToPos ? draggedToPos.startY : (toPos ? toPos.y * 0.7 + 20 : 0);
                  
                  if (fromPos && toPos) {
                    return (
                      <line
                        key={index}
                        x1={actualFromX}
                        y1={actualFromY}
                        x2={actualToX}
                        y2={actualToY}
                        stroke="#9ca3af"
                        strokeWidth="1"
                        className="screen-floating-nodes-edges"
                      />
                    );
                  }
                  return null;
                })}
                
                {/* Draw nodes with text that move together using transform approach */}
                {treePositions.map((pos, posIdx) => {
                  // Get dragged position if exists
                  const draggedPosition = draggedNodes[posIdx];
                  const actualX = draggedPosition ? draggedPosition.startX : pos.x * 0.7;
                  const actualY = draggedPosition ? draggedPosition.startY : pos.y * 0.7 + 20;
                  
                  return (
                    <g 
                      key={posIdx}
                      className="screen-floating-nodes-edges"
                      onMouseDown={(e) => handleNodeMouseDown(posIdx, actualX, actualY, e)}
                    >
                      <g transform={`translate(${actualX}, ${actualY})`}>
                        <circle
                          r="12"
                          className={`transition-all duration-300 ${getNodeStyle(currentStepData, posIdx)} cursor-move`}
                        />
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          dy=".3em"
                          fontSize="8"
                          fontWeight="bold"
                          fill={getNodeTextColor(currentStepData, posIdx)}
                        >
                          {pos.value}
                        </text>
                      </g>
                    </g>
                  );
                })}

              </svg>
            </div>
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
        <div className="space-y-4 max-h-[900px] overflow-y-auto pr-2">
          {steps.filter(shouldShowStep).map((step, index) => {
            const stepPositions = calculateTreePositions(step.array);
            const stepConnections = getConnections(step.array);
            
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
                    
                    <div className="mt-3">
                      <div className="w-full min-h-[400px] flex items-center justify-center overflow-visible">
                        <svg 
                          width="100%" 
                          height="350" 
                          className="border border-gray-200 rounded"
                          viewBox="0 0 600 300"  // Increased viewBox to show full tree
                        >
                          {/* Draw connections for this step */}
                          {stepConnections.map((conn, connIdx) => {
                            const fromPos = stepPositions[conn.from];
                            const toPos = stepPositions[conn.to];
                            
                            if (fromPos && toPos) {
                              return (
                                <line
                                  key={connIdx}
                                  x1={fromPos.x * 0.7}
                                  y1={fromPos.y * 0.7 + 20}
                                  x2={toPos.x * 0.7}
                                  y2={toPos.y * 0.7 + 20}
                                  stroke="#9ca3af"
                                  strokeWidth="1"
                                  className="screen-floating-nodes-edges"
                                />
                              );
                            }
                            return null;
                          })}
                          
                          {/* Draw nodes with text that move together using transform approach */}
                          {stepPositions.map((pos, posIdx) => (
                            <g key={posIdx} className="screen-floating-nodes-edges">
                              <g transform={`translate(${pos.x * 0.7}, ${pos.y * 0.7 + 20})`}>
                                <circle
                                  r="12"
                                  className={`transition-all duration-300 ${getNodeStyle(step, posIdx)}`}
                                />
                                <text
                                  x="0"
                                  y="0"
                                  textAnchor="middle"
                                  dy=".3em"
                                  fontSize="8"
                                  fontWeight="bold"
                                  fill={getNodeTextColor(step, posIdx)}
                                >
                                  {pos.value}
                                </text>
                              </g>
                            </g>
                          ))}

                        </svg>
                      </div>
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

export default HeapTreeVisualizer;