import React, { useState, useEffect, useRef } from 'react';

const SequentialSortingVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const visualizationRef = useRef(null);
  const currentStepRef = useRef(null);

  // Scroll to the current step whenever it changes
  useEffect(() => {
    if (currentStepRef.current) {
      currentStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  // Function to get element styling based on state
  const getElementStyle = (stepData, index) => {
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
    } else if (stepData.operation === 'place' || stepData.operation === 'place_remaining') {
      if (stepData.swapping && stepData.swapping.includes(index)) {
        baseStyle += "animate-ping ";
      }
    }
    
    // Handle different algorithm states based on operation
    if (stepData.pivot !== undefined && index === stepData.pivot) {
      baseStyle += "bg-black text-white border-black";
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
    } else if (stepData.operation === 'merge_start' || stepData.operation === 'compare' || stepData.operation === 'place' || stepData.operation === 'place_remaining') {
      // Check if index is in the current range being merged
      if (stepData.range && index >= stepData.range[0] && index <= stepData.range[1]) {
        baseStyle += "bg-gray-500 text-white border-black";
      } else if (stepData.sorted && stepData.sorted.includes(index)) {
        baseStyle += "bg-gray-200 text-black border-gray-700";
      } else {
        baseStyle += "bg-white text-black border-gray-400";
      }
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
    if (stepData.operation === 'start') {
      return 'Starting merge sort visualization...';
    } else if (stepData.operation === 'single_element') {
      return `Single element at position ${stepData.range[0]} is already sorted`;
    } else if (stepData.operation === 'divide') {
      return `Dividing array from positions ${stepData.range[0]} to ${stepData.range[1]} at midpoint ${stepData.mid}`;
    } else if (stepData.operation === 'merge_start') {
      return `Starting to merge subarrays from positions ${stepData.range[0]} to ${stepData.range[1]}`;
    } else if (stepData.operation === 'compare') {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.operation === 'place' || stepData.operation === 'place_remaining') {
      return `Placing element at position ${stepData.swapping[0]}`;
    } else if (stepData.operation === 'merge_complete') {
      return `Merged subarray from positions ${stepData.range[0]} to ${stepData.range[1]}`;
    } else if (stepData.operation === 'complete') {
      return 'Array is fully sorted!';
    } else if (stepData.comparing?.length > 0) {
      return `Comparing elements at positions ${stepData.comparing.join(' and ')}`;
    } else if (stepData.swapping?.length > 0) {
      return `Swapping elements at positions ${stepData.swapping.join(' and ')}`;
    } else if (stepData.pivot !== undefined) {
      return `Pivot at position ${stepData.pivot}`;
    } else if (stepData.sorted?.length > 0) {
      return `${stepData.sorted.length} elements sorted`;
    } else {
      return 'Processing...';
    }
  };

  if (!data || !data.array || !steps || steps.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Sorting Visualization</h3>
        <div className="flex gap-2">
          {isPlaying && (
            <button 
              onClick={onStop}
              className="px-3 py-1 bg-blue-800 text-white rounded text-sm font-medium hover:bg-blue-900 transition-colors flex items-center"
            >
              Stop
            </button>
          )}
          <button 
            onClick={onPrev}
            disabled={currentStep === 0}
            className="px-3 py-1 bg-white text-blue-800 border border-blue-800 rounded text-sm font-medium hover:bg-blue-50 transition-colors flex items-center disabled:opacity-50"
          >
            Prev
          </button>
          <button 
            onClick={onNext}
            disabled={currentStep === steps.length - 1}
            className="px-3 py-1 bg-blue-800 text-white rounded text-sm font-medium hover:bg-blue-900 transition-colors flex items-center disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      
      <div ref={visualizationRef} className="bg-white p-4 border border-gray-200 mb-4 max-h-[70vh] overflow-y-auto">
        {/* Show all steps up to current step */}
        {steps.slice(0, currentStep + 1).map((stepData, stepIndex) => (
          <div 
            key={stepIndex} 
            ref={stepIndex === currentStep ? currentStepRef : null}
            className={`mb-6 ${stepIndex === currentStep ? 'bg-white p-3 border-2 border-gray-300' : ''}`}
          >
            <h4 className="text-sm font-bold text-black mb-2 flex items-center">
              <span className={`w-5 h-5 ${stepIndex === currentStep ? 'bg-black' : 'bg-gray-600'} text-white rounded-full flex items-center justify-center text-xs mr-2`}>
                {stepIndex + 1}
              </span>
              Step {stepIndex + 1} of {steps.length}
              {stepIndex === currentStep && (
                <span className="ml-2 px-2 py-0.5 bg-gray-200 text-black text-xs font-medium rounded">
                  Current
                </span>
              )}
            </h4>
            <div className="flex justify-center items-center mb-3 overflow-x-auto py-2">
              <div className="flex gap-1.5 min-w-max">
                {stepData.array.map((value, index) => (
                  <div 
                    key={`${stepIndex}-${index}-${stepData.swapping?.includes(index) ? 'swapping' : 'normal'}`} 
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
                ))}
              </div>
            </div>
            <div className="text-center p-2 bg-white border border-gray-200">
              <p className="font-semibold text-black text-sm">
                {getOperationDescription(stepData)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SequentialSortingVisualizer;