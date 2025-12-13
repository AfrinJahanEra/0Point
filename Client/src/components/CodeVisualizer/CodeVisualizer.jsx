import React from 'react';
import LoopVisualizer from './LoopVisualizer';

const CodeVisualizer = ({ algorithmId, algorithmCode, inputData }) => {
  // For now, we'll use the LoopVisualizer as our main code visualizer
  // In the future, this component could be expanded to handle different types of code visualization
  
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl text-[#001F3F] mb-3">Code Visualization</h2>
      <div className="flex-grow">
        <LoopVisualizer />
      </div>
    </div>
  );
};

export default CodeVisualizer;