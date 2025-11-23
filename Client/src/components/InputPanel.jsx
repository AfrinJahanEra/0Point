import React from 'react';
import { toast } from 'react-hot-toast';

const InputPanel = ({ algorithm, inputValues, onInputChange, onLoadExample, onStart, isVisualizing, selectedAlgorithm }) => {
  if (!algorithm) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-black">Inputs</h3>
        <div className="flex gap-2">
          {algorithm.examples?.map((_, index) => (
            <button
              key={index}
              onClick={() => onLoadExample(index)}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 border border-gray-400"
            >
              Example {index + 1}
            </button>
          ))}
        </div>
      </div>
      
      {algorithm.inputs?.map((input, index) => (
        <div key={index} className="mb-4">
          <label className="block text-black text-xs font-bold mb-1">
            {input.label}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-grow p-3 border border-gray-400 focus:outline-none"
              placeholder={input.placeholder}
              value={inputValues[index] || ''}
              onChange={(e) => onInputChange(index, e.target.value)}
            />
            {index === algorithm.inputs.length - 1 && (
              <button
                className={`self-end py-3 px-4 font-semibold text-white transition-all ${
                  selectedAlgorithm && !isVisualizing
                    ? 'bg-blue-800 hover:bg-blue-900' 
                    : 'bg-blue-400 cursor-not-allowed'
                }`}
                onClick={() => {
                  // Validate inputs before starting visualization
                  const hasEmptyInput = algorithm.inputs.some((_, idx) => !inputValues[idx] || inputValues[idx].trim() === '');
                  if (hasEmptyInput) {
                    toast.error('Please provide input for all fields before starting visualization');
                    return;
                  }
                  onStart();
                }}
                disabled={!selectedAlgorithm || isVisualizing}
              >
                {isVisualizing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Visualizing...
                  </span>
                ) : 'Start'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InputPanel;