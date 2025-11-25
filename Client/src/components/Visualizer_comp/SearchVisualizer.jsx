import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const SearchVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
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
    }
    
    // Handle different algorithm states based on operation
    if (stepData.found !== undefined && stepData.found === index) {
      baseStyle += "bg-green-500 text-white border-green-600"; // Found element
    } else if (stepData.comparing && stepData.comparing.includes(index)) {
      baseStyle += "bg-gray-300 text-black border-gray-700";
    } else if (stepData.low !== undefined && stepData.high !== undefined && index >= stepData.low && index <= stepData.high) {
      baseStyle += "bg-blue-200 text-black border-blue-400"; // In search range
    } else if (stepData.currentIndex !== undefined && index === stepData.currentIndex) {
      baseStyle += "bg-blue-300 text-black border-blue-500"; // Current index
    } else if (stepData.mid !== undefined && index === stepData.mid) {
      baseStyle += "bg-purple-300 text-black border-purple-500"; // Midpoint
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
      return 'Starting search visualization...';
    } else if (operation === 'compare') {
      if (stepData.currentIndex !== undefined) {
        return `Checking element at position ${stepData.currentIndex}`;
      } else if (stepData.mid !== undefined) {
        return `Checking element at position ${stepData.mid}`;
      }
      return 'Comparing elements';
    } else if (operation === 'found') {
      if (stepData.found !== undefined) {
        return `Element found at position ${stepData.found}!`;
      }
      return 'Element found!';
    } else if (operation === 'not_found') {
      return 'Element not found in the array';
    } else if (operation === 'move_right') {
      return `Element is greater, moving search to right half`;
    } else if (operation === 'move_left') {
      return `Element is smaller, moving search to left half`;
    } else {
      return 'Processing...';
    }
  };

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Search Visualization Steps', 148.5, 15, null, null, 'center');
    
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
    doc.save('search-steps.pdf');
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
          const isFound = step.found !== undefined && arrIdx === step.found;
          const isInRange = step.low !== undefined && step.high !== undefined && arrIdx >= step.low && arrIdx <= step.high;
          const isMid = step.mid !== undefined && arrIdx === step.mid;
          const isCurrent = step.currentIndex !== undefined && arrIdx === step.currentIndex;
          
          // Set fill color based on state
          if (isFound) {
            doc.setFillColor(72, 187, 120); // green-500
          } else if (isComparing) {
            doc.setFillColor(209, 213, 219); // gray-300
          } else if (isMid) {
            doc.setFillColor(216, 180, 254); // purple-300
          } else if (isCurrent) {
            doc.setFillColor(147, 197, 253); // blue-300
          } else if (isInRange) {
            doc.setFillColor(191, 219, 254); // blue-200
          } else {
            doc.setFillColor(255, 255, 255); // white
          }
          
          doc.setDrawColor(156, 163, 175); // gray-400 border
          doc.rect(cellX, cellY, cellWidth * scale, cellHeight * scale, 'FD');
          
          // Add text (white for dark backgrounds, black for light)
          doc.setFontSize(8 * scale);
          if (isFound) {
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

  if (!data || !data.array || !steps || steps.length === 0) return null;

  // Check if visualization has completed (safety check)
  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  // Ensure currentStep doesn't exceed steps length
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Search Visualization</h3>
        <div className="flex gap-2">
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
      
      <div className="bg-white p-4 border border-gray-200 mb-4">
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
          
          <div className="flex justify-center items-center mb-3 py-2">
            <div className="flex gap-2 min-w-max px-2">
              {steps[safeCurrentStep] && steps[safeCurrentStep].array ? steps[safeCurrentStep].array.map((value, index) => {
                const stepData = steps[safeCurrentStep];
                return (
                  <div 
                    key={`${safeCurrentStep}-${index}-${stepData?.comparing?.includes(index) ? 'comparing' : 'normal'}`} 
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
          
          <div className="text-center p-2 bg-white border border-gray-200">
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
              // ref removed to disable auto-scrolling
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

export default SearchVisualizer;