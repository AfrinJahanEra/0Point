import React from 'react';
import { algorithms } from '../utils/algorithms';

const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <select
          id="algorithm-select"
          className="w-full p-3 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white shadow-sm transition-all duration-200 hover:border-blue-300"
          value={selectedAlgorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
        >
          <option value="">Select an algorithm...</option>
          {algorithms.map((algorithm) => (
            <option key={algorithm.id} value={algorithm.id}>
              {algorithm.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedAlgorithm && (
        <div className="mt-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg transition-all duration-300 hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
            <div>
              <p className="text-gray-800">
                <span className="font-semibold text-[#001F3F]">Algorithm Description:</span> 
                <span className="ml-1">{algorithms.find(alg => alg.id === selectedAlgorithm)?.description}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Interactive
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  Step-by-step
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorithmSelector;