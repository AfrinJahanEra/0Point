import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

const KruskalVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
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
          if (onStop) onStop();
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop]);

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('Kruskal\'s Algorithm Visualization Steps', 148.5, 15, null, null, 'center');
    
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
      
      // Add a visual representation of the graph
      if (step.edges || step.operation) {
        // Calculate bounding box for scaling
        const allNodes = new Set();
        step.edges.forEach(edge => {
          allNodes.add(edge.from);
          allNodes.add(edge.to);
        });
        step.mst.forEach(edge => {
          allNodes.add(edge.from);
          allNodes.add(edge.to);
        });
        
        const nodes = Array.from(allNodes);
        const bbox = calculateGraphBoundingBox(nodes);
        const pageWidth = 297; // A4 landscape width in mm
        const pageHeight = 210; // A4 landscape height in mm
        const availableWidth = pageWidth - 40; // Leave 20mm margin on each side
        const availableHeight = pageHeight - 60; // Leave space for header and footer
        
        // Calculate scale to fit
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
        
        // Calculate position to center
        const graphWidth = bbox.width * scale;
        const graphHeight = bbox.height * scale;
        const x = (pageWidth - graphWidth) / 2 - bbox.minX * scale;
        const y = (availableHeight - graphHeight) / 2 + 50 - bbox.minY * scale; // +50 for header space
        
        drawGraphInPDF(doc, step.edges, step.mst, x, y, 0, null, null, scale, step);
      } else {
        doc.text('Empty graph', 148.5, 105, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('kruskal-steps.pdf');
  };
  
  // Helper function to calculate graph bounding box
  const calculateGraphBoundingBox = (nodes) => {
    if (!nodes || nodes.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    
    // For simplicity, we'll arrange nodes in a circular pattern
    const radius = 100;
    const centerX = 0;
    const centerY = 0;
    
    const bbox = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      bbox.minX = Math.min(bbox.minX, x - 20);
      bbox.maxX = Math.max(bbox.maxX, x + 20);
      bbox.minY = Math.min(bbox.minY, y - 20);
      bbox.maxY = Math.max(bbox.maxY, y + 20);
    });
    
    bbox.width = bbox.maxX - bbox.minX + 40;
    bbox.height = bbox.maxY - bbox.minY + 40;
    
    return bbox;
  };
  
  // Helper function to draw graph in PDF
  const drawGraphInPDF = (doc, edges, mst, offsetX, offsetY, level = 0, parentX = null, parentY = null, scale = 1, stepData = null) => {
    if (!edges) return;
    
    // Collect all nodes
    const allNodes = new Set();
    edges.forEach(edge => {
      allNodes.add(edge.from);
      allNodes.add(edge.to);
    });
    mst.forEach(edge => {
      allNodes.add(edge.from);
      allNodes.add(edge.to);
    });
    
    const nodes = Array.from(allNodes);
    if (nodes.length === 0) return;
    
    const radius = 80 * scale;
    const centerX = offsetX + 150 * scale;
    const centerY = offsetY + 100 * scale;
    const nodeRadius = 8 * scale;
    
    // Draw edges
    // First draw all edges in gray
    edges.forEach(edge => {
      const fromIndex = nodes.indexOf(edge.from);
      const toIndex = nodes.indexOf(edge.to);
      
      if (fromIndex === -1 || toIndex === -1) return;
      
      const fromAngle = (fromIndex / nodes.length) * 2 * Math.PI;
      const toAngle = (toIndex / nodes.length) * 2 * Math.PI;
      const x1 = centerX + radius * Math.cos(fromAngle);
      const y1 = centerY + radius * Math.sin(fromAngle);
      const x2 = centerX + radius * Math.cos(toAngle);
      const y2 = centerY + radius * Math.sin(toAngle);
      
      // Check if this edge is in MST
      const isInMST = mst.some(mstEdge => 
        (mstEdge.from === edge.from && mstEdge.to === edge.to) || 
        (mstEdge.from === edge.to && mstEdge.to === edge.from)
      );
      
      // Draw edge
      if (isInMST) {
        doc.setDrawColor(16, 185, 129); // green-500 for MST
      } else {
        doc.setDrawColor(156, 163, 175); // gray-400 for others
      }
      doc.setLineWidth(isInMST ? 1.5 * scale : 0.5 * scale);
      doc.line(x1, y1, x2, y2);
      
      // Draw weight
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      doc.setFontSize(6 * scale);
      doc.setTextColor(0, 0, 0); // black
      doc.text(String(edge.weight), midX, midY - 2 * scale, null, null, 'center');
    });
    
    // Draw nodes
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Draw node circle
      doc.setFillColor(255, 255, 255); // white
      doc.setDrawColor(156, 163, 175); // gray-400
      doc.setLineWidth(0.5 * scale);
      doc.circle(x, y, nodeRadius, 'FD');
      
      // Draw node value
      doc.setFontSize(8 * scale);
      doc.setTextColor(0, 0, 0); // black
      doc.text(String(node), x, y + 3 * scale, null, null, 'center');
    });
  };

  // Function to get node styling based on state
  const getNodeStyle = (stepData, nodeValue) => {
    return "w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-500 bg-white text-black border-gray-400";
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return `Starting Kruskal's algorithm`;
    } else if (operation === 'consider_edge') {
      return `Considering edge ${stepData.currentEdge.from}-${stepData.currentEdge.to} with weight ${stepData.currentEdge.weight}`;
    } else if (operation === 'add_edge') {
      return `Adding edge ${stepData.currentEdge.from}-${stepData.currentEdge.to} to MST`;
    } else if (operation === 'skip_edge') {
      return `Skipping edge ${stepData.currentEdge.from}-${stepData.currentEdge.to} (would create cycle)`;
    } else if (operation === 'complete') {
      return 'Kruskal\'s algorithm complete!';
    } else {
      return 'Processing...';
    }
  };

  // Function to render graph nodes
  const renderGraphNode = (edges, mst, stepData) => {
    if (!edges) return null;
    
    // Collect all nodes
    const allNodes = new Set();
    edges.forEach(edge => {
      allNodes.add(edge.from);
      allNodes.add(edge.to);
    });
    mst.forEach(edge => {
      allNodes.add(edge.from);
      allNodes.add(edge.to);
    });
    
    const nodes = Array.from(allNodes);
    if (nodes.length === 0) return null;
    
    // We'll arrange nodes in a circular pattern for visualization
    const radius = 200;
    const centerX = 300;
    const centerY = 250;
    
    return (
      <g>
        {/* Draw edges */}
        {edges.map((edge, index) => {
          const fromIndex = nodes.indexOf(edge.from);
          const toIndex = nodes.indexOf(edge.to);
          
          if (fromIndex === -1 || toIndex === -1) return null;
          
          const fromAngle = (fromIndex / nodes.length) * 2 * Math.PI;
          const toAngle = (toIndex / nodes.length) * 2 * Math.PI;
          const x1 = centerX + radius * Math.cos(fromAngle);
          const y1 = centerY + radius * Math.sin(fromAngle);
          const x2 = centerX + radius * Math.cos(toAngle);
          const y2 = centerY + radius * Math.sin(toAngle);
          
          // Check if this edge is in MST
          const isInMST = mst.some(mstEdge => 
            (mstEdge.from === edge.from && mstEdge.to === edge.to) || 
            (mstEdge.from === edge.to && mstEdge.to === edge.from)
          );
          
          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isInMST ? "#10B981" : "#9CA3AF"} // green-500 for MST, gray-400 for others
                strokeWidth={isInMST ? "3" : "2"}
                className={isInMST ? "stroke-green-500" : "stroke-gray-400"}
              />
              {/* Edge weight */}
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 10}
                textAnchor="middle"
                className="font-bold text-black text-sm"
              >
                {edge.weight}
              </text>
            </g>
          );
        })}
        
        {/* Draw nodes */}
        {nodes.map((node, index) => {
          const angle = (index / nodes.length) * 2 * Math.PI;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          return (
            <g key={node}>
              {/* Render node circle */}
              <circle
                cx={x}
                cy={y}
                r="20"
                className={getNodeStyle(stepData, node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              />
              
              {/* Render node value */}
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                className="font-bold text-black"
              >
                {node}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <div className="mt-2">
      <style jsx>{`
        .traversal-highlight {
          animation: traversal-pulse 1s ease-in-out;
        }
        
        @keyframes traversal-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .path-connection {
          stroke-dasharray: 5,5;
          animation: path-dash 2s linear infinite;
        }
        
        @keyframes path-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Kruskal's Algorithm Visualization</h3>
        <div className="flex gap-2">
          {/* ADDED: Download PDF Button */}
          <button 
            onClick={downloadStepsAsPDF}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
          >
            Download PDF
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
      
      <div className="bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto">
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
          
          <div className="flex justify-center items-center mb-3 overflow-auto py-2 max-h-[500px]">
            {currentStepData ? (
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-auto">
                <svg width="100%" height="500" className="border border-gray-200 rounded min-w-[600px]" viewBox="0 0 600 500">
                  {renderGraphNode(currentStepData.edges, currentStepData.mst, currentStepData)}
                </svg>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Empty graph
              </div>
            )}
          </div>
          
          <div className="text-center p-2 bg-white border border-gray-200">
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(currentStepData)}
            </p>
            {currentStepData && (
              <div className="mt-2 text-xs">
                {currentStepData.mst && currentStepData.mst.length > 0 && (
                  <p className="text-green-600">
                    MST Edges: [{currentStepData.mst.map(edge => `${edge.from}-${edge.to}(${edge.weight})`).join(', ')}]
                  </p>
                )}
              </div>
            )}
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
                    
                    <div className="mt-3 min-h-[200px] flex items-center justify-center overflow-auto">
                      {step.edges || step.operation ? (
                        <div className="w-full min-h-[200px] overflow-auto">
                          <svg width="100%" height="300" className="border border-gray-200 rounded min-w-[400px]" viewBox="0 0 400 300">
                            {renderGraphNode(step.edges, step.mst, step)}
                          </svg>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          Empty graph
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs">
                      {step.mst && step.mst.length > 0 && (
                        <p className="text-green-600">
                          MST Edges: [{step.mst.map(edge => `${edge.from}-${edge.to}(${edge.weight})`).join(', ')}]
                        </p>
                      )}
                      {step.currentEdge && (
                        <p className="text-blue-600">
                          Current Edge: {step.currentEdge.from}-{step.currentEdge.to}({step.currentEdge.weight})
                        </p>
                      )}
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

export default KruskalVisualizer;