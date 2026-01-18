import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsPDF from 'jspdf';
import PDFDownloadButton from '../PDFDownloadButton';
import { Maximize, Minimize } from 'lucide-react';

const DijkstraVisualizer = ({ data, steps, currentStep, totalSteps, isPlaying, onStop, onNext, onPrev, onRestart }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const svgRef = useRef();
  const currentStepRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const [speed, setSpeed] = useState(2000); // Default 2 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef(null);
  
  // State for node dragging
  const [draggedNodes, setDraggedNodes] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  // D3.js animation effect - BEAUTIFIED VERSION (matching DFS/BFS styling)
  useEffect(() => {
    if (!svgRef.current || !steps || steps.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const stepData = steps[currentStep];
    
    if (!stepData) return;
    
    // Clear previous animations and elements
    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();
    
    // Add defs for gradients (matching DFS/BFS beautiful styling)
    const defs = svg.append("defs");
    
    // Beautiful gradient for current nodes (processing node in Dijkstra)
    defs.append("radialGradient")
      .attr("id", "beautifulCurrentGradient")
      .attr("cx", "30%")
      .attr("cy", "30%")
      .attr("r", "70%")
      .html(`
        <stop offset="0%" stop-color="#FEF3C7" />
        <stop offset="50%" stop-color="#FDE68A" />
        <stop offset="100%" stop-color="#FCD34D" />
      `);
    
    // Beautiful gradient for visited nodes  
    defs.append("radialGradient")
      .attr("id", "beautifulVisitedGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")
      .html(`
        <stop offset="0%" stop-color="#3B82F6" />
        <stop offset="100%" stop-color="#1E40AF" />
      `);
    
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
    
    // Position nodes in a circle with support for dragged positions
    const nodePositions = {};
    nodes.forEach((node, index) => {
      // Check if node has been dragged
      if (draggedNodes[node]) {
        nodePositions[node] = draggedNodes[node];
      } else {
        const angle = (index / nodes.length) * 2 * Math.PI;
        nodePositions[node] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      }
    });
    
    // Draw edges with beautiful styling (matching DFS/BFS)
    if (stepData.graph) {
      nodes.forEach(fromNode => {
        const neighbors = stepData.graph[fromNode] || [];
        neighbors.forEach(neighborObj => {
          const toNode = neighborObj.node;
          const weight = neighborObj.weight;
          
          if (fromNode > toNode) return;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          if (!pos1 || !pos2) return;
          
          // Beautiful edge styling - matching DFS/BFS
          let strokeColor = "#4B5563"; // Professional gray
          let strokeWidth = 2.5;
          
          // Dark blue for visited edges with emphasis
          if (stepData.visited && 
              stepData.visited.includes(fromNode) && 
              stepData.visited.includes(toNode)) {
            strokeColor = "#1E40AF"; // Rich dark blue
            strokeWidth = 4.5;
          }
          
          // Add subtle glow effect for important edges
          if (strokeWidth > 3) {
            svg.append("line")
              .attr("x1", pos1.x)
              .attr("y1", pos1.y)
              .attr("x2", pos2.x)
              .attr("y2", pos2.y)
              .attr("stroke", strokeColor)
              .attr("stroke-width", strokeWidth + 1)
              .attr("stroke-linecap", "round")
              .attr("opacity", 0.3)
              .style("filter", "blur(1px)");
          }
          
          // Main edge line
          svg.append("line")
            .attr("x1", pos1.x)
            .attr("y1", pos1.y)
            .attr("x2", pos2.x)
            .attr("y2", pos2.y)
            .attr("stroke", strokeColor)
            .attr("stroke-width", strokeWidth)
            .attr("stroke-linecap", "round");
          
          // Draw edge weight with beautiful styling
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          svg.append("text")
            .attr("x", midX)
            .attr("y", midY - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("font-family", "'Inter', system-ui, sans-serif")
            .attr("fill", "#6B7280")
            .text(weight);
        });
      });
    }
    
    // Draw nodes with beautiful styling AND drag functionality (matching DFS/BFS)
    svg.selectAll(".node").remove();
    svg.selectAll(".node-label").remove();
    svg.selectAll(".node-distance").remove();
    
    nodes.forEach(node => {
      const pos = nodePositions[node];
      
      // Beautiful node styling - matching DFS/BFS exactly
      let fillColor = "white";
      let strokeColor = "#6B7280";
      let textColor = "#1F2937";
      let strokeWidth = 2;
      let nodeRadius = 24;
      
      // Current node (processing node in Dijkstra) - Beautiful gradient with effects
      if (stepData.currentNode === node) {
        fillColor = "url(#beautifulCurrentGradient)";
        strokeColor = "#F59E0B"; // Warm amber border
        strokeWidth = 3;
        nodeRadius = 28;
        textColor = "#92400E"; // Dark amber text
        
        // Add glow effect
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 3)
          .attr("fill", "#FCD34D")
          .attr("opacity", 0.3)
          .style("filter", "blur(3px)");
      } 
      // Visited nodes - Beautiful blue gradient
      else if (stepData.visited && stepData.visited.includes(node)) {
        fillColor = "url(#beautifulVisitedGradient)";
        strokeColor = "#1E40AF"; // Deep blue border
        strokeWidth = 2.5;
        textColor = "white";
        
        // Add subtle inner glow
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius - 2)
          .attr("fill", "white")
          .attr("opacity", 0.2);
      }
      // Unvisited nodes - Light styling
      else if (stepData.unvisited && stepData.unvisited.includes(node)) {
        fillColor = "#F9FAFB"; // Very light gray
        strokeColor = "#D1D5DB"; // Light gray border
        strokeWidth = 2;
        textColor = "#374151"; // Dark gray text
      }
      
      // Draw main node circle WITH DRAG FUNCTIONALITY
      const nodeCircle = svg.append("circle")
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", nodeRadius)
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
        .attr("stroke-width", strokeWidth)
        .attr("cursor", "pointer")
        .on("mouseover", function() {
          // Visual feedback on hover
          d3.select(this)
            .attr("r", nodeRadius + 2)
            .attr("stroke-width", strokeWidth + 1);
        })
        .on("mouseout", function() {
          // Return to normal state
          d3.select(this)
            .attr("r", nodeRadius)
            .attr("stroke-width", strokeWidth);
        })
        .call(d3.drag()
          .on("start", function(event) {
            setIsDragging(true);
            setDragNode(node);
            setDragStart({ x: event.x, y: event.y });
          })
          .on("drag", function(event) {
            // Update the dragged node position
            const newX = event.x;
            const newY = event.y;
            
            // Update the node position
            d3.select(this)
              .attr("cx", newX)
              .attr("cy", newY);
            
            // Update the glow effects if they exist
            svg.selectAll(`circle`).each(function() {
              const circle = d3.select(this);
              const cx = parseFloat(circle.attr("cx"));
              const cy = parseFloat(circle.attr("cy"));
              
              // Check if this circle belongs to the dragged node
              if (Math.abs(cx - pos.x) < 1 && Math.abs(cy - pos.y) < 1) {
                circle.attr("cx", newX).attr("cy", newY);
              }
            });
            
            // Update the node labels and distances
            svg.selectAll("text").each(function() {
              const text = d3.select(this);
              const x = parseFloat(text.attr("x"));
              const y = parseFloat(text.attr("y"));
              
              // Check if this text belongs to the dragged node
              if (Math.abs(x - pos.x) < 1) {
                if (Math.abs(y - pos.y) < 1) {
                  // Node label
                  text.attr("x", newX).attr("y", newY + 6);
                } else if (Math.abs(y - (pos.y + 15)) < 1) {
                  // Distance label
                  text.attr("x", newX).attr("y", newY + 21);
                }
              }
            });
            
            // Update connected edges and weights
            svg.selectAll("line, text").each(function() {
              const element = d3.select(this);
              const x1 = parseFloat(element.attr("x1"));
              const y1 = parseFloat(element.attr("y1"));
              const x2 = parseFloat(element.attr("x2"));
              const y2 = parseFloat(element.attr("y2"));
              const textX = parseFloat(element.attr("x"));
              const textY = parseFloat(element.attr("y"));
              
              // Update edge positions
              if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                if (Math.abs(x1 - pos.x) < 1 && Math.abs(y1 - pos.y) < 1) {
                  element.attr("x1", newX).attr("y1", newY);
                }
                if (Math.abs(x2 - pos.x) < 1 && Math.abs(y2 - pos.y) < 1) {
                  element.attr("x2", newX).attr("y2", newY);
                }
              }
              
              // Update edge weight positions
              if (!isNaN(textX) && !isNaN(textY)) {
                const midX = (newX + (element.attr("x2") ? parseFloat(element.attr("x2")) : newX)) / 2;
                const midY = (newY + (element.attr("y2") ? parseFloat(element.attr("y2")) : newY)) / 2;
                
                if (Math.abs(textX - (pos.x + (element.attr("x2") ? parseFloat(element.attr("x2")) : pos.x))/2) < 1 && 
                    Math.abs(textY - ((pos.y + (element.attr("y2") ? parseFloat(element.attr("y2")) : pos.y))/2 - 5)) < 1) {
                  element.attr("x", midX).attr("y", midY - 5);
                }
              }
            });
            
            // Update the position in our state
            setDraggedNodes(prev => ({
              ...prev,
              [node]: { x: newX, y: newY }
            }));
          })
          .on("end", function() {
            setIsDragging(false);
            setDragNode(null);
          })
        );
      
      // Draw node label with beautiful typography (matching DFS/BFS)
      svg.append("text")
        .attr("x", pos.x)
        .attr("y", pos.y + 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "600")
        .attr("font-family", "'Inter', system-ui, sans-serif")
        .attr("fill", textColor)
        .attr("pointer-events", "none")
        .text(node);
      
      // Draw node distance with beautiful styling
      const distance = stepData.distances && stepData.distances[node];
      if (distance !== undefined) {
        svg.append("text")
          .attr("x", pos.x)
          .attr("y", pos.y + 21)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "600")
          .attr("font-family", "'Inter', system-ui, sans-serif")
          .attr("fill", textColor)
          .attr("pointer-events", "none")
          .text(distance === Infinity ? "∞" : distance);
      }
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
        .attr("r", 30)
        .transition()
        .duration(1000)
        .attr("r", 25);
    }
    
  }, [currentStep, steps, draggedNodes, isDragging, dragNode]);

  // Function to download all steps as PDF with beautiful visual representations (matching DFS/BFS)
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title with beautiful styling (matching DFS/BFS)
    doc.setFontSize(24);
    doc.setTextColor(26, 86, 150); // Dark blue
    doc.text('Dijkstra Visualization Steps', 148.5, 15, null, null, 'center');
    
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99); // Gray subtitle
    doc.text('Step-by-step shortest path algorithm', 148.5, 25, null, null, 'center');
    
    // Add steps with beautiful visual representations (matching DFS/BFS)
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      
      // Add a new page for each step (except the first one)
      if (index > 0) {
        doc.addPage();
      }
      
      // Add step header with beautiful styling
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55); // Dark header
      doc.text(`Step ${index + 1} of ${steps.length}`, 148.5, 35, null, null, 'center');
      
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128); // Gray description
      doc.text(getOperationDescription(step), 148.5, 45, null, null, 'center');
      
      // Add a beautiful visual representation of the graph
      if (step.graph || step.operation) {
        // Calculate bounding box for scaling
        const bbox = calculateGraphBoundingBox(step.graph);
        const pageWidth = 297; // A4 landscape width in mm
        const pageHeight = 210; // A4 landscape height in mm
        const availableWidth = pageWidth - 40; // Leave 20mm margin on each side
        const availableHeight = pageHeight - 70; // Leave space for header and footer
        
        // Calculate scale to fit
        const scaleX = availableWidth / bbox.width;
        const scaleY = availableHeight / bbox.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
        
        // Calculate position to center
        const graphWidth = bbox.width * scale;
        const graphHeight = bbox.height * scale;
        const x = (pageWidth - graphWidth) / 2 - bbox.minX * scale;
        const y = (availableHeight - graphHeight) / 2 + 60 - bbox.minY * scale; // +60 for header space
        
        drawBeautifulGraphInPDF(doc, step.graph, x, y, 0, null, null, scale, step);
      } else {
        doc.setFontSize(14);
        doc.setTextColor(156, 163, 175);
        doc.text('Empty graph', 148.5, 105, null, null, 'center');
      }
      
      // Add step information (matching DFS/BFS styling)
      if (step.queue && step.queue.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(245, 158, 11); // Amber for queue
        doc.text(`Queue: [${step.queue.join(', ')}]`, 20, 190);
      }
      
      if (step.visited && step.visited.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(30, 64, 175); // Dark blue for visited
        doc.text(`Visited: [${step.visited.join(', ')}]`, 20, 198);
      }
      
      if (step.unvisited && step.unvisited.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // Gray for unvisited
        doc.text(`Unvisited: [${step.unvisited.join(', ')}]`, 20, 206);
      }
      
      // Add page number
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${index + 1} of ${steps.length}`, 277, 200, null, null, 'right');
      
      // Add a small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Save the PDF
    doc.save('dijkstra-visualization-steps.pdf');
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
        
        // Draw edge
        doc.setDrawColor(156, 163, 175); // gray-400
        doc.setLineWidth(0.5 * optimalScale);
        doc.line(x1, y1, x2, y2);
        
        // Draw edge weight
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        doc.setFontSize(6 * optimalScale);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(String(weight), midX, midY - 3 * optimalScale, null, null, 'center');
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
        } else if (stepData.unvisited && stepData.unvisited.includes(node)) {
          fillColor = [245, 158, 11]; // amber-500
          strokeColor = [217, 119, 6]; // amber-600
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
      
      // Draw node distance
      if (stepData && stepData.distances && stepData.distances[node] !== undefined) {
        const distance = stepData.distances[node];
        doc.setFontSize(6 * optimalScale);
        doc.setTextColor(0, 0, 0); // black
        doc.text(distance === Infinity ? "∞" : String(distance), x, y + 12 * optimalScale, null, null, 'center');
      }
    });
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return `Starting Dijkstra traversal from node ${stepData.startNode}`;
    } else if (operation === 'visit') {
      return `Visiting node ${stepData.currentNode}`;
    } else if (operation === 'relax_edge') {
      return `Relaxing edge from ${stepData.fromNode} to ${stepData.toNode} with weight ${stepData.weight}`;
    } else if (operation === 'update_distance') {
      return `Updating distance to node ${stepData.toNode} to ${stepData.newDistance}`;
    } else if (operation === 'complete') {
      return 'Dijkstra traversal complete!';
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

  // Reset node positions to original layout
  const resetNodePositions = () => {
    setDraggedNodes({});
  };

  if (!data || !steps || steps.length === 0) return null;

  const isCompleted = steps.length > 0 && currentStep === steps.length - 1 && !isPlaying;
  const safeCurrentStep = Math.min(currentStep, Math.max(0, steps.length - 1));
  const currentStepData = steps[safeCurrentStep];

  return (
    <div id="dijkstra-visualizer" className="mt-2">
      <style>
        {`
        #dijkstra-visualizer .traversal-highlight {
          animation: traversal-pulse 1s ease-in-out;
        }
        
        @keyframes traversal-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        #dijkstra-visualizer .path-connection {
          stroke-dasharray: 5,5;
          animation: path-dash 2s linear infinite;
        }
        
        @keyframes path-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        
        /* Screen floating animation for entire graph structure */
        @keyframes screen-float {
          0% {
            transform: translateX(0px);
          }
          25% {
            transform: translateX(10px);
          }
          50% {
            transform: translateX(0px);
          }
          75% {
            transform: translateX(-10px);
          }
          100% {
            transform: translateX(0px);
          }
        }
        
        .screen-floating {
          animation: screen-float 8s ease-in-out infinite;
        }
        `}
      </style>
      
      <style>
        {`
        /* Custom scrollbar styling - transparent by default, grey on hover */
        #dijkstra-visualizer ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #dijkstra-visualizer ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #dijkstra-visualizer ::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        
        #dijkstra-visualizer ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Show scrollbar on hover */
        #dijkstra-visualizer *:hover::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
        }
        
        #dijkstra-visualizer *:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.5);
        }
        
        /* Hide scrollbars in fullscreen mode */
        #dijkstra-visualizer .fullscreen-container::-webkit-scrollbar {
          display: none;
        }
        
        #dijkstra-visualizer .fullscreen-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Additional scrollbar hiding for fullscreen */
        #dijkstra-visualizer .fullscreen-container::-webkit-scrollbar-thumb,
        #dijkstra-visualizer .fullscreen-container::-webkit-scrollbar-track,
        #dijkstra-visualizer .fullscreen-container::-webkit-scrollbar-corner {
          display: none;
        }
        `}
      </style>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg text-blue-800">Dijkstra Visualization</h3>
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
          
          {/* Reset Node Positions Button */}
          <button 
            onClick={resetNodePositions}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Reset Layout
          </button>
          
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
                  className={`border border-gray-200 rounded min-w-[600px] screen-floating ${isFullscreen ? '!border-0' : ''}`}
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
                {currentStepData.queue && currentStepData.queue.length > 0 && (
                  <p className="text-blue-600">
                    Queue: [{currentStepData.queue.join(', ')}]
                  </p>
                )}
                {currentStepData.visited && currentStepData.visited.length > 0 && (
                  <p className="text-blue-400">
                    Visited: [{currentStepData.visited.join(', ')}]
                  </p>
                )}
                {currentStepData.unvisited && currentStepData.unvisited.length > 0 && (
                  <p className="text-gray-500">
                    Unvisited: [{currentStepData.unvisited.join(', ')}]
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
                      {step.queue && step.queue.length > 0 && (
                        <p className="text-blue-600">
                          Queue: [{step.queue.join(', ')}]
                        </p>
                      )}
                      {step.visited && step.visited.length > 0 && (
                        <p className="text-blue-400">
                          Visited: [{step.visited.join(', ')}]
                        </p>
                      )}
                      {step.unvisited && step.unvisited.length > 0 && (
                        <p className="text-gray-500">
                          Unvisited: [{step.unvisited.join(', ')}]
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

// Helper function to render static graph for step list - ENHANCED STYLING (matching DFS/BFS)
const renderStaticGraph = (step) => {
  if (!step.graph) return null;
  
  const nodes = Object.keys(step.graph);
  if (nodes.length === 0) return null;
  
  // We'll arrange nodes in a circular pattern for visualization
  const radius = 120;
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
      {/* Define blue theme gradients (matching DFS/BFS) */}
      <defs>
        <radialGradient id="staticCurrentGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FCD34D" />
        </radialGradient>
        <radialGradient id="staticVisitedGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </radialGradient>
        <filter id="staticBlueGlow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#93C5FD" floodOpacity="0.3"/>
        </filter>
        <filter id="staticYellowGlow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#FEF3C7" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Draw edges with high contrast styling (matching DFS/BFS) */}
      {nodes.map((fromNode) => {
        const neighbors = step.graph[fromNode] || [];
        return neighbors.map((neighborObj) => {
          const toNode = neighborObj.node;
          const weight = neighborObj.weight;
          
          // Avoid duplicate edges
          if (fromNode > toNode) return null;
          
          const pos1 = nodePositions[fromNode];
          const pos2 = nodePositions[toNode];
          
          // Calculate midpoint for weight label
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          // Determine high contrast edge style
          let strokeColor = "black"; // Black base for visibility
          let strokeWidth = 3; // Thick base width
          
          // Traversed edges - Dark blue
          if (step.visited && 
              step.visited.includes(fromNode) && 
              step.visited.includes(toNode)) {
            strokeColor = "#1E40AF"; // Dark blue
            strokeWidth = 5; // Very bold emphasis
          }
          
          return (
            <g key={`${fromNode}-${toNode}`}>
              <line
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <text
                x={midX}
                y={midY - 5}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fontFamily="'Segoe UI', system-ui, sans-serif"
                fill="#6B7280"
              >
                {weight}
              </text>
            </g>
          );
        });
      })}
      
      {/* Draw nodes with enhanced styling (matching DFS/BFS) */}
      {nodes.map((node) => {
        const pos = nodePositions[node];
        const isCurrent = step.currentNode === node;
        const isVisited = step.visited && step.visited.includes(node);
        const isUnvisited = step.unvisited && step.unvisited.includes(node);
        
        // Determine node style - HIGH CONTRAST DESIGN
        let fillColor = "white";
        let strokeColor = "black"; // Black border for maximum contrast
        let textColor = "black"; // Black text for light backgrounds
        let strokeWidth = 3; // Thick border for visibility
        let nodeRadius = 20;
        
        if (isCurrent) {
          fillColor = "url(#staticCurrentGradient)";
          strokeColor = "black"; // Black border
          strokeWidth = 4; // Extra thick border
          nodeRadius = 24;
          textColor = "black"; // Black text on light yellow
        } else if (isVisited) {
          fillColor = "url(#staticVisitedGradient)";
          strokeColor = "black"; // Black border
          strokeWidth = 3; // Thick border
          textColor = "white"; // White text on dark blue
        } else if (isUnvisited) {
          fillColor = "#F9FAFB"; // Very light gray
          strokeColor = "black"; // Black border
          strokeWidth = 3; // Thick border
          textColor = "black"; // Black text
        }
        
        // Get distance for this node
        const distance = step.distances && step.distances[node];
        
        return (
          <g key={node}>
            {/* Blue/Yellow theme glow effects */}
            {isCurrent && (
              <>
                <circle
                  cx={pos.x}
                  cy={pos.y + 2}
                  r={nodeRadius}
                  fill="black"
                  opacity="0.1"
                  filter="url(#staticBlueGlow)"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius + 2}
                  fill="#FEF3C7"
                  opacity="0.2"
                  filter="url(#staticYellowGlow)"
                />
              </>
            )}
            {isVisited && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius - 2}
                fill="white"
                opacity="0.2"
                filter="url(#staticBlueGlow)"
              />
            )}
            
            {/* Node circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={nodeRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ animation: "none" }}
            />
            
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y + 6}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fontFamily="'Segoe UI', system-ui, sans-serif"
              fill={textColor}
            >
              {node}
            </text>
            
            {/* Node distance */}
            {distance !== undefined && (
              <text
                x={pos.x}
                y={pos.y + 20}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fontFamily="'Segoe UI', system-ui, sans-serif"
                fill={textColor}
              >
                {distance === Infinity ? "∞" : distance}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default DijkstraVisualizer;