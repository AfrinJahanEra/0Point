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

  // D3.js animation effect - BEAUTIFIED VERSION (matching DFS/BFS/Dijkstra styling)
  useEffect(() => {
    if (!svgRef.current || !steps || steps.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    const stepData = steps[currentStep];
    
    if (!stepData) return;
    
    // Clear previous animations and elements
    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();
    
    // Add defs for gradients (HARMONIOUS PROFESSIONAL styling)
    const defs = svg.append("defs");
    
    // ELEGANT gradient for current nodes with refined palette
    defs.append("radialGradient")
      .attr("id", "elegantCurrentGradient")
      .attr("cx", "25%")
      .attr("cy", "25%")
      .attr("r", "85%")
      .html(`
        <stop offset="0%" stop-color="#F0F9FF" />
        <stop offset="30%" stop-color="#E0F2FE" />
        <stop offset="60%" stop-color="#B3E5FC" />
        <stop offset="85%" stop-color="#81D4FA" />
        <stop offset="100%" stop-color="#4FC3F7" />
      `);
    
    // SOPHISTICATED gradient for visited nodes with muted tones
    defs.append("radialGradient")
      .attr("id", "sophisticatedVisitedGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "65%")
      .html(`
        <stop offset="0%" stop-color="#F8F9FA" />
        <stop offset="40%" stop-color="#E9ECEF" />
        <stop offset="70%" stop-color="#DEE2E6" />
        <stop offset="100%" stop-color="#CED4DA" />
      `);
    
    // SUBTLE glow effects for professional appearance
    defs.append("filter")
      .attr("id", "subtleGlow")
      .html(`
        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#81D4FA" flood-opacity="0.4"/>
        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#B3E5FC" flood-opacity="0.6"/>
      `);
    
    defs.append("filter")
      .attr("id", "refinedAura")
      .html(`
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#DEE2E6" flood-opacity="0.3"/>
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#E9ECEF" flood-opacity="0.5"/>
      `);
    
    // CLEAN gradients for minimal aesthetic
    defs.append("radialGradient")
      .attr("id", "cleanCurrentGradient")
      .attr("cx", "30%")
      .attr("cy", "30%")
      .attr("r", "75%")
      .html(`
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="50%" stop-color="#F8F9FA" />
        <stop offset="100%" stop-color="#E9ECEF" />
      `);
    
    defs.append("radialGradient")
      .attr("id", "cleanVisitedGradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "55%")
      .html(`
        <stop offset="0%" stop-color="#F1F3F4" />
        <stop offset="100%" stop-color="#DEE2E6" />
      `);
    
    // MST edges are now handled in the individual edge drawing section below
    // This removes the duplicate path visualization that was causing static lines
    
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
    
    // Draw edges with beautiful styling (matching DFS/BFS/Dijkstra)
    if (stepData.graph) {
      // Draw all edges first
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
          
          // Beautiful edge styling - SAME AS DIJKSTRA
          let strokeColor = "#4B5563"; // Professional gray
          let strokeWidth = 2.5;
          
          // Check if this edge is part of the final MST (blue thick lines for MST)
          const isMSTEdge = stepData.mst && stepData.mst.some(edge => 
            edge && edge.from && edge.to &&
            ((edge.from === fromNode && edge.to === toNode) || 
             (edge.from === toNode && edge.to === fromNode))
          );
          
          // BLUE THICK LINES FOR MST EDGES - PROMINENT DISPLAY
          if (isMSTEdge) {
            strokeColor = "#3B82F6"; // Rich blue
            strokeWidth = 6; // Very thick for emphasis
          }
          // Dark blue for visited edges (same as Dijkstra)
          else if (stepData.visited && stepData.visited.some(node => 
            (node === fromNode) || (node === toNode))) {
            strokeColor = "#1E40AF"; // Rich dark blue
            strokeWidth = 4.5;
          }
          
          // Blue for current edge being considered (same as Dijkstra)
          const currentEdge = stepData.currentEdge || stepData.addEdge || stepData.skipEdge;
          if (currentEdge && currentEdge.from && currentEdge.to &&
            ((currentEdge.from === fromNode && currentEdge.to === toNode) ||
             (currentEdge.from === toNode && currentEdge.to === fromNode))) {
            strokeColor = "#3B82F6"; // Blue for current edge
            strokeWidth = 3.5;
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
          
          // Draw edge weight with beautiful styling - SAME AS DIJKSTRA
          const midX = (pos1.x + pos2.x) / 2;
          const midY = (pos1.y + pos2.y) / 2;
          
          svg.append("text")
            .attr("x", midX)
            .attr("y", midY - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("font-family", "'Inter', system-ui, sans-serif")
            .attr("fill", isMSTEdge ? "#3B82F6" : strokeColor === "#1E40AF" ? "#1E40AF" : strokeColor === "#3B82F6" ? "#3B82F6" : "#6B7280")
            .text(weight);
        });
      });
    }
    
    // Draw nodes with beautiful styling AND drag functionality (matching DFS/BFS/Dijkstra)
    svg.selectAll(".node").remove();
    svg.selectAll(".node-label").remove();
    
    nodes.forEach(node => {
      const pos = nodePositions[node];
      
      // Beautiful node styling - HARMONIOUS PROFESSIONAL VERSION
      let fillColor = "white";
      let strokeColor = "#6B7280";
      let textColor = "#1F2937";
      let strokeWidth = 2;
      let nodeRadius = 24;
      
      // Current node (processing node in Kruskal) - REFINED ELEGANCE
      if (stepData.currentNode === node) {
        fillColor = "url(#elegantCurrentGradient)"; // Use elegant gradient
        strokeColor = "#495057"; // Professional dark gray border
        strokeWidth = 5; // Premium thick border
        nodeRadius = 32; // Largest size for emphasis
        textColor = "#212529"; // Deep charcoal text
        
        // Layered professional glow effects
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 8)
          .attr("fill", "#81D4FA")
          .attr("opacity", 0.3)
          .style("filter", "blur(8px)");
        
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 5)
          .attr("fill", "#B3E5FC")
          .attr("opacity", 0.25)
          .style("filter", "blur(5px)");
        
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 3)
          .attr("fill", "#E0F2FE")
          .attr("opacity", 0.2)
          .style("filter", "blur(2px)");
      } 
      // Visited nodes - SOPHISTICATED NEUTRAL GRADIENT
      else if (stepData.visited && stepData.visited.includes(node)) {
        fillColor = "url(#sophisticatedVisitedGradient)"; // Use sophisticated neutral gradient
        strokeColor = "#6C757D"; // Muted gray border
        strokeWidth = 4; // Elegant medium border
        textColor = "#212529"; // Dark text for contrast
        nodeRadius = 28; // Prominent size
        
        // Sophisticated neutral aura
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 4)
          .attr("fill", "#DEE2E6")
          .attr("opacity", 0.2)
          .style("filter", "url(#refinedAura)");
        
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius + 2)
          .attr("fill", "#E9ECEF")
          .attr("opacity", 0.15)
          .style("filter", "blur(3px)");
        
        // Elegant inner highlight
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y)
          .attr("r", nodeRadius - 3)
          .attr("fill", "white")
          .attr("opacity", 0.3);
      }
      // Unvisited nodes - CLEAN MINIMALIST
      else if (stepData.unvisited && stepData.unvisited.includes(node)) {
        fillColor = "#F8F9FA"; // Clean light gray
        strokeColor = "#DEE2E6"; // Subtle border
        strokeWidth = 2.5;
        textColor = "#495057"; // Medium gray text
        nodeRadius = 22; // Standard refined size
        
        // Minimal shadow for depth
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y + 2)
          .attr("r", nodeRadius)
          .attr("fill", "black")
          .attr("opacity", 0.05)
          .style("filter", "blur(2px)");
        
        // Subtle highlight
        svg.append("circle")
          .attr("cx", pos.x)
          .attr("cy", pos.y - 1)
          .attr("r", nodeRadius - 8)
          .attr("fill", "white")
          .attr("opacity", 0.4);
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
            
            // Update the node label position
            svg.selectAll("text").each(function() {
              const text = d3.select(this);
              const x = parseFloat(text.attr("x"));
              const y = parseFloat(text.attr("y"));
              
              // Check if this text belongs to the dragged node
              if (Math.abs(x - pos.x) < 1) {
                text.attr("x", newX).attr("y", newY + 6);
              }
            });
            
            // Update connected edges
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
      
      // Draw node label with beautiful typography (matching other algorithms)
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

  // Function to download all steps as PDF with beautiful visual representations - SAME AS DIJKSTRA
  const downloadStepsAsPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title with beautiful styling - SAME AS DIJKSTRA
    doc.setFontSize(24);
    doc.setTextColor(26, 86, 150); // Dark blue
    doc.text('Kruskal Visualization Steps', 148.5, 15, null, null, 'center');
    
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99); // Gray subtitle
    doc.text('Step-by-step minimum spanning tree algorithm', 148.5, 25, null, null, 'center');
    
    // Add steps with beautiful visual representations - SAME AS DIJKSTRA
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
      
      // Add step information - SAME AS DIJKSTRA styling
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
    doc.save('kruskal-visualization-steps.pdf');
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
          edge && edge.from && edge.to &&
          ((edge.from === node && edge.to === neighbor) || 
           (edge.from === neighbor && edge.to === node))
        );
        
        // Check if this is the current edge being considered
        const currentEdge = stepData && (stepData.currentEdge || stepData.addEdge || stepData.skipEdge);
        const isCurrentEdge = currentEdge && currentEdge.from && currentEdge.to &&
          ((currentEdge.from === node && currentEdge.to === neighbor) ||
           (currentEdge.from === neighbor && currentEdge.to === node));
        
        // Draw edge - BLUE THICK LINES FOR MST
        if (isInMST) {
          doc.setDrawColor(59, 130, 246); // BLUE for MST edges
          doc.setLineWidth(1.5 * optimalScale); // VERY thick for MST
        } else if (isCurrentEdge) {
          doc.setDrawColor(59, 130, 246); // blue for current edge
          doc.setLineWidth(0.8 * optimalScale); // Slightly thicker for current edge
        } else {
          doc.setDrawColor(156, 163, 175); // gray-400
          doc.setLineWidth(0.5 * optimalScale);
        }
        doc.line(x1, y1, x2, y2);
        
        // Draw edge weight
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        doc.setFontSize(6 * optimalScale);
        if (isInMST) {
          doc.setTextColor(59, 130, 246); // BLUE for MST edges
        } else if (isCurrentEdge) {
          doc.setTextColor(59, 130, 246); // blue for current edge
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

  // Function to calculate total MST weight
  const calculateMSTTotalWeight = (mstEdges) => {
    if (!mstEdges || mstEdges.length === 0) return 0;
    return mstEdges.reduce((total, edge) => total + (edge.weight || 0), 0);
  };

  // Function to get operation description
  const getOperationDescription = (stepData) => {
    if (!stepData) return 'Processing...';
    
    const operation = stepData.operation;
    
    if (operation === 'start') {
      return 'Starting Kruskal algorithm';
    } else if (operation === 'consider_edge') {
      if (!stepData.currentEdge) return 'Processing...';
      return `Considering edge from ${stepData.currentEdge.from} to ${stepData.currentEdge.to} with weight ${stepData.currentEdge.weight}`;
    } else if (operation === 'add_edge') {
      if (!stepData.addEdge) return 'Processing...';
      return `Adding edge from ${stepData.addEdge.from} to ${stepData.addEdge.to} to MST`;
    } else if (operation === 'skip_edge') {
      if (!stepData.skipEdge) return 'Processing...';
      return `Skipping edge from ${stepData.skipEdge.from} to ${stepData.skipEdge.to} (would create cycle)`;
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

  // Reset node positions to original layout
  const resetNodePositions = () => {
    setDraggedNodes({});
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
        
        /* Premium pulse animation for MST path */
        @keyframes pulse {
          0% {
            stroke-opacity: 0.7;
            stroke-width: 2;
          }
          50% {
            stroke-opacity: 1;
            stroke-width: 3;
          }
          100% {
            stroke-opacity: 0.7;
            stroke-width: 2;
          }
        }
        
        /* Elegant floating animation */
        @keyframes elegant-float {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-8px) rotate(1deg);
          }
          50% {
            transform: translateY(0px) rotate(0deg);
          }
          75% {
            transform: translateY(-4px) rotate(-1deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        
        .elegant-floating {
          animation: elegant-float 6s ease-in-out infinite;
        }
        
        /* Sophisticated shimmer effect */
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        .shimmer-effect {
          background: linear-gradient(90deg, 
            rgba(225, 235, 245, 0.1) 0%,
            rgba(206, 212, 218, 0.3) 50%,
            rgba(225, 235, 245, 0.1) 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
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
                  className={`border border-gray-200 rounded min-w-[600px] ${isFullscreen ? '!border-0' : ''}`}
                  style={{ backgroundColor: 'white' }}
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
              <div className="mt-2 text-xs space-y-1">
                {currentStepData.mst && currentStepData.mst.length > 0 && (
                  <>
                    <p className="text-blue-600 font-medium">
                      MST Edges: {currentStepData.mst.length}
                    </p>
                    <p className="text-blue-800 font-semibold">
                      Total MST Weight: {calculateMSTTotalWeight(currentStepData.mst)}
                    </p>
                    <div className="mt-1">
                      <p className="text-gray-700 text-xs">MST Path:</p>
                      <p className="text-blue-700 font-mono text-xs">
                        {currentStepData.mst.map((edge, idx) => 
                          `${edge.from}-${edge.to}(${edge.weight})`
                        ).join(' → ')}
                      </p>
                    </div>
                  </>
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
                    
                    <div className="mt-2 text-xs space-y-1">
                      {step.mst && step.mst.length > 0 && (
                        <>
                          <p className="text-blue-600 font-medium">
                            MST Edges: {step.mst.length}
                          </p>
                          <p className="text-blue-800 font-semibold">
                            Total MST Weight: {calculateMSTTotalWeight(step.mst)}
                          </p>
                          <div className="mt-1">
                            <p className="text-gray-700 text-xs">MST Path:</p>
                            <p className="text-blue-700 font-mono text-xs">
                              {step.mst.map((edge, idx) => 
                                `${edge.from}-${edge.to}(${edge.weight})`
                              ).join(' → ')}
                            </p>
                          </div>
                        </>
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

// Helper function to render static graph for step list - SAME AS DIJKSTRA
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
      {/* Define blue theme gradients - SAME AS DIJKSTRA */}
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
      
      {/* Draw edges with high contrast styling - SAME AS DIJKSTRA */}
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
          
          // Determine high contrast edge style - SAME AS DIJKSTRA
          let strokeColor = "black"; // Black base for visibility
          let strokeWidth = 3; // Thick base width
          
          // Check if this edge is part of the final MST (blue and thickest)
          const isMSTEdge = step.mst && step.mst.some(edge => 
            edge && edge.from && edge.to &&
            ((edge.from === fromNode && edge.to === toNode) || 
             (edge.from === toNode && edge.to === fromNode))
          );
          
          // BLUE AND THICKEST FOR MST EDGES
          if (isMSTEdge) {
            strokeColor = "#3B82F6"; // Rich blue
            strokeWidth = 7; // Maximum thickness
          }
          // Dark blue for visited edges
          else if (step.visited && 
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
      
      {/* Draw nodes with enhanced styling - SAME AS DIJKSTRA */}
      {nodes.map((node) => {
        const pos = nodePositions[node];
        const isCurrent = step.currentNode === node;
        const isVisited = step.visited && step.visited.includes(node);
        const isUnvisited = step.unvisited && step.unvisited.includes(node);
        
        // Determine node style - HIGH CONTRAST DESIGN - SAME AS DIJKSTRA
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
        
        return (
          <g key={node}>
            {/* Blue/Yellow theme glow effects - SAME AS DIJKSTRA */}
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
            
            {/* Node circle - SAME AS DIJKSTRA */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={nodeRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ animation: "none" }}
            />
            
            {/* Node label - SAME AS DIJKSTRA */}
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
          </g>
        );
      })}
    </g>
  );
};

export default KruskalVisualizer;