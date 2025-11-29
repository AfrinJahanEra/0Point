import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { Maximize, Minimize } from 'lucide-react';

const SearchVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);

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
        
        // Draw indices
        for (let i = startIndex; i < endIndex; i++) {
          const relativeIndex = i - startIndex;
          const xPos = startX + (relativeIndex * cellWidth * scale) + (cellWidth * scale / 2);
          const yPos = startY + (line * (cellHeight + 18) * scale) + 5; // Moved up slightly
          
          doc.text(String(i), xPos, yPos, null, null, 'center');
        }
        
        // Draw cells
        for (let i = startIndex; i < endIndex; i++) {
          const relativeIndex = i - startIndex;
          const xPos = startX + (relativeIndex * cellWidth * scale);
          const yPos = startY + (line * (cellHeight + 18) * scale) + 8; // Moved up slightly
          
          // Determine cell styling based on state
          let fillColor = [255, 255, 255]; // white
          let strokeColor = [156, 163, 175]; // gray-400
          
          if (step.found !== undefined && step.found === i) {
            fillColor = [16, 185, 129]; // green-500
            strokeColor = [5, 150, 105]; // green-600
          } else if (step.comparing && step.comparing.includes(i)) {
            fillColor = [209, 213, 219]; // gray-300
            strokeColor = [55, 65, 81]; // gray-700
          } else if (step.low !== undefined && step.high !== undefined && i >= step.low && i <= step.high) {
            fillColor = [191, 219, 254]; // blue-200
            strokeColor = [96, 165, 250]; // blue-400
          } else if (step.currentIndex !== undefined && i === step.currentIndex) {
            fillColor = [147, 197, 253]; // blue-300
            strokeColor = [59, 130, 246]; // blue-500
          } else if (step.mid !== undefined && i === step.mid) {
            fillColor = [207, 197, 253]; // purple-300
            strokeColor = [139, 92, 246]; // purple-500
          }
          
          // Draw cell rectangle
          doc.setFillColor(...fillColor);
          doc.setDrawColor(...strokeColor);
          doc.setLineWidth(0.3 * scale);
          doc.rect(xPos, yPos, cellWidth * scale, cellHeight * scale, 'FD');
          
          // Draw cell value
          doc.setFontSize(8 * scale);
          doc.setTextColor(0, 0, 0);
          doc.text(String(step.array[i]), xPos + (cellWidth * scale / 2), yPos + (cellHeight * scale / 2) + 3, null, null, 'center');
        }
      }
    }
  };

  if (!data || !steps || steps.length === 0) return null;

  // Check if visualization has completed (safety check)
  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  // Ensure currentStep doesn't exceed steps length
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));

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
        <h3 className="text-lg text-blue-800">Search Visualization</h3>
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
      
      <div 
        ref={fullscreenContainerRef}
        className={`bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}
      >
        {/* Fullscreen icon positioned like YouTube */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100 z-10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        
        {/* Single animated frame showing current step */}
        <div className={`mb-6 bg-white p-3 border-2 border-gray-300 group ${isFullscreen ? '!border-0 !p-0' : ''}`}>
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
                return (
                  <div
                    key={index}
                    className={getElementStyle(steps[safeCurrentStep], index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="text-xs text-gray-500">{index}</div>
                    <div>{value}</div>
                  </div>
                );
              }) : <div className="text-gray-500">No data available</div>}
            </div>
          </div>
          
          <div className={`text-center p-2 bg-white border border-gray-200 ${isFullscreen ? 'hidden' : ''}`}>
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(steps[safeCurrentStep])}
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
                    
                    <div className="mt-3 flex justify-center">
                      <div className="flex gap-1">
                        {step.array ? step.array.map((value, idx) => {
                          let elementClass = "w-8 h-8 flex flex-col items-center justify-center border text-xs ";
                          
                          if (step.found !== undefined && step.found === idx) {
                            elementClass += "bg-green-500 text-white border-green-600";
                          } else if (step.comparing && step.comparing.includes(idx)) {
                            elementClass += "bg-gray-300 text-black border-gray-700";
                          } else if (step.low !== undefined && step.high !== undefined && idx >= step.low && idx <= step.high) {
                            elementClass += "bg-blue-200 text-black border-blue-400";
                          } else if (step.currentIndex !== undefined && idx === step.currentIndex) {
                            elementClass += "bg-blue-300 text-black border-blue-500";
                          } else if (step.mid !== undefined && idx === step.mid) {
                            elementClass += "bg-purple-300 text-black border-purple-500";
                          } else {
                            elementClass += "bg-white text-black border-gray-400";
                          }
                          
                          return (
                            <div key={idx} className={elementClass}>
                              <div className="text-[0.6rem] text-gray-500">{idx}</div>
                              <div>{value}</div>
                            </div>
                          );
                        }) : <div className="text-gray-500 text-sm">No data available</div>}
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

export default SearchVisualizer;