import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HeapTreeVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  
  // Animation state
  const [interpolatedData, setInterpolatedData] = useState(data);
  
  // Auto-advance every 2 seconds automatically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        onNext();
      } else {
        // Loop back to the beginning
        // This requires the parent component to reset currentStep to 0
      }
    }, 2000); // Advance every 2 seconds
    
    return () => clearInterval(interval);
  }, [steps.length, currentStep, onNext]);
  
  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Heap Sort Visualization Steps', 105, 15, null, null, 'center');
    
    // Add steps with visual representations
    let currentPageY = 30;
    const pageHeight = 280; // A4 height minus margins
    
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
          const imgWidth = 80;
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
          doc.line(15, currentPageY + 18, 195, currentPageY + 18);
          currentPageY += 25;
        }
      } catch (error) {
        console.error('Error capturing step visualization:', error);
        // Fallback if capture fails
        doc.line(15, currentPageY + 18, 195, currentPageY + 18);
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
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Heap Sort Visualization Steps', 105, 15, null, null, 'center');
    
    // Add steps with visual representations
    let currentPageY = 30;
    const pageHeight = 280; // A4 height minus margins
    
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
      
      // Add visual tree representation using jsPDF drawing functions
      drawTreeVisualization(doc, step, 20, currentPageY + 20);
      
      // Move to next position
      currentPageY += 110;
      
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
    
    // Scale factor for the PDF visualization
    const scale = 0.4;
    const xOffset = x;
    const yOffset = y;
    
    // Draw connections
    connections.forEach(conn => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      if (fromPos && toPos) {
        doc.setDrawColor(156, 163, 175); // gray-400
        doc.setLineWidth(0.5);
        doc.line(
          xOffset + fromPos.x * scale,
          yOffset + fromPos.y * scale,
          xOffset + toPos.x * scale,
          yOffset + toPos.y * scale
        );
      }
    });
    
    // Draw nodes
    positions.forEach((pos, idx) => {
      // Determine node color based on state
      let fillColor = [255, 255, 255]; // white
      if (step.heapRoot !== undefined && idx === step.heapRoot) {
        fillColor = [30, 64, 175]; // blue-800
      } else if (step.comparing && step.comparing.includes(idx)) {
        fillColor = [209, 213, 219]; // gray-300
      } else if (step.swapping && step.swapping.includes(idx)) {
        fillColor = [156, 163, 175]; // gray-400
      } else if (step.sorted && step.sorted.includes(idx)) {
        fillColor = [229, 231, 235]; // gray-200
      }
      
      // Draw circle
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.setDrawColor(156, 163, 175); // gray-400 border
      doc.setLineWidth(0.5);
      doc.circle(
        xOffset + pos.x * scale,
        yOffset + pos.y * scale,
        4, // radius
        'FD' // Fill and Draw
      );
      
      // Draw value
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0); // black text
      doc.text(
        String(pos.value),
        xOffset + pos.x * scale,
        yOffset + pos.y * scale,
        null,
        null,
        'center'
      );
      
      // Draw index
      doc.setFontSize(4);
      doc.text(
        `[${idx}]`,
        xOffset + pos.x * scale,
        yOffset + pos.y * scale + 6,
        null,
        null,
        'center'
      );
    });
  };
  
  // Update interpolated data based on current step
  useEffect(() => {
    if (steps.length === 0) return;
    setInterpolatedData(steps[currentStep]);
  }, [currentStep, steps]);
  
  // Add a subtle animation effect when the step changes
  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
      svg.style.transform = 'scale(0.95)';
      svg.style.opacity = '0.7';
      
      setTimeout(() => {
        if (svg) {
          svg.style.transform = 'scale(1)';
          svg.style.opacity = '1';
        }
      }, 150);
    }
    
    // Clean up styles when component unmounts
    return () => {
      if (svg) {
        svg.style.transition = '';
        svg.style.transform = '';
        svg.style.opacity = '';
      }
    };
  }, [currentStep]);
  
  // Add CSS for smooth transitions
  const addStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      .heap-node-enter {
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.3s ease-out, transform 0.3s ease-out;
      }
      
      .heap-node-enter-active {
        opacity: 1;
        transform: scale(1);
      }
      
      .heap-step-transition {
        transition: all 0.3s ease-in-out;
      }
      
      @keyframes floatAndSink {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        25% {
          transform: translateY(-20px) scale(1.1);
          opacity: 0.9;
        }
        50% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        75% {
          transform: translateY(20px) scale(0.9);
          opacity: 0.9;
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
      
      .float-animation {
        animation: floatAndSink 1s ease-in-out;
      }
      
      @keyframes breakAndFloat {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        30% {
          transform: translateY(-30px) scale(1.2);
          opacity: 0.7;
        }
        70% {
          transform: translate(50px, -50px) scale(0.8);
          opacity: 0.5;
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
      
      .break-float-animation {
        animation: breakAndFloat 1.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    return style;
  };
  
  // Add styles on component mount
  useEffect(() => {
    const styleElement = addStyles();
    return () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Function to get node styling based on state
  const getNodeStyle = (stepData, index) => {
    let baseStyle = "transition-all duration-300 ease-in-out ";
    
    // Handle different algorithm states based on operation
    if (stepData.heapRoot !== undefined && index === stepData.heapRoot) {
      baseStyle += "fill-blue-800 stroke-blue-900"; // Highlight heap root
    } else if (stepData.comparing && stepData.comparing.includes(index)) {
      baseStyle += "fill-gray-300 stroke-gray-700 animate-pulse";
    } else if (stepData.swapping && stepData.swapping.includes(index)) {
      // Special styling for nodes that are breaking from tree
      if (stepData.operation === 'swap_heap') {
        baseStyle += "fill-red-500 stroke-red-700 transform scale-110";
      } else {
        baseStyle += "fill-gray-400 stroke-black transform scale-110";
      }
    } else if (stepData.operation && stepData.operation.includes('heap') && stepData.range && stepData.range.includes(index)) {
      // Highlight nodes involved in heap operations
      baseStyle += "fill-blue-400 stroke-blue-600";
    } else if (stepData.sorted && stepData.sorted.includes(index)) {
      baseStyle += "fill-gray-200 stroke-gray-700";
    } else {
      baseStyle += "fill-white stroke-gray-400";
    }
    
    // Add hover effect
    if (hoveredIndex === index) {
      baseStyle += " transform scale-110";
    }
    
    return baseStyle;
  };
  
  // Function to get animation class based on step data
  const getNodeAnimationClass = (stepData, index) => {
    // Check if this node is being moved due to heap property violation
    if (stepData.swapping && stepData.swapping.includes(index)) {
      // If it's a heap swap operation, add breaking and floating animation
      if (stepData.operation === 'swap_heap') {
        return 'break-float-animation';
      }
      // If it's extracting max, add a floating animation
      if (stepData.operation === 'extract_max') {
        return 'float-animation';
      }
    }
    // For nodes that are being compared but don't need swapping
    if (stepData.comparing && stepData.comparing.includes(index) && 
        (!stepData.swapping || !stepData.swapping.includes(index))) {
      return 'animate-pulse';
    }
    return '';
  };
  
  // Function to get text color based on background color
  const getNodeTextColor = (stepData, index) => {
    // White text for dark backgrounds
    if ((stepData.heapRoot !== undefined && index === stepData.heapRoot) || 
        (stepData.operation && stepData.operation.includes('heap') && stepData.range && stepData.range.includes(index)) ||
        (stepData.swapping && stepData.swapping.includes(index) && stepData.operation === 'swap_heap')) {
      return "white";
    }
    // Black text for light backgrounds
    return "black";
  };
  
  // Function to check if a node should break from tree
  const shouldBreakFromTree = (stepData, index) => {
    // Node should break when it's being swapped in a heap operation
    return stepData.swapping && 
           stepData.swapping.includes(index) && 
           stepData.operation === 'swap_heap';
  };
  
  // Function to get connection styling
  const getConnectionStyle = (stepData, fromIndex, toIndex) => {
    // If either node is breaking from tree, style the connection accordingly
    if (shouldBreakFromTree(stepData, fromIndex) || shouldBreakFromTree(stepData, toIndex)) {
      return 'stroke-red-500 stroke-dasharray-5-5 animate-pulse';
    }
    return 'stroke-gray-400';
  };
  
  // Function to get connection stroke width
  const getConnectionStrokeWidth = (stepData, fromIndex, toIndex) => {
    // Make breaking connections more prominent
    if (shouldBreakFromTree(stepData, fromIndex) || shouldBreakFromTree(stepData, toIndex)) {
      return '3';
    }
    return '2';
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (stepData.operation === 'start') {
      return 'Starting heap sort visualization...';
    } else if (stepData.operation === 'build_heap_start') {
      return 'Building max heap from array';
    } else if (stepData.operation === 'heapify_start') {
      return `Heapifying subtree rooted at position ${stepData.heapRoot}`;
    } else if (stepData.operation === 'compare_children') {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.operation === 'swap_heap') {
      return `Swapping elements at positions ${stepData.swapping.join(' and ')} to maintain heap property`;
    } else if (stepData.operation === 'after_swap') {
      return `Heap property restored after swap`;
    } else if (stepData.operation === 'no_swap_needed') {
      return `No swap needed, heap property maintained`;
    } else if (stepData.operation === 'heap_built') {
      return 'Max heap successfully built';
    } else if (stepData.operation === 'extract_max') {
      return `Extracting maximum element from heap`;
    } else if (stepData.operation === 'after_extract') {
      return `Maximum element moved to sorted portion`;
    } else if (stepData.operation === 'complete') {
      return 'Array is fully sorted!';
    } else if (stepData.comparing?.length > 0) {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.swapping?.length > 0) {
      return `Swapping elements at positions ${stepData.swapping.join(' and ')}`;
    } else if (stepData.sorted?.length > 0) {
      return `${stepData.sorted.length} elements sorted`;
    } else {
      return 'Processing...';
    }
  };

  // Function to calculate tree positions
  const calculateTreePositions = (array) => {
    const positions = [];
    const levelHeight = 80;
    const nodeWidth = 50;
    
    // Calculate positions for a complete binary tree
    for (let i = 0; i < array.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const levelNodes = Math.pow(2, level);
      const levelWidth = Math.max(400, levelNodes * nodeWidth * 1.5);
      const x = (levelWidth / (levelNodes + 1)) * ((i - levelNodes + 1) + 1);
      const y = level * levelHeight + 50;
      
      positions.push({ x, y, value: array[i], index: i });
    }
    
    return positions;
  };

  // Function to get connections between nodes
  const getConnections = (array) => {
    const connections = [];
    for (let i = 0; i < array.length; i++) {
      const leftChild = 2 * i + 1;
      const rightChild = 2 * i + 2;
      
      if (leftChild < array.length) {
        connections.push({ from: i, to: leftChild });
      }
      
      if (rightChild < array.length) {
        connections.push({ from: i, to: rightChild });
      }
    }
    
    return connections;
  };

  if (!data || !data.array || !steps || steps.length === 0) return null;
  
  // Use interpolated data for smooth animation
  const stepData = interpolatedData || data;
  const positions = calculateTreePositions(stepData.array);
  const connections = getConnections(stepData.array);

  // Auto-start the visualization when component mounts
  useEffect(() => {
    // Automatically start playing when component mounts
    if (steps.length > 0) {
      // We rely on the parent component to manage isPlaying state
    }
  }, [steps.length]);
  
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Heap Tree Visualization</h3>
        <button 
          onClick={downloadStepsAsPDFWithScreenshots}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Download PDF with Visual Trees
        </button>
      </div>
      
      <div className="bg-white p-4 border border-gray-200 mb-4 max-h-[70vh] overflow-hidden">
        {/* Single animated frame showing current step */}
        <div className="mb-6 bg-white p-3 border-2 border-gray-300 heap-step-transition">
          <h4 className="text-sm font-bold text-black mb-2 flex items-center">
            <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs mr-2">
              {currentStep + 1}
            </span>
            Step {currentStep + 1} of {steps.length}
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black text-xs font-medium rounded">
              Current
            </span>
          </h4>
          
          <div className="flex justify-center items-center mb-3 overflow-x-auto py-2">
            <div className="min-w-max">
              <svg width="500" height="300" ref={svgRef} className="heap-step-transition">
                {/* Draw connections */}
                {connections.map((conn, idx) => {
                  const fromPos = positions[conn.from];
                  const toPos = positions[conn.to];
                  if (fromPos && toPos) {
                    return (
                      <line
                        key={idx}
                        x1={fromPos.x}
                        y1={fromPos.y}
                        x2={toPos.x}
                        y2={toPos.y}
                        stroke="#9ca3af"
                        strokeWidth={getConnectionStrokeWidth(stepData, conn.from, conn.to)}
                        className={`transition-all duration-300 ease-in-out ${getConnectionStyle(stepData, conn.from, conn.to)}`}
                      />
                    );
                  }
                  return null;
                })}
                
                {/* Draw nodes */}
                {positions.map((pos, idx) => (
                  <g 
                    key={idx} 
                    className={`heap-node-enter heap-node-enter-active ${getNodeAnimationClass(stepData, idx)}`}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="20"
                      className={`${getNodeStyle(stepData, idx)} ${getNodeAnimationClass(stepData, idx)}`}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dy=".3em"
                      fontSize="12"
                      fontWeight="bold"
                      fill={getNodeTextColor(stepData, idx)}
                      className={`transition-all duration-300 ease-in-out ${getNodeAnimationClass(stepData, idx)}`}
                    >
                      {pos.value}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
          
          <div className="text-center p-2 bg-white border border-gray-200 heap-step-transition">
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(stepData)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Show all steps in a separate frame with visualizations */}
      <div className="mt-6 border border-gray-200 p-4 bg-white">
        <h4 className="text-md font-bold text-blue-800 mb-3">All Steps:</h4>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
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
                    
                    {/* Visual representation of this step */}
                    <div className="mt-2 flex justify-center">
                      <div className="min-w-max">
                        <svg width="300" height="200" className="bg-gray-50 rounded border border-gray-200">
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