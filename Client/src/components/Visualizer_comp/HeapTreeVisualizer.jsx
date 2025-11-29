import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Maximize, Minimize } from 'lucide-react';

const HeapTreeVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);
  
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
      
      // Check if we need a new page
      if (currentPageY > pageHeight - 120) {
        doc.addPage();
        currentPageY = 20;
      }
      
      // Add step header
      doc.setFontSize(14);
      doc.text(`Step ${index + 1}`, 20, currentPageY);
      
      doc.setFontSize(10);
      doc.text(getOperationDescription(step), 20, currentPageY + 7);
      
      // Add array representation
      const arrayStr = `Array: [${step.array.join(', ')}]`;
      doc.text(arrayStr, 20, currentPageY + 14);
      
      // Capture and add step visualization
      try {
        const stepElement = document.getElementById(`step-${index}`);
        if (stepElement) {
          const canvas = await html2canvas(stepElement, {
            scale: 0.8,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 120;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if image fits on current page
          if (currentPageY + 25 + imgHeight > pageHeight) {
            doc.addPage();
            currentPageY = 20;
          }
          
          doc.addImage(imgData, 'PNG', 20, currentPageY + 18, imgWidth, imgHeight);
          currentPageY += 25 + imgHeight;
        } else {
          // Fallback if element not found
          doc.line(20, currentPageY + 18, 277, currentPageY + 18);
          currentPageY += 25;
        }
      } catch (error) {
        console.error('Error capturing step visualization:', error);
        // Fallback if capture fails
        doc.line(20, currentPageY + 18, 277, currentPageY + 18);
        currentPageY += 25;
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('heap-sort-steps.pdf');
  };
  
  // Function to create a text-based tree representation (fallback)
  const createTextTree = (step, stepIndex) => {
    const positions = calculateTreePositions(step.array);
    const lines = [];
    
    // Simple tree representation
    lines.push(`Tree structure for step ${stepIndex + 1}:`);
    
    // Group nodes by level
    const levels = {};
    positions.forEach((pos, idx) => {
      const level = Math.floor(Math.log2(idx + 1));
      if (!levels[level]) levels[level] = [];
      levels[level].push({ index: idx, value: pos.value, position: idx });
    });
    
    // Create a visual representation
    Object.keys(levels).forEach(level => {
      const nodes = levels[level];
      const nodeStr = nodes.map(node => `[${node.index}:${node.value}]`).join(' ');
      lines.push(`  Level ${level}: ${nodeStr}`);
    });
    
    return lines;
  };
  
  // Function to download all steps as PDF with visual representations (screenshot version)
  const downloadStepsAsPDFWithScreenshots = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Heap Sort Visualization Steps', 148.5, 15, null, null, 'center');
    
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
    
    // Calculate scaling to fit page
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const availableWidth = pageWidth - 40; // Leave 20mm margin on each side
    const availableHeight = pageHeight - 80; // Leave space for header and footer
    
    const scaleX = availableWidth / bbox.width;
    const scaleY = availableHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
    
    // Calculate position to center
    const treeWidth = bbox.width * scale;
    const treeHeight = bbox.height * scale;
    const offsetX = (pageWidth - treeWidth) / 2 - bbox.minX * scale;
    const offsetY = (availableHeight - treeHeight) / 2 + 50 - bbox.minY * scale; // +50 for header space
    
    // Draw connections
    connections.forEach(conn => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      
      if (fromPos && toPos) {
        doc.setDrawColor(156, 163, 175); // gray-400
        doc.setLineWidth(0.5);
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
    } else if (operation === 'heapify_start') {
      return `Heapifying subtree rooted at position ${stepData.heapRoot !== undefined ? stepData.heapRoot : 'N/A'}`;
    } else if (operation === 'compare_children') {
      return `Comparing elements at positions ${stepData.comparing && stepData.comparing.length > 0 ? stepData.comparing.join(' and ') : 'N/A'}`;
    } else if (operation === 'swap_heap') {
      return `Swapping elements at positions ${stepData.swapping && stepData.swapping.length > 0 ? stepData.swapping.join(' and ') : 'N/A'} to maintain heap property`;
    } else if (operation === 'after_swap') {
      return `Heap property restored after swap`;
    } else if (operation === 'no_swap_needed') {
      return `No swap needed, heap property maintained`;
    } else if (operation === 'heap_built') {
      return 'Max heap successfully built';
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

  // Function to calculate tree positions
  const calculateTreePositions = (array) => {
    if (!array || array.length === 0) return [];
    
    const positions = [];
    const levelHeight = 60;
    const nodeSpacing = 40;
    
    // Calculate positions for each node
    for (let i = 0; i < array.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const levelNodes = Math.pow(2, level);
      const levelStartIndex = levelNodes - 1;
      const nodeIndexInLevel = i - levelStartIndex;
      
      // Calculate x position (centered within level)
      const levelWidth = (levelNodes - 1) * nodeSpacing;
      const startX = 150 - levelWidth / 2;
      const x = startX + nodeIndexInLevel * nodeSpacing;
      
      // Calculate y position
      const y = level * levelHeight + 20;
      
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

  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];
  const treePositions = calculateTreePositions(currentStepData.array);
  const connections = getConnections(currentStepData.array);

  return (
    <div className="mt-2">
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
        <h3 className="text-lg text-blue-800">Heap Tree Visualization</h3>
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
            <div className="w-full min-h-[300px] flex items-center justify-center">
              <svg 
                ref={svgRef} 
                width="100%" 
                height="300" 
                className={`border border-gray-200 rounded ${isFullscreen ? '!border-0' : ''}`}
                viewBox="0 0 300 200"
              >
                {/* Draw connections */}
                {connections.map((conn, index) => {
                  const fromPos = treePositions[conn.from];
                  const toPos = treePositions[conn.to];
                  
                  if (fromPos && toPos) {
                    return (
                      <line
                        key={index}
                        x1={fromPos.x * 0.6}
                        y1={fromPos.y * 0.6 + 20}
                        x2={toPos.x * 0.6}
                        y2={toPos.y * 0.6 + 20}
                        stroke="#9ca3af"
                        strokeWidth="1"
                      />
                    );
                  }
                  return null;
                })}
                
                {/* Draw nodes */}
                {treePositions.map((pos, posIdx) => (
                  <g key={posIdx}>
                    <circle
                      cx={pos.x * 0.6}
                      cy={pos.y * 0.6 + 20}
                      r="12"
                      className={`transition-all duration-300 ${getNodeStyle(currentStepData, posIdx)}`}
                    />
                    <text
                      x={pos.x * 0.6}
                      y={pos.y * 0.6 + 20}
                      textAnchor="middle"
                      dy=".3em"
                      fontSize="8"
                      fontWeight="bold"
                      fill={getNodeTextColor(currentStepData, posIdx)}
                    >
                      {pos.value}
                    </text>
                  </g>
                ))}
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
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          {steps.map((step, index) => {
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
                      <div className="w-full min-h-[150px] flex items-center justify-center">
                        <svg 
                          width="100%" 
                          height="150" 
                          className="border border-gray-200 rounded"
                          viewBox="0 0 300 120"
                        >
                          {/* Draw connections for this step */}
                          {stepConnections.map((conn, connIdx) => {
                            const fromPos = stepPositions[conn.from];
                            const toPos = stepPositions[conn.to];
                            
                            if (fromPos && toPos) {
                              return (
                                <line
                                  key={connIdx}
                                  x1={fromPos.x * 0.6}
                                  y1={fromPos.y * 0.6 + 20}
                                  x2={toPos.x * 0.6}
                                  y2={toPos.y * 0.6 + 20}
                                  stroke="#9ca3af"
                                  strokeWidth="1"
                                />
                              );
                            }
                            return null;
                          })}
                          
                          {/* Draw nodes for this step */}
                          {stepPositions.map((pos, posIdx) => (
                            <g key={posIdx}>
                              <circle
                                cx={pos.x * 0.6}
                                cy={pos.y * 0.6 + 20}
                                r="12"
                                className={`transition-all duration-300 ${getNodeStyle(step, posIdx)}`}
                              />
                              <text
                                x={pos.x * 0.6}
                                y={pos.y * 0.6 + 20}
                                textAnchor="middle"
                                dy=".3em"
                                fontSize="8"
                                fontWeight="bold"
                                fill={getNodeTextColor(step, posIdx)}
                              >
                                {pos.value}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                    
                    {/* Array representation */}
                    <div className="mt-2 flex flex-wrap gap-1 justify-center">
                      {step.array.map((value, arrIdx) => (
                        <div 
                          key={arrIdx}
                          className={`w-8 h-8 flex items-center justify-center text-xs font-medium border rounded ${step.sorted && step.sorted.includes(arrIdx) ? 'bg-gray-200 border-gray-400' : 'bg-white border-gray-300'}`}
                        >
                          {value}
                        </div>
                      ))}
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