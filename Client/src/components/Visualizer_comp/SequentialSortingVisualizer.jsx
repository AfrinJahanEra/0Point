import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const SequentialSortingVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);
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

  // Auto-advance based on speed setting
  useEffect(() => {
    if (isPlaying && steps && steps.length > 0) {
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          if (onNext) onNext();
        } else {
          // Stop automatically when we reach the end
          if (onStop) onStop();
        }
      }, speed);
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop, speed]);

  // Ensure currentStep doesn't exceed steps length
  useEffect(() => {
    if (steps && steps.length > 0 && currentStep >= steps.length) {
      // Reset to last valid step
      // This should be handled by the parent component, but we add this as a safety check
    }
  }, [steps, currentStep]);

  // Removed auto-scrolling functionality as per user request

  // Reset completion status when steps change
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [steps]);

  // Function to get element styling based on state
  const getElementStyle = (stepData, index) => {
    // Add null check for stepData
    if (!stepData) {
      return "w-12 h-12 flex flex-col items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-white text-black border-gray-400";
    }
    
    let baseStyle = "w-12 h-12 flex flex-col items-center justify-center border-2 font-bold text-sm transition-all duration-500 ";
    
    // Add animation classes based on state
    if (stepData.comparing && stepData.comparing.includes(index)) {
      baseStyle += "animate-pulse scale-110 ";
    } else if (stepData.swapping && stepData.swapping.includes(index)) {
      // Determine which swap animation to use based on value comparison
      if (stepData.swapping.length === 2) {
        const [firstIndex, secondIndex] = stepData.swapping;
        const firstValue = stepData.array[firstIndex];
        const secondValue = stepData.array[secondIndex];
        
        if (index === firstIndex) {
          // First element - if bigger, move to small position
          baseStyle += firstValue > secondValue ? "swap-animation-big " : "swap-animation-small ";
        } else if (index === secondIndex) {
          // Second element - if smaller, move to big position
          baseStyle += secondValue < firstValue ? "swap-animation-small " : "swap-animation-big ";
        }
      } else {
        baseStyle += "swap-animation-big ";
      }
    } else if (stepData.operation === 'place' || stepData.operation === 'place_remaining' || stepData.operation === 'place_element') {
      if (stepData.swapping && stepData.swapping.includes(index)) {
        baseStyle += "animate-ping ";
      }
    }
    
    // Handle different algorithm states based on operation
    if (stepData.pivot !== undefined && index === stepData.pivot) {
      baseStyle += "bg-black text-white border-black";
    } else if (stepData.heapRoot !== undefined && index === stepData.heapRoot) {
      baseStyle += "bg-blue-800 text-white border-blue-900"; // Highlight heap root
    } else if (stepData.comparing && stepData.comparing.includes(index)) {
      baseStyle += "bg-gray-300 text-black border-gray-700";
    } else if (stepData.swapping && stepData.swapping.includes(index)) {
      baseStyle += "bg-gray-400 text-white border-black";
    } else if (stepData.operation === 'divide' && stepData.range) {
      // Check if index is in the current range being divided
      if (index >= stepData.range[0] && index <= stepData.range[1]) {
        baseStyle += "bg-gray-500 text-white border-black";
      } else if (stepData.sorted && stepData.sorted.includes(index)) {
        baseStyle += "bg-gray-200 text-black border-gray-700";
      } else {
        baseStyle += "bg-white text-black border-gray-400";
      }
    } else if (stepData.operation === 'merge_start' || stepData.operation === 'compare' || stepData.operation === 'compare_merge' || stepData.operation === 'place' || stepData.operation === 'place_remaining' || stepData.operation === 'place_element') {
      // Check if index is in the current range being merged
      if (stepData.range && index >= stepData.range[0] && index <= stepData.range[1]) {
        baseStyle += "bg-gray-500 text-white border-black";
      } else if (stepData.sorted && stepData.sorted.includes(index)) {
        baseStyle += "bg-gray-200 text-black border-gray-700";
      } else {
        baseStyle += "bg-white text-black border-gray-400";
      }
    } else if (stepData.operation && stepData.operation.includes('heap') && stepData.range && stepData.range.includes(index)) {
      // Highlight nodes involved in heap operations
      baseStyle += "bg-blue-400 text-white border-blue-600";
    } else if (stepData.sorted && stepData.sorted.includes(index)) {
      baseStyle += "bg-gray-200 text-black border-gray-700";
    } else {
      baseStyle += "bg-white text-black border-gray-400";
    }
    
    // Add hover effect
    if (hoveredIndex === index) {
      baseStyle += " transform scale-105 shadow-lg animate-gentle-pulse ";
    }
    
    return baseStyle;
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    // Add null check for stepData and operation
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting sorting visualization...';
    } else if (operation === 'single_element' || operation === 'single_element_sorted') {
      return `Single element at position ${stepData.range ? stepData.range[0] : 'N/A'} is already sorted`;
    } else if (operation === 'divide') {
      return `Dividing array from positions ${stepData.range ? `${stepData.range[0]} to ${stepData.range[1]}` : 'N/A'} at midpoint ${stepData.mid !== undefined ? stepData.mid : 'N/A'}`;
    } else if (operation === 'merge_start') {
      return `Starting to merge subarrays from positions ${stepData.range ? `${stepData.range[0]} to ${stepData.range[1]}` : 'N/A'}`;
    } else if (operation === 'compare' || operation === 'compare_pivot' || operation === 'compare_elements' || operation === 'compare_merge') {
      return `Comparing elements at positions ${stepData.comparing && stepData.comparing.length > 0 ? stepData.comparing.join(' and ') : 'N/A'}`;
    } else if (operation === 'place' || operation === 'place_remaining' || operation === 'place_element') {
      return `Placing element at position ${stepData.swapping && stepData.swapping.length > 0 ? stepData.swapping[0] : 'N/A'}`;
    } else if (operation === 'merge_complete') {
      return `Merged subarray from positions ${stepData.range ? `${stepData.range[0]} to ${stepData.range[1]}` : 'N/A'}`;
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
    } else if (operation === 'partition_start') {
      return `Partitioning array from positions ${stepData.range ? `${stepData.range[0]} to ${stepData.range[1]}` : 'N/A'}`;
    } else if (operation === 'place_pivot') {
      return `Placing pivot at position ${stepData.pivot !== undefined ? stepData.pivot : 'N/A'}`;
    } else if (operation === 'select_key') {
      return 'Selecting key for insertion';
    } else if (operation === 'compare_key') {
      return `Comparing key with element at position ${stepData.comparing && stepData.comparing.length > 0 ? stepData.comparing[0] : 'N/A'}`;
    } else if (operation === 'shift_element') {
      return 'Shifting element to make space';
    } else if (operation === 'insert_key') {
      return 'Inserting key in correct position';
    } else if (operation === 'select_min_candidate') {
      return 'Selecting candidate for minimum element';
    } else if (operation === 'update_min') {
      return `Updating minimum element to position ${stepData.comparing && stepData.comparing.length > 0 ? stepData.comparing[0] : 'N/A'}`;
    } else if (operation === 'swap_min') {
      return `Swapping minimum element at positions ${stepData.swapping && stepData.swapping.length > 0 ? stepData.swapping.join(' and ') : 'N/A'}`;
    } else if (operation === 'element_sorted' || operation === 'pass_complete') {
      return `${stepData.sorted ? stepData.sorted.length : 0} elements sorted`;
    } else if (stepData.comparing && stepData.comparing.length > 0) {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.swapping && stepData.swapping.length > 0) {
      return `Swapping elements at positions ${stepData.swapping.join(' and ')}`;
    } else if (stepData.pivot !== undefined) {
      return `Pivot at position ${stepData.pivot}`;
    } else if (stepData.sorted && stepData.sorted.length > 0) {
      return `${stepData.sorted.length} elements sorted`;
    } else {
      return 'Processing...';
    }
  };

  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Sorting Visualization Steps', 148.5, 15, null, null, 'center');
    
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
      const arrayStr = `Array: [${step.array ? step.array.join(', ') : 'N/A'}]`;
      doc.text(arrayStr, 148.5, 45, null, null, 'center');
      
      // Draw array representation centered on page
      drawArrayRepresentation(doc, step, 148.5, 60);
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('sorting-steps.pdf');
  };
  
  // Helper function to draw array representation in PDF with table-like format
  const drawArrayRepresentation = (doc, step, x, y) => {
    if (step.array) {
      // Calculate bounding box for scaling
      const cellWidth = 12;  // Increased from 10 for better spacing
      const cellHeight = 12; // Increased from 10 for better spacing
      const maxElementsPerLine = 12; // Reduced from 15 for better spacing
      
      // If too many elements, split into multiple lines
      const linesNeeded = Math.ceil(step.array.length / maxElementsPerLine);
      
      // Calculate dimensions
      const totalWidth = Math.min(step.array.length, maxElementsPerLine) * cellWidth;
      const totalHeight = linesNeeded * (cellHeight + 18); // Increased from 15 to 18 for better spacing
      
      // Calculate scaling to fit page
      const pageWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const availableWidth = pageWidth - 50; // Increase margin to 25mm on each side for better visibility
      const availableHeight = pageHeight - 90; // Increase space for header and footer
      
      const scaleX = availableWidth / totalWidth;
      const scaleY = availableHeight / totalHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
      
      // Calculate position to center with padding to ensure first element visibility
      const scaledWidth = totalWidth * scale;
      const scaledHeight = totalHeight * scale;
      const startX = (pageWidth - scaledWidth) / 2 + (2 * scale); // Add padding to ensure first element visibility
      const startY = (availableHeight - scaledHeight) / 2 + 50; // +50 for header space
      
      // Draw header with indices
      doc.setFontSize(8 * scale);
      doc.setTextColor(0, 0, 0);
      
      for (let line = 0; line < linesNeeded; line++) {
        const startIndex = line * maxElementsPerLine;
        const endIndex = Math.min(startIndex + maxElementsPerLine, step.array.length);
        
        // Draw index headers with padding
        for (let i = startIndex; i < endIndex; i++) {
          const arrIdx = i;
          const cellX = startX + ((i - startIndex) * cellWidth * scale);
          const cellY = startY + (line * (cellHeight + 18) * scale); // Increased spacing
          
          // Draw index
          doc.text(`[${arrIdx}]`, cellX + (cellWidth * scale)/2, cellY + (4 * scale), null, null, 'center');
        }
        
        // Draw array elements for this line with padding
        for (let i = startIndex; i < endIndex; i++) {
          const arrIdx = i;
          const value = step.array[arrIdx];
          const cellX = startX + ((i - startIndex) * cellWidth * scale);
          const cellY = startY + (line * (cellHeight + 18) * scale) + (6 * scale); // Increased spacing
          
          const isComparing = step.comparing && step.comparing.includes(arrIdx);
          const isSwapping = step.swapping && step.swapping.includes(arrIdx);
          const isSorted = step.sorted && step.sorted.includes(arrIdx);
          const isPivot = step.pivot !== undefined && arrIdx === step.pivot;
          const isHeapRoot = step.heapRoot !== undefined && arrIdx === step.heapRoot;
          
          // Set fill color based on state
          if (isPivot) {
            doc.setFillColor(0, 0, 0); // black
          } else if (isHeapRoot) {
            doc.setFillColor(30, 64, 175); // blue-800
          } else if (isComparing) {
            doc.setFillColor(209, 213, 219); // gray-300
          } else if (isSwapping) {
            doc.setFillColor(156, 163, 175); // gray-400
          } else if (isSorted) {
            doc.setFillColor(229, 231, 235); // gray-200
          } else {
            doc.setFillColor(255, 255, 255); // white
          }
          
          doc.setDrawColor(156, 163, 175); // gray-400 border
          doc.rect(cellX, cellY, cellWidth * scale, cellHeight * scale, 'FD');
          
          // Add text (white for dark backgrounds, black for light)
          doc.setFontSize(8 * scale);
          if (isPivot || isHeapRoot) {
            doc.setTextColor(255, 255, 255); // white
          } else {
            doc.setTextColor(0, 0, 0); // black
          }
          doc.text(String(value), cellX + (cellWidth * scale)/2, cellY + (cellHeight * scale)/2 + (3 * scale), null, null, 'center');
        }
      }
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Return new Y position
      return startY + (linesNeeded * (cellHeight + 18) * scale) + (20 * scale); // Increased spacing
    } else {
      // Simple fallback
      doc.line(20, y, 277, y);
      return y + 15;
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

  if (!data || !data.array || !steps || steps.length === 0) return null;

  // Check if visualization has completed (safety check)
  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  // Ensure currentStep doesn't exceed steps length
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));

  return (
    <div id="sequential-sorting-visualizer" className="mt-2">
      <style>
        {`
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #sequential-sorting-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #sequential-sorting-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #sequential-sorting-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #sequential-sorting-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #sequential-sorting-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #sequential-sorting-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #sequential-sorting-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #sequential-sorting-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #sequential-sorting-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #sequential-sorting-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #sequential-sorting-visualizer .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
        }
        `}
      </style>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Sorting Visualization</h3>
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
            Export PDF
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
      
      <div ref={fullscreenContainerRef} className={`group bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}>
        {/* Fullscreen toggle icon positioned on the visualization container like YouTube */}
        <button 
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-90 z-10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        
        {/* Single animated frame showing current step */}
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
            <div className="flex gap-2 min-w-max px-2">
              {steps[safeCurrentStep] && steps[safeCurrentStep].array ? steps[safeCurrentStep].array.map((value, index) => {
                const stepData = steps[safeCurrentStep];
                return (
                  <div 
                    key={`${safeCurrentStep}-${index}-${stepData?.swapping?.includes(index) ? 'swapping' : 'normal'}`} 
                    className="flex flex-col items-center"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className={getElementStyle(stepData, index)}>
                      {value}
                    </div>
                    <div className="mt-1 text-xs font-medium text-black">
                      [{index}]
                    </div>
                  </div>
                );
              }) : null}
            </div>
          </div>
          
          <div className={`text-center p-2 bg-white border border-gray-200 ${isFullscreen ? 'hidden' : ''}`}>
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(steps[safeCurrentStep])}
            </p>
          </div>
        </div>
      </div>
      
      {/* Show all steps in a separate frame with visualizations */}
      <div className="mt-6 border border-gray-200 p-4 bg-white">
        <h4 className="text-md font-bold text-blue-800 mb-3">All Steps:</h4>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                  
                  {/* Visual representation of this step with indices */}
                  <div className="mt-3">
                    {/* Indices row */}
                    <div className="flex flex-wrap gap-1 justify-center mb-1 px-1">
                      {step.array && step.array.map((_, arrIdx) => (
                        <div 
                          key={`index-${index}-${arrIdx}`}
                          className="w-10 h-5 flex items-center justify-center text-xs font-medium"
                        >
                          [{arrIdx}]
                        </div>
                      ))}
                    </div>
                    
                    {/* Values row */}
                    <div className="flex flex-wrap gap-1 justify-center px-1">
                      {step.array && step.array.map((value, arrIdx) => (
                        <div 
                          key={`value-${index}-${arrIdx}`}
                          className={`w-10 h-10 flex items-center justify-center text-xs font-medium border rounded ${getElementStyle(step, arrIdx)}`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
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

export default SequentialSortingVisualizer;