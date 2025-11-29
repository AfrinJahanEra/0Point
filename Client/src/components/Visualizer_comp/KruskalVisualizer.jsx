import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsPDF from 'jspdf';
import PDFDownloadButton from '../PDFDownloadButton';
import { Maximize, Minimize } from 'lucide-react';

const KruskalVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const svgRef = useRef();
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
          if (onStop) onStop();
        }
      }, speed);
      
      return () => clearInterval(interval);
    }
  }, [steps, currentStep, onNext, isPlaying, onStop, speed]);

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
    
    // Draw edges with D3 - UPDATED FOR NEW VISUAL STYLE
    svg.selectAll(".edge").remove();
    svg.selectAll(".edge-weight").remove();
    
    // Draw MST edges first (in green)
    if (stepData.mst) {
      stepData.mst.forEach(edge => {
        const pos1 = nodePositions[edge.from];
        const pos2 = nodePositions[edge.to];
        
        if (!pos1 || !pos2) return;
        
        // Draw MST edge line in green
        svg.append("line")
          .attr("class", "edge mst-edge")
          .attr("x1", pos1.x)
          .attr("y1", pos1.y)
          .attr("x2", pos2.x)
          .attr("y2", pos2.y)
          .attr("stroke", "#10B981") // green-500
          .attr("stroke-width", 3)
          .attr("opacity", 0.8);
          
        // Draw edge weight
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        
        svg.append("text")
          .attr("class", "edge-weight")
          .attr("x", midX)
          .attr("y", midY - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "#10B981")
          .text(edge.weight);
      });
    }
    
    // Draw all edges (non-MST edges in light blue)
    if (stepData.graph) {
      nodes.forEach(fromNode => {
        const neighbors = stepData.graph[fromNode] || [];
        neighbors.forEach(neighborObj => {
          const toNode = neighborObj.node;
          const weight = neighborObj.weight;
          
          // Avoid duplicate edges
          if (fromNode > toNode) return;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          if (!pos1 || !pos2) return;
          
          // Check if this edge is in MST
          const isInMST = stepData.mst && stepData.mst.some(edge => 
            (edge.from === fromNode && edge.to === toNode) || 
            (edge.from === toNode && edge.to === fromNode)
          );
          
          // Skip if already drawn as MST edge
          if (isInMST) return;
          
          // Check if this is the current edge being considered
          const isCurrentEdge = stepData.currentEdge && 
            ((stepData.currentEdge.from === fromNode && stepData.currentEdge.to === toNode) ||
             (stepData.currentEdge.from === toNode && stepData.currentEdge.to === fromNode));
          
          // Draw edge line with appropriate style
          const edge = svg.append("line")
            .attr("class", "edge")
            .attr("x1", pos1.x)
            .attr("y1", pos1.y)
            .attr("x2", pos2.x)
            .attr("y2", pos2.y)
            .attr("stroke", "#93C5FD") // Light blue default
            .attr("stroke-width", 2);
            
          // Apply dotted line for neighbor search
          if (isCurrentEdge && stepData.operation === 'consider_edge') {
            edge.attr("stroke-dasharray", "5,5")
                .attr("stroke", "#93C5FD"); // Light blue dotted for neighbor search
          } else if (stepData.mst && stepData.mst.some(edge => 
            (edge.from === fromNode && edge.to === toNode) || 
            (edge.from === toNode && edge.to === fromNode))) {
            edge.attr("stroke", "#1E40AF") // Dark blue for traversed edges
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "none");
          }
            
          // Draw edge weight
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          svg.append("text")
            .attr("class", "edge-weight")
            .attr("x", midX)
            .attr("y", midY - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", isCurrentEdge ? "#1E40AF" : "#9CA3AF")
            .text(weight);
        });
      });
    }
    
    // Draw nodes with D3 - UPDATED FOR NEW COLOR SCHEME
    svg.selectAll(".node").remove();
    svg.selectAll(".node-label").remove();
    
    nodes.forEach(node => {
      const pos = nodePositions[node];
      
      // Determine node color based on state - NEW COLOR SCHEME
      let fillColor = "white"; // Default white
      let strokeColor = "black"; // Default black border
      let textColor = "black"; // Default black text
      
      // Current node gets special treatment
      if (stepData.currentNode === node) {
        fillColor = "#93C5FD"; // Light blue for current node
        strokeColor = "black";
        textColor = "black";
      } 
      // Visited nodes
      else if (stepData.visited && stepData.visited.includes(node)) {
        fillColor = "#1E40AF"; // Dark blue for visited
        strokeColor = "black";
        textColor = "white"; // White text for dark blue background
      }
      
      // Draw node circle
      svg.append("circle")
        .attr("class", "node")
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", 20)
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
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
        .attr("fill", textColor)
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
    doc.text('Kruskal Visualization Steps', 148.5, 15, null, null, 'center');
    
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
    doc.save('kruskal-steps.pdf');
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
  
  // Helper function to draw graph in PDF - ZOOM-OUT IMPLEMENTATION
  const drawGraphInPDF = (doc, graph, offsetX, offsetY, level = 0, parentX = null, parentY = null, scale = 1, stepData = null) => {
    if (!graph) return;
    
    const nodes = Object.keys(graph);
    if (nodes.length === 0) return;
    
    // AUTO ZOOM-OUT: Calculate optimal scale to fit entire graph in PDF
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const margin = 20; // 20mm margin on all sides
    
    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = 150 * Math.cos(angle); // Base radius of 150
      const y = 100 * Math.sin(angle); // Base radius of 100
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    
    // Add padding for node size
    minX -= 20;
    maxX += 20;
    minY -= 20;
    maxY += 20;
    
    // Calculate optimal scale to fit graph within page margins
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const availableWidth = pageWidth - 2 * margin;
    const availableHeight = pageHeight - 2 * margin;
    
    const optimalScale = Math.min(
      availableWidth / graphWidth,
      availableHeight / graphHeight,
      1 // Don't upscale
    );
    
    // Center the graph on the page
    const centerX = (pageWidth - graphWidth * optimalScale) / 2 - minX * optimalScale;
    const centerY = (pageHeight - graphHeight * optimalScale) / 2 - minY * optimalScale;
    
    const radius = 80 * optimalScale;
    const nodeRadius = 8 * optimalScale;
    
    // Draw edges first
    const drawnEdges = new Set();
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x1 = centerX + 150 * optimalScale * Math.cos(angle);
      const y1 = centerY + 100 * optimalScale * Math.sin(angle);
      
      const neighbors = graph[node] || [];
      neighbors.forEach(neighborObj => {
        const neighbor = neighborObj.node;
        const weight = neighborObj.weight;
        
        // Create a unique edge identifier to avoid drawing twice
        const edgeId = [node, neighbor].sort().join('-');
        if (drawnEdges.has(edgeId)) return;
        drawnEdges.add(edgeId);
        
        const neighborIndex = nodes.indexOf(neighbor);
        if (neighborIndex === -1) return;
        
        const neighborAngle = (neighborIndex / nodes.length) * 2 * Math.PI;
        const x2 = centerX + 150 * optimalScale * Math.cos(neighborAngle);
        const y2 = centerY + 100 * optimalScale * Math.sin(neighborAngle);
        
        // Check if this edge is in MST
        const isInMST = stepData && stepData.mst && stepData.mst.some(edge => 
          (edge.from === node && edge.to === neighbor) || 
          (edge.from === neighbor && edge.to === node)
        );
        
        // Draw edge
        if (isInMST) {
          doc.setDrawColor(16, 185, 129); // green-500
        } else {
          doc.setDrawColor(156, 163, 175); // gray-400
        }
        doc.setLineWidth(0.5 * optimalScale);
        doc.line(x1, y1, x2, y2);
        
        // Draw edge weight
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        doc.setFontSize(6 * optimalScale);
        if (isInMST) {
          doc.setTextColor(16, 185, 129); // green-500
        } else {
          doc.setTextColor(156, 163, 175); // gray-400
        }
        doc.text(String(weight), midX, midY - 2 * optimalScale, null, null, 'center');
      });
    });
    
    // Draw nodes
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const x = centerX + 150 * optimalScale * Math.cos(angle);
      const y = centerY + 100 * optimalScale * Math.sin(angle);
      
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
        }
      }
      
      // Draw node circle
      doc.setFillColor(...fillColor);
      doc.setDrawColor(...strokeColor);
      doc.setLineWidth(0.5 * optimalScale);
      doc.circle(x, y, nodeRadius, 'FD');
      
      // Draw node value
      doc.setFontSize(8 * optimalScale);
      doc.setTextColor(0, 0, 0); // black
      doc.text(String(node), x, y + 3 * optimalScale, null, null, 'center');
    });
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting Kruskal algorithm';
    } else if (operation === 'consider_edge') {
      return `Considering edge from ${stepData.currentEdge.from} to ${stepData.currentEdge.to} with weight ${stepData.currentEdge.weight}`;
    } else if (operation === 'add_edge') {
      return `Adding edge from ${stepData.currentEdge.from} to ${stepData.currentEdge.to} to MST`;
    } else if (operation === 'skip_edge') {
      return `Skipping edge from ${stepData.currentEdge.from} to ${stepData.currentEdge.to} (would create cycle)`;
    } else if (operation === 'complete') {
      return 'Kruskal algorithm complete!';
    } else {
      return 'Processing...';
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

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <div id="kruskal-visualizer" className="mt-2">
      <style>
        {`
        #kruskal-visualizer .traversal-highlight {
          animation: traversal-pulse 1s ease-in-out;
        }
        
        @keyframes traversal-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        #kruskal-visualizer .path-connection {
          stroke-dasharray: 5,5;
          animation: path-dash 2s linear infinite;
        }
        
        @keyframes path-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #kruskal-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #kruskal-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #kruskal-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #kruskal-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #kruskal-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #kruskal-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #kruskal-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #kruskal-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #kruskal-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #kruskal-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #kruskal-visualizer .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
        }
        `}
      </style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Kruskal Visualization</h3>
        <div className="flex gap-2 items-center">
          {/* Speed Control */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">Speed:</span>
            <select 
              value={speed} 
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Medium (1s)</option>
              <option value={2000}>Slow (2s)</option>
              <option value={3000}>Very Slow (3s)</option>
            </select>
          </div>
          
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
      
      <div ref={fullscreenContainerRef} className={`group bg-white p-4 border border-gray-200 mb-4 max-h-[90vh] overflow-auto relative ${isFullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black border-0 p-0 m-0 fullscreen-container overflow-hidden' : ''}`}>
        {/* Fullscreen toggle icon positioned on the visualization container like YouTube */}
        <button 
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-opacity-90 z-10"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        
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
          
          <div className={`flex justify-center items-center mb-3 overflow-hidden py-2 max-h-[500px] ${isFullscreen ? 'scale-125' : ''}`}>
            {currentStepData ? (
              <div className="w-full min-h-[400px] flex items-center justify-center overflow-hidden">
                <svg 
                  ref={svgRef} 
                  width="100%" 
                  height="500" 
                  className={`border border-gray-200 rounded min-w-[600px] ${isFullscreen ? '!border-0' : ''}`}
                  viewBox="0 0 600 500"
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Empty graph
              </div>
            )}
          </div>
          
          <div className={`text-center p-2 bg-white border border-gray-200 ${isFullscreen ? 'hidden' : ''}`}>
            <p className="font-semibold text-black text-sm">
              {getOperationDescription(currentStepData)}
            </p>
            {currentStepData && (
              <div className="mt-2 text-xs">
                {currentStepData.mst && currentStepData.mst.length > 0 && (
                  <p className="text-green-600">
                    MST Edges: {currentStepData.mst.length}
                  </p>
                )}
                {currentStepData.visited && currentStepData.visited.length > 0 && (
                  <p className="text-blue-400">
                    Visited Nodes: [{currentStepData.visited.join(', ')}]
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
                      {step.mst && step.mst.length > 0 && (
                        <p className="text-green-600">
                          MST Edges: {step.mst.length}
                        </p>
                      )}
                      {step.visited && step.visited.length > 0 && (
                        <p className="text-blue-400">
                          Visited Nodes: [{step.visited.join(', ')}]
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
      {/* Draw MST edges first (in green) */}
      {step.mst && step.mst.map((edge, index) => {
        const pos1 = nodePositions[edge.from];
        const pos2 = nodePositions[edge.to];
        
        if (!pos1 || !pos2) return null;
        
        // Calculate midpoint for weight label
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        
        return (
          <g key={`mst-${index}`}>
            <line
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke="#10B981"
              strokeWidth="3"
            />
            <text
              x={midX}
              y={midY - 5}
              textAnchor="middle"
              className="font-bold text-green-600 text-xs"
            >
              {edge.weight}
            </text>
          </g>
        );
      })}
      
      {/* Draw all edges (non-MST edges in light blue) */}
      {nodes.map((fromNode) => {
        const neighbors = step.graph[fromNode] || [];
        return neighbors.map((neighborObj) => {
          const toNode = neighborObj.node;
          const weight = neighborObj.weight;
          
          // Avoid duplicate edges
          if (fromNode > toNode) return null;
          
          // Check if this edge is in MST
          const isInMST = step.mst && step.mst.some(edge => 
            (edge.from === fromNode && edge.to === toNode) || 
            (edge.from === toNode && edge.to === fromNode)
          );
          
          // Skip if already drawn as MST edge
          if (isInMST) return null;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          if (!pos1 || !pos2) return null;
          
          // Calculate midpoint for weight label
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          return (
            <g key={`${fromNode}-${toNode}`}>
              <line
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke="#93C5FD"
                strokeWidth="2"
              />
              <text
                x={midX}
                y={midY - 5}
                textAnchor="middle"
                className="font-bold text-gray-600 text-xs"
              >
                {weight}
              </text>
            </g>
          );
        });
      })}
      
      {/* Draw nodes */}
      {nodes.map((node) => {
        const pos = nodePositions[node];
        const isCurrent = step.currentNode === node;
        const isVisited = step.visited && step.visited.includes(node);
        
        let fillColor = "#93C5FD"; // Light blue default
        if (isCurrent) {
          fillColor = "#1E40AF"; // Dark blue for current node
        } else if (isVisited) {
          fillColor = "#3B82F6"; // Medium blue for visited
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

export default KruskalVisualizer;