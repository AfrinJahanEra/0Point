import React from 'react';
import { algorithms } from '../utils/algorithms';

const AlgorithmSelector = ({ selectedAlgorithm, onAlgorithmChange }) => {
  return (
    <div className="mb-6">
      <label className="block text-black text-sm font-bold mb-2" htmlFor="algorithm-select">
        Select Algorithm
      </label>
      <select
        id="algorithm-select"
        className="w-full p-3 border border-gray-400 focus:outline-none"
        value={selectedAlgorithm}
        onChange={(e) => onAlgorithmChange(e.target.value)}
      >
        <option value="">Choose an algorithm to visualize...</option>
        {algorithms.map((algorithm) => (
          <option key={algorithm.id} value={algorithm.id}>
            {algorithm.name}
          </option>
        ))}
      </select>
      {selectedAlgorithm && (
        <div className="mt-3 p-3 border border-gray-400">
          <p className="text-black">
            <span className="font-semibold">Description:</span> {algorithms.find(alg => alg.id === selectedAlgorithm)?.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default AlgorithmSelector;