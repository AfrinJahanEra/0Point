import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsPDF from 'jspdf';
import PDFDownloadButton from '../PDFDownloadButton';

const DFSVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const svgRef = useRef();
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

  // D3.js animation effect
  useEffect(() => {
    if (!svgRef.current || !steps || steps.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const stepData = steps[currentStep];
    
    if (!stepData) return;
    
    // Clear previous animations
    svg.selectAll("*").interrupt();
    
    // Get SVG dimensions
    const width = 600;
    const height = 500;
    const radius = 150;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Collect all nodes
    const allNodes = new Set();
    if (stepData.graph) {
      Object.keys(stepData.graph).forEach(node => allNodes.add(node));
    }
    
    const nodes = Array.from(allNodes);
    if (nodes.length === 0) return;
    
    // Position nodes in a circle
    const nodePositions = {};
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      nodePositions[node] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    // Draw edges with D3
    svg.selectAll(".edge").remove();
    
    if (stepData.graph) {
      nodes.forEach(fromNode => {
        const neighbors = stepData.graph[fromNode] || [];
        neighbors.forEach(toNode => {
          // Avoid duplicate edges
          if (fromNode > toNode) return;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          if (!pos1 || !pos2) return;
          
          // Check if this edge connects to the current node
          const isConnectedToCurrent = stepData.currentNode && 
            (fromNode === stepData.currentNode || toNode === stepData.currentNode);
          
          // Draw edge line
          svg.append("line")
            .attr("class", "edge")
            .attr("x1", pos1.x)
            .attr("y1", pos1.y)
            .attr("x2", pos2.x)
            .attr("y2", pos2.y)
            .attr("stroke", isConnectedToCurrent ? "#1E40AF" : "#93C5FD") // Dark blue for current connections, light blue for others
            .attr("stroke-width", isConnectedToCurrent ? 3 : 2)
            .attr("opacity", 0.8);
        });
      });
    }
    
    // Draw nodes with D3
    svg.selectAll(".node").remove();
    svg.selectAll(".node-label").remove();
    
    nodes.forEach(node => {
      const pos = nodePositions[node];
      
      // Determine node color based on state
      let fillColor = "#93C5FD"; // Light blue default
      if (stepData.currentNode === node) {
        fillColor = "#1E40AF"; // Dark blue for current node
      } else if (stepData.visited && stepData.visited.includes(node)) {
        fillColor = "#3B82F6"; // Medium blue for visited
      } else if (stepData.stack && stepData.stack.includes(node)) {
        fillColor = "#60A5FA"; // Slightly darker light blue for stacked
      }
      
      // Draw node circle
      svg.append("circle")
        .attr("class", "node")
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", 20)
        .attr("fill", fillColor)
        .attr("stroke", "#1E40AF")
        .attr("stroke-width", 2)
        .on("mouseover", () => setHoveredNode(node))
        .on("mouseout", () => setHoveredNode(null));
      
      // Draw node label
      svg.append("text")
        .attr("class", "node-label")
        .attr("x", pos.x)
        .attr("y", pos.y + 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text(node);
    });
    
    // Add animation for node transitions
    if (stepData.currentNode) {
      svg.selectAll(".node")
        .filter((d, i, nodes) => {
          const nodeText = d3.select(nodes[i]).text();
          return nodeText === stepData.currentNode;
        })
        .transition()
        .duration(1000)
        .attr("r", 25)
        .transition()
        .duration(1000)
        .attr("r", 20);
    }
    
  }, [currentStep, steps]);

  // Function to download all steps as PDF with visual representations
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(22);
    doc.text('DFS Visualization Steps', 148.5, 15, null, null, 'center');
    
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
      if (step.graph || step.operation) {
        // Calculate bounding box for scaling
        const bbox = calculateGraphBoundingBox(step.graph);
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
        
        drawGraphInPDF(doc, step.graph, x, y, 0, null, null, scale, step);
      } else {
        doc.text('Empty graph', 148.5, 105, null, null, 'center');
      }
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('dfs-steps.pdf');
  };
  
  // Helper function to calculate graph bounding box
  const calculateGraphBoundingBox = (graph) => {
    if (!graph) return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    
    const nodes = Object.keys(graph);
    if (nodes.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    
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
  const drawGraphInPDF = (doc, graph, offsetX, offsetY, level = 0, parentX = null, parentY = null, scale = 1, stepData = null) => {
    if (!graph) return;
    
    const nodes = Object.keys(graph);
    if (nodes.length === 0) return;
    
    const radius = 80 * scale;
    const centerX = offsetX + 150 * scale;
    const centerY = offsetY + 100 * scale;
    const nodeRadius = 8 * scale;
    
    // Draw edges first
    const drawnEdges = new Set();
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x1 = centerX + radius * Math.cos(angle);
      const y1 = centerY + radius * Math.sin(angle);
      
      const neighbors = graph[node] || [];
      neighbors.forEach(neighbor => {
        // Create a unique edge identifier to avoid drawing twice
        const edgeId = [node, neighbor].sort().join('-');
        if (drawnEdges.has(edgeId)) return;
        drawnEdges.add(edgeId);
        
        const neighborIndex = nodes.indexOf(neighbor);
        if (neighborIndex === -1) return;
        
        const neighborAngle = (neighborIndex / nodes.length) * 2 * Math.PI;
        const x2 = centerX + radius * Math.cos(neighborAngle);
        const y2 = centerY + radius * Math.sin(neighborAngle);
        
        // Draw edge
        doc.setDrawColor(156, 163, 175); // gray-400
        doc.setLineWidth(0.5 * scale);
        doc.line(x1, y1, x2, y2);
      });
    });
    
    // Draw nodes
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Determine node style based on step data
      let fillColor = [255, 255, 255]; // white
      let strokeColor = [156, 163, 175]; // gray-400
      
      if (stepData) {
        if (stepData.currentNode === node) {
          fillColor = [59, 130, 246]; // blue-500
          strokeColor = [37, 99, 235]; // blue-600
        } else if (stepData.visited && stepData.visited.includes(node)) {
          fillColor = [16, 185, 129]; // green-500
          strokeColor = [5, 150, 105]; // green-600
        } else if (stepData.stack && stepData.stack.includes(node)) {
          fillColor = [245, 158, 11]; // amber-500
          strokeColor = [217, 119, 6]; // amber-600
        } else if (stepData.queue && stepData.queue.includes(node)) {
          fillColor = [139, 92, 246]; // purple-500
          strokeColor = [124, 58, 237]; // purple-600
        }
      }
      
      // Draw node circle
      doc.setFillColor(...fillColor);
      doc.setDrawColor(...strokeColor);
      doc.setLineWidth(0.5 * scale);
      doc.circle(x, y, nodeRadius, 'FD');
      
      // Draw node value
      doc.setFontSize(8 * scale);
      doc.setTextColor(0, 0, 0); // black
      doc.text(String(node), x, y + 3 * scale, null, null, 'center');
    });
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return `Starting DFS traversal`;
    } else if (operation === 'visit') {
      return `Visiting node ${stepData.currentNode}`;
    } else if (operation === 'push') {
      return `Pushing neighbor ${stepData.neighbor} to stack`;
    } else if (operation === 'backtrack') {
      return `Backtracking from node ${stepData.currentNode}`;
    } else if (operation === 'complete') {
      return 'DFS traversal complete!';
    } else {
      return 'Processing...';
    }
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
        <h3 className="text-lg text-blue-800">DFS Visualization</h3>
        <div className="flex gap-2">
          {/* ADDED: Download PDF Button */}
          <PDFDownloadButton onClick={downloadStepsAsPDF} label="Download PDF" />
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
                <svg 
                  ref={svgRef} 
                  width="100%" 
                  height="500" 
                  className="border border-gray-200 rounded min-w-[600px]"
                  viewBox="0 0 600 500"
                />
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
                {currentStepData.stack && currentStepData.stack.length > 0 && (
                  <p className="text-blue-600">
                    Stack: [{currentStepData.stack.join(', ')}]
                  </p>
                )}
                {currentStepData.visited && currentStepData.visited.length > 0 && (
                  <p className="text-blue-400">
                    Visited: [{currentStepData.visited.join(', ')}]
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
                      {step.graph || step.operation ? (
                        <div className="w-full min-h-[200px] overflow-auto">
                          <svg width="100%" height="300" className="border border-gray-200 rounded min-w-[400px]" viewBox="0 0 400 300">
                            {/* Static visualization for step list */}
                            {renderStaticGraph(step)}
                          </svg>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          Empty graph
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs">
                      {step.stack && step.stack.length > 0 && (
                        <p className="text-blue-600">
                          Stack: [{step.stack.join(', ')}]
                        </p>
                      )}
                      {step.visited && step.visited.length > 0 && (
                        <p className="text-blue-400">
                          Visited: [{step.visited.join(', ')}]
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

// Helper function to render static graph for step list
const renderStaticGraph = (step) => {
  if (!step.graph) return null;
  
  const nodes = Object.keys(step.graph);
  if (nodes.length === 0) return null;
  
  // We'll arrange nodes in a circular pattern for visualization
  const radius = 100;
  const centerX = 200;
  const centerY = 150;
  
  // Position nodes
  const nodePositions = {};
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    nodePositions[node] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });
  
  return (
    <g>
      {/* Draw edges */}
      {nodes.map((fromNode) => {
        const neighbors = step.graph[fromNode] || [];
        return neighbors.map((toNode) => {
          // Avoid duplicate edges
          if (fromNode > toNode) return null;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          return (
            <line
              key={`${fromNode}-${toNode}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke="#93C5FD"
              strokeWidth="2"
            />
          );
        });
      })}
      
      {/* Draw nodes */}
      {nodes.map((node) => {
        const pos = nodePositions[node];
        const isCurrent = step.currentNode === node;
        const isVisited = step.visited && step.visited.includes(node);
        const isStacked = step.stack && step.stack.includes(node);
        
        let fillColor = "#93C5FD"; // Light blue default
        if (isCurrent) {
          fillColor = "#1E40AF"; // Dark blue for current node
        } else if (isVisited) {
          fillColor = "#3B82F6"; // Medium blue for visited
        } else if (isStacked) {
          fillColor = "#60A5FA"; // Slightly darker light blue for stacked
        }
        
        return (
          <g key={node}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="15"
              fill={fillColor}
              stroke="#1E40AF"
              strokeWidth="2"
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              className="font-bold text-white text-sm"
            >
              {node}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default DFSVisualizer;