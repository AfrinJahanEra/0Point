import React, { useState, useEffect } from 'react';

const IOVisualizer = ({ inputType: externalInputType, inputValue: externalInputValue }) => {
  // Use external props if provided, otherwise use internal state
  const [internalInputType, setInternalInputType] = useState('array');
  const [internalInputValue, setInternalInputValue] = useState('');
  
  const inputType = externalInputType !== undefined ? externalInputType : internalInputType;
  const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue;
  
  const setInputType = externalInputType !== undefined ? () => {} : setInternalInputType;
  const setInputValue = externalInputValue !== undefined ? () => {} : setInternalInputValue;
  
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');

  // Parse nested tree format: A(B(C,D),E(F))
  const parseNestedTree = (str) => {
    const nodes = [];
    const edges = [];
    const stack = [];
    
    let i = 0;
    let currentNode = '';
    
    while (i < str.length) {
      const char = str[i];
      
      if (char === '(') {
        if (currentNode) {
          nodes.push(currentNode);
          if (stack.length > 0) {
            edges.push({ from: stack[stack.length - 1], to: currentNode });
          }
          stack.push(currentNode);
          currentNode = '';
        }
        i++;
      } else if (char === ')') {
        if (currentNode) {
          nodes.push(currentNode);
          if (stack.length > 0) {
            edges.push({ from: stack[stack.length - 1], to: currentNode });
          }
          currentNode = '';
        }
        stack.pop();
        i++;
      } else if (char === ',') {
        if (currentNode) {
          nodes.push(currentNode);
          if (stack.length > 0) {
            edges.push({ from: stack[stack.length - 1], to: currentNode });
          }
          currentNode = '';
        }
        i++;
      } else if (char.match(/[a-zA-Z0-9]/)) {
        currentNode += char;
        i++;
      } else {
        i++;
      }
    }
    
    // Add the last node if exists
    if (currentNode) {
      nodes.push(currentNode);
      if (stack.length > 0) {
        edges.push({ from: stack[stack.length - 1], to: currentNode });
      }
    }
    
    // Remove duplicates
    const uniqueNodes = [...new Set(nodes)];
    
    return { nodes: uniqueNodes, edges };
  };

  // Render tree structure with hierarchical layout using SVG like AVL visualizer
  const renderTreeStructure = (data) => {
    if (!data || !data.nodes || data.nodes.length === 0) return null;
    
    // Build a map of parent-child relationships
    const childrenMap = {};
    const parentsMap = {};
    
    // Initialize maps
    data.nodes.forEach(node => {
      childrenMap[node] = [];
    });
    
    // Populate relationships from edges
    data.edges.forEach(edge => {
      if (!childrenMap[edge.from]) childrenMap[edge.from] = [];
      childrenMap[edge.from].push(edge.to);
      parentsMap[edge.to] = edge.from;
    });
    
    // Find root nodes (nodes without parents)
    const rootNodes = data.nodes.filter(node => !parentsMap[node]);
    
    // Calculate positions for nodes in a hierarchical layout with proper spacing
    const nodePositions = {};
    const nodeSize = 48; // Diameter of node circle
    const horizontalSpacing = 200; // Base spacing between nodes
    const verticalSpacing = 120; // Vertical spacing between levels
    
    // Calculate subtree widths to prevent overlapping
    const calculateSubtreeWidth = (node, visited = new Set()) => {
      if (visited.has(node) || !node) return 0;
      visited.add(node);
      
      const children = childrenMap[node] || [];
      if (children.length === 0) {
        return 1; // Leaf node width
      }
      
      // Sum of all children subtree widths
      let totalWidth = 0;
      children.forEach(child => {
        totalWidth += calculateSubtreeWidth(child, new Set(visited));
      });
      
      return Math.max(1, totalWidth); // At least 1 unit wide
    };
    
    // Recursive function to calculate node positions with proper spacing
    const calculatePositions = (node, x, y, level = 0, visited = new Set(), parentX = null) => {
      if (visited.has(node) || !node) return;
      visited.add(node);
      
      nodePositions[node] = { x, y };
      
      const children = childrenMap[node] || [];
      const childCount = children.length;
      
      if (childCount > 0) {
        // Calculate total width needed for children
        let totalChildrenWidth = 0;
        const childWidths = [];
        
        children.forEach(child => {
          const width = calculateSubtreeWidth(child);
          childWidths.push(width);
          totalChildrenWidth += width;
        });
        
        // Position children with proper spacing
        let currentX = x - (totalChildrenWidth - 1) * horizontalSpacing / 2;
        
        children.forEach((child, index) => {
          const childWidth = childWidths[index];
          const childX = currentX + (childWidth - 1) * horizontalSpacing / 2;
          const childY = y + verticalSpacing;
          
          calculatePositions(child, childX, childY, level + 1, visited, x);
          currentX += childWidth * horizontalSpacing;
        });
      }
    };
    
    // Calculate positions starting from root nodes
    rootNodes.forEach((root, index) => {
      const subtreeWidth = calculateSubtreeWidth(root);
      const startX = (index - (rootNodes.length - 1) / 2) * Math.max(subtreeWidth, 3) * horizontalSpacing;
      calculatePositions(root, startX, 60);
    });
    
    // Get bounding box for SVG
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    Object.values(nodePositions).forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });
    
    // Add padding
    const padding = 80;
    const svgWidth = Math.max(600, maxX - minX + padding * 2);
    const svgHeight = Math.max(500, maxY - minY + padding * 2);
    
    // Adjust positions to fit in SVG
    const offsetX = padding - minX;
    const offsetY = padding - minY;
    
    // Create a unique key based on the data content to force re-render when data changes
    const dataKey = JSON.stringify({
      nodes: data.nodes.sort(),
      edges: data.edges.map(e => `${e.from}-${e.to}`).sort()
    });
    
    return (
      <div className="flex justify-center w-full overflow-auto p-4">
        <svg 
          key={dataKey}
          width={svgWidth} 
          height={svgHeight} 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="border border-gray-200 rounded-lg bg-white"
        >
          {/* Render edges */}
          {data.edges.map((edge, index) => {
            const fromPos = nodePositions[edge.from];
            const toPos = nodePositions[edge.to];
            
            if (!fromPos || !toPos) return null;
            
            // Create a unique key based on the edge connection
            const edgeKey = `${edge.from}-${edge.to}`;
            
            return (
              <line
                key={edgeKey}
                x1={fromPos.x + offsetX}
                y1={fromPos.y + offsetY}
                x2={toPos.x + offsetX}
                y2={toPos.y + offsetY}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="transition-all duration-500"
              />
            );
          })}
          
          {/* Render nodes */}
          {data.nodes.map((node, index) => {
            const pos = nodePositions[node];
            if (!pos) return null;
            
            const x = pos.x + offsetX;
            const y = pos.y + offsetY;
            
            return (
              <g key={`node-${node}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={nodeSize / 2}
                  fill="#10B981"
                  stroke="#047857"
                  strokeWidth="2"
                  className="transition-all duration-500 hover:stroke-blue-500"
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold text-sm fill-white select-none pointer-events-none"
                >
                  {node}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Render graph structure with circular layout
  const renderGraphStructure = (data) => {
    if (!data || !data.nodes || data.nodes.length === 0) return null;
    
    const nodeCount = data.nodes.length;
    const centerX = 300;
    const centerY = 200;
    const radius = Math.min(200, Math.max(100, nodeCount * 20));
    
    // Calculate positions in a circular layout
    const nodePositions = {};
    data.nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodeCount;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions[node] = { x, y };
    });
    
    // Create a unique key based on the data content to force re-render when data changes
    const dataKey = JSON.stringify({
      nodes: data.nodes.sort(),
      edges: data.edges.map(e => `${e.from}-${e.to}`).sort()
    });
    
    return (
      <div className="flex justify-center w-full overflow-auto p-4">
        <svg 
          key={dataKey}
          width="600" 
          height="400" 
          viewBox="0 0 600 400"
          className="border border-gray-200 rounded-lg bg-white"
        >
          {/* Render edges */}
          {data.edges.map((edge, index) => {
            const fromPos = nodePositions[edge.from];
            const toPos = nodePositions[edge.to];
            
            if (!fromPos || !toPos) return null;
            
            // Create a unique key based on the edge connection
            const edgeKey = `${edge.from}-${edge.to}`;
            
            return (
              <line
                key={edgeKey}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#9CA3AF"
                strokeWidth="2"
                className="transition-all duration-500"
              />
            );
          })}
          
          {/* Render nodes */}
          {data.nodes.map((node, index) => {
            const pos = nodePositions[node];
            if (!pos) return null;
            
            return (
              <g key={`node-${node}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="24"
                  fill="#10B981"
                  stroke="#047857"
                  strokeWidth="2"
                  className="transition-all duration-500 hover:stroke-blue-500"
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold text-sm fill-white select-none pointer-events-none"
                >
                  {node}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Parse input based on selected type
  const parseInput = (type, value) => {
    setError('');
    
    try {
      switch (type) {
        case 'array':
          if (!value.trim()) {
            return [];
          }
          // Handle both comma-separated and space-separated values
          const array = value.split(/[, ]+/)
            .map(item => item.trim())
            .filter(item => item !== '')
            .map(item => {
              // Try to convert to number, if fails keep as string
              const num = Number(item);
              return isNaN(num) ? item : num;
            });
          return array;
          
        case 'tree':
          if (!value.trim()) {
            return { nodes: [], edges: [] };
          }
          
          // Parse tree structure with parent-child relationships
          // Expected format: "A(B(C,D),E(F))" for nested tree or "A->B,A->C" for edges
          if (value.includes('(') && value.includes(')')) {
            // Nested tree format: A(B(C,D),E)
            return parseNestedTree(value);
          } else if (value.includes('->')) {
            // Edge format: A->B,B->C
            const edges = value.split(',').map(item => {
              const [from, to] = item.split('->').map(s => s.trim());
              return { from, to };
            });
            
            // Extract unique nodes
            const nodes = [...new Set(edges.flatMap(edge => [edge.from, edge.to]))];
            
            return { nodes, edges };
          } else {
            // Simple list format: A,B,C (will create a simple tree)
            const nodeList = value.split(/[, ]+/).map(item => item.trim()).filter(item => item !== '');
            if (nodeList.length === 0) return { nodes: [], edges: [] };
            
            // Create a simple tree structure (first node as root, others as children)
            const nodes = nodeList;
            const edges = [];
            if (nodes.length > 1) {
              for (let i = 1; i < nodes.length; i++) {
                // Connect to previous node (simple linear structure)
                edges.push({ from: nodes[i-1], to: nodes[i] });
              }
            }
            
            return { nodes, edges };
          }
          
        case 'graph':
          if (!value.trim()) {
            return { nodes: [], edges: [] };
          }
          
          // Parse graph with proper node and edge structure
          // Expected format: "A,B,C" for nodes and "A-B:5,B-C:3" for weighted edges
          // Or "A->B:5,B->C:3" for directed weighted edges
          
          // Split by commas to get individual items
          const items = value.split(',').map(item => item.trim()).filter(item => item !== '');
          
          // Separate nodes and edges
          const nodeItems = items.filter(item => !item.includes('->') && !item.includes('-'));
          const edgeItems = items.filter(item => item.includes('->') || item.includes('-'));
          
          // Process edges
          const graphEdges = edgeItems.map(item => {
            // Check if it's directed (->) or undirected (-)
            let from, to, weightStr;
            if (item.includes('->')) {
              [from, to] = item.split('->');
            } else {
              [from, to] = item.split('-');
            }
            
            from = from.trim();
            
            // Check for weight
            if (to.includes(':')) {
              [to, weightStr] = to.split(':');
              to = to.trim();
            }
            
            const weight = weightStr ? parseFloat(weightStr.trim()) : 1;
            
            return { 
              from, 
              to: to.trim(), 
              weight: isNaN(weight) ? 1 : weight,
              directed: item.includes('->')
            };
          });
          
          // Extract all unique nodes from edges and explicit node list
          const edgeNodes = [...new Set([
            ...graphEdges.flatMap(edge => [edge.from, edge.to]),
            ...nodeItems
          ])];
          
          return { nodes: edgeNodes, edges: graphEdges };
          
        default:
          return value;
      }
    } catch (err) {
      setError('Invalid input format: ' + err.message);
      return null;
    }
  };

  // Update parsed data when input changes
  useEffect(() => {
    // Initialize with empty data for each type
    if (inputValue === undefined || inputValue === '') {
      switch (inputType) {
        case 'array':
          setParsedData([]);
          break;
        case 'tree':
        case 'graph':
          setParsedData({ nodes: [], edges: [] });
          break;
        default:
          setParsedData(undefined);
      }
    } else {
      const data = parseInput(inputType, inputValue);
      setParsedData(data);
    }
  }, [inputType, inputValue]);

  // Render visualization based on input type
  const renderVisualization = () => {
    if (error) {
      return (
        <div className="text-red-500 p-4 bg-red-50 rounded-lg">
          Error: {error}
        </div>
      );
    }

    if (parsedData === null || parsedData === undefined) {
      return (
        <div className="text-gray-500 italic">
          Enter data to visualize...
        </div>
      );
    }

    switch (inputType) {
      case 'array':
        return (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">Array Visualization</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.isArray(parsedData) && parsedData.map((item, index) => (
                <div 
                  key={index} 
                  className="w-16 h-16 flex items-center justify-center bg-blue-100 border-2 border-blue-300 rounded-lg shadow"
                >
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Length: {Array.isArray(parsedData) ? parsedData.length : 0} elements
            </div>
          </div>
        );
        
      case 'tree':
        return (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">Tree Visualization</h3>
            {parsedData && parsedData.nodes && parsedData.nodes.length > 0 ? (
              <div className="flex flex-col items-center w-full">
                {renderTreeStructure(parsedData)}
                <div className="mt-4 text-sm text-gray-600">
                  Nodes: {parsedData.nodes.length}, Edges: {parsedData.edges ? parsedData.edges.length : 0}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No nodes to display</div>
            )}
          </div>
        );
        
      case 'graph':
        return (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">Graph Visualization</h3>
            {parsedData && parsedData.nodes && parsedData.nodes.length > 0 ? (
              <div className="flex flex-col items-center w-full">
                {renderGraphStructure(parsedData)}
                <div className="mt-4 text-sm text-gray-600">
                  Nodes: {parsedData.nodes.length}, Edges: {parsedData.edges ? parsedData.edges.length : 0}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No nodes to display</div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="whitespace-pre-wrap bg-gray-100 p-4 rounded-lg">
            {JSON.stringify(parsedData, null, 2)}
          </div>
        );
    }
  };

  // If external props are provided, only render the visualization (used in split-view)
  if (externalInputType !== undefined || externalInputValue !== undefined) {
    return (
      <div className="flex flex-col h-full">
        <style>
          {`
          /* Custom scrollbar styling - ash color and transparent */
          #io-visualizer-external ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          
          #io-visualizer-external ::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 6px;
          }
          
          #io-visualizer-external ::-webkit-scrollbar-thumb {
            background: #9ca3af; /* ash color */
            border-radius: 6px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          
          #io-visualizer-external ::-webkit-scrollbar-thumb:hover {
            background: #6b7280; /* darker ash color on hover */
            border: 2px solid transparent;
            background-clip: content-box;
          }
          
          #io-visualizer-external ::-webkit-scrollbar-corner {
            background: transparent;
          }
          `}
        </style>
        <div id="io-visualizer-external" className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex-grow">
          <h2 className="text-xl font-bold text-blue-800 mb-4">I/O Visualization</h2>
          <div className="flex-grow p-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Visualization Output</h3>
            <div className="flex items-center justify-center h-full min-h-[300px] overflow-auto">
              {renderVisualization()}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise render the full component with input controls (standalone mode)
  return (
    <div className="flex flex-col h-full">
      <style>
        {`
        /* Custom scrollbar styling - ash color and transparent */
        #io-visualizer ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        
        #io-visualizer ::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 6px;
        }
        
        #io-visualizer ::-webkit-scrollbar-thumb {
          background: #9ca3af; /* ash color */
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        #io-visualizer ::-webkit-scrollbar-thumb:hover {
          background: #6b7280; /* darker ash color on hover */
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        #io-visualizer ::-webkit-scrollbar-corner {
          background: transparent;
        }
        `}
      </style>
      <div id="io-visualizer" className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex-grow">
        <h2 className="text-xl font-bold text-blue-800 mb-4">I/O Visualizer</h2>
        
        <div className="flex flex-col h-full lg:flex-row gap-6">
          {/* Left Column - Input Section */}
          <div className="flex flex-col w-full lg:w-1/2">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                className="mb-4 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="array">Array/List</option>
                <option value="tree">Tree</option>
                <option value="graph">Graph</option>
              </select>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Data
              </label>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  inputType === 'array' 
                    ? 'Enter values separated by commas or spaces (e.g., 1,2,3,4,5 or 1 2 3 4 5)'
                    : inputType === 'tree'
                    ? 'Nested: A(B(C,D),E) or Edges: A->B,B->C'
                    : 'Undirected: A,B,C,A-B:5,B-C:3 or Directed: A->B:5,B->C:3'
                }
                className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="4"
              />
              
              <div className="mt-2 text-xs text-gray-500">
                {inputType === 'array' && 'Supports numbers and strings'}
                {inputType === 'tree' && 'Hierarchical tree structure with parent-child relationships'}
                {inputType === 'graph' && 'Format: node1,node2,edge1-edge2:weight'}
              </div>
            </div>
            
            {/* Examples Section */}
            <div className="bg-gray-50 p-4 rounded-lg flex-grow">
              <h3 className="font-medium text-gray-800 mb-3">Examples</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Array Example:</div>
                  <div 
                    className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (externalInputType === undefined) setInternalInputType('array');
                      if (externalInputValue === undefined) setInternalInputValue('5,2,8,1,9,3');
                    }}
                  >
                    5,2,8,1,9,3
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Tree Example:</div>
                  <div 
                    className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (externalInputType === undefined) setInternalInputType('tree');
                      if (externalInputValue === undefined) setInternalInputValue('A(B(D,E),C(F))');
                    }}
                  >
                    A(B(D,E),C(F))
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Or: A{'->'}B,B{'->'}C,C{'->'}D</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Graph Example:</div>
                  <div 
                    className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (externalInputType === undefined) setInternalInputType('graph');
                      if (externalInputValue === undefined) setInternalInputValue('A,B,C,D,A-B:5,B-C:3,C-D:7');
                    }}
                  >
                    A,B,C,D,A-B:5,B-C:3,C-D:7
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Or: A{'->'}B:5,B{'->'}C:3,C{'->'}D:7</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Visualization Section */}
          <div className="flex flex-col w-full lg:w-1/2">
            <div className="flex-grow p-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto h-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Visualization</h3>
              <div className="flex items-center justify-center h-full min-h-[300px]">
                {renderVisualization()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IOVisualizer;