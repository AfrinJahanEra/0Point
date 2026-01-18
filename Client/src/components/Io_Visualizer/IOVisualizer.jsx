import React, { useState, useEffect, useRef } from 'react';

const IOVisualizer = ({ inputType: externalInputType, inputValue: externalInputValue }) => {
  // Use external props if provided, otherwise use internal state
  const [internalInputType, setInternalInputType] = useState('array');
  const [internalInputValue, setInternalInputValue] = useState('');
  const [visualizationMode, setVisualizationMode] = useState('default');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDetails, setNodeDetails] = useState(null);
  const [stackData, setStackData] = useState([]);
  const [queueData, setQueueData] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Ref to track programmatic input updates
  const isProgrammaticUpdate = useRef(false);
  
  const inputType = externalInputType !== undefined ? externalInputType : internalInputType;
  const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue;
  
  const setInputType = externalInputType !== undefined ? () => {} : setInternalInputType;
  const setInputValue = externalInputValue !== undefined ? () => {} : setInternalInputValue;
  
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState({});
  
  // Function to add element to stack or queue with animation trigger
  const handleAddElement = (value) => {
    if (!value.trim()) return;
    
    // Parse the value
    let parsedValue;
    if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    } else if (value.toLowerCase() === 'null') {
      parsedValue = null;
    } else {
      // Try to parse as number
      const num = Number(value);
      parsedValue = isNaN(num) ? value : num;
    }
    
    if (inputType === 'stack') {
      // Push to stack (add to beginning for proper stack behavior)
      const newData = [parsedValue, ...stackData];
      setStackData(newData);
      
      // Update input value
      const newInputValue = newData.map(item => {
        if (item === null) return 'null';
        if (typeof item === 'string') return `"${item}"`;
        if (typeof item === 'boolean') return String(item);
        return String(item);
      }).join(', ');
      
      if (externalInputValue === undefined) {
        isProgrammaticUpdate.current = true;
        setInternalInputValue(newInputValue);
      }
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000 / animationSpeed);
    } else if (inputType === 'queue') {
      // Enqueue to queue (add to end)
      const newData = [...queueData, parsedValue];
      setQueueData(newData);
      
      // Update input value
      const newInputValue = newData.map(item => {
        if (item === null) return 'null';
        if (typeof item === 'string') return `"${item}"`;
        if (typeof item === 'boolean') return String(item);
        return String(item);
      }).join(', ');
      
      if (externalInputValue === undefined) {
        isProgrammaticUpdate.current = true;
        setInternalInputValue(newInputValue);
      }
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000 / animationSpeed);
    }
  };
  
  // Function to remove element from stack (pop)
  const handlePopElement = () => {
    if (inputType === 'stack' && stackData.length > 0) {
      // Remove the first element (top of stack)
      const newData = stackData.slice(1);
      setStackData(newData);
      
      // Update input value
      const newInputValue = newData.map(item => {
        if (item === null) return 'null';
        if (typeof item === 'string') return `"${item}"`;
        if (typeof item === 'boolean') return String(item);
        return String(item);
      }).join(', ');
      
      if (externalInputValue === undefined) {
        isProgrammaticUpdate.current = true;
        setInternalInputValue(newInputValue);
      }
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000 / animationSpeed);
    }
  };
  
  // Function to remove element from queue (dequeue)
  const handleDequeueElement = () => {
    if (inputType === 'queue' && queueData.length > 0) {
      // Remove the first element (front of queue)
      const newData = queueData.slice(1);
      setQueueData(newData);
      
      // Update input value
      const newInputValue = newData.map(item => {
        if (item === null) return 'null';
        if (typeof item === 'string') return `"${item}"`;
        if (typeof item === 'boolean') return String(item);
        return String(item);
      }).join(', ');
      
      if (externalInputValue === undefined) {
        isProgrammaticUpdate.current = true;
        setInternalInputValue(newInputValue);
      }
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000 / animationSpeed);
    }
  };
  
  const animationRef = useRef(null);
  const svgRef = useRef(null);

  // Enhanced parse functions with better error handling
  const parseArray = (str) => {
    try {
      if (!str.trim()) return [];
      
      // Try to parse as JSON first
      if (str.trim().startsWith('[') && str.trim().endsWith(']')) {
        try {
          return JSON.parse(str);
        } catch (e) {
          // Continue with other parsing methods
        }
      }
      
      // Parse comma/space separated values
      const items = str.split(/[,;\s]+/).filter(item => item.trim() !== '');
      
      return items.map(item => {
        const trimmed = item.trim();
        
        // Try to parse as number
        const num = Number(trimmed);
        if (!isNaN(num) && trimmed !== '') {
          return num;
        }
        
        // Try to parse as boolean
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        
        // Try to parse as null
        if (trimmed.toLowerCase() === 'null') return null;
        
        // Return as string
        return trimmed;
      });
    } catch (err) {
      throw new Error(`Array parsing error: ${err.message}`);
    }
  };

  // Parse stack (same as array)
  const parseStack = parseArray;

  // Parse queue (same as array)
  const parseQueue = parseArray;

  // Parse linked list
  const parseLinkedList = (str) => {
    try {
      if (!str.trim()) return [];
      
      // Try to parse as JSON first
      if (str.trim().startsWith('[') && str.trim().endsWith(']')) {
        try {
          return JSON.parse(str);
        } catch (e) {
          // Continue with other parsing methods
        }
      }
      
      // Parse comma/space separated values
      const items = str.split(/[,;\s]+/).filter(item => item.trim() !== '');
      
      return items.map(item => {
        const trimmed = item.trim();
        
        // Try to parse as number
        const num = Number(trimmed);
        if (!isNaN(num) && trimmed !== '') {
          return num;
        }
        
        // Try to parse as boolean
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        
        // Try to parse as null
        if (trimmed.toLowerCase() === 'null') return null;
        
        // Return as string
        return trimmed;
      });
    } catch (err) {
      throw new Error(`Linked list parsing error: ${err.message}`);
    }
  };

  // Enhanced tree parsing with support for multiple formats
  const parseTree = (str) => {
    try {
      if (!str.trim()) return { nodes: [], edges: [], weights: {} };
      
      str = str.trim();
      
      // Format 1: JSON format with explicit structure
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          const data = JSON.parse(str);
          return {
            nodes: data.nodes || [],
            edges: data.edges || [],
            weights: data.weights || {},
            root: data.root || null
          };
        } catch (e) {
          // Not valid JSON, continue with other formats
        }
      }
      
      // Format 2: Nested parentheses format
      if (str.includes('(') && str.includes(')')) {
        const nodes = new Map();
        const edges = [];
        const weights = {};
        let nodeId = 0;
        
        const parseSubtree = (str, parent = null, level = 0) => {
          let current = '';
          const children = [];
          let i = 0;
          
          while (i < str.length) {
            const char = str[i];
            
            if (char === '(') {
              if (current.trim()) {
                const node = current.trim();
                if (!nodes.has(node)) {
                  nodes.set(node, { id: nodeId++, label: node, level });
                }
                if (parent !== null) {
                  edges.push({ from: parent, to: node });
                }
                
                // Find matching closing parenthesis
                let depth = 1;
                let j = i + 1;
                while (j < str.length && depth > 0) {
                  if (str[j] === '(') depth++;
                  if (str[j] === ')') depth--;
                  j++;
                }
                
                const subtree = str.substring(i + 1, j - 1);
                parseSubtree(subtree, node, level + 1);
                i = j;
              }
            } else if (char === ',') {
              if (current.trim()) {
                const node = current.trim();
                if (!nodes.has(node)) {
                  nodes.set(node, { id: nodeId++, label: node, level });
                }
                if (parent !== null) {
                  edges.push({ from: parent, to: node });
                }
                current = '';
              }
              i++;
            } else if (char === ')') {
              break;
            } else {
              current += char;
              i++;
            }
          }
          
          // Handle last node
          if (current.trim()) {
            const node = current.trim();
            if (!nodes.has(node)) {
              nodes.set(node, { id: nodeId++, label: node, level });
            }
            if (parent !== null) {
              edges.push({ from: parent, to: node });
            }
          }
        };
        
        parseSubtree(str);
        
        return {
          nodes: Array.from(nodes.values()),
          edges,
          weights,
          root: Array.from(nodes.values())[0]?.label || null
        };
      }
      
      // Format 3: Edge list format
      if (str.includes('->') || str.includes('-')) {
        const nodes = new Map();
        const edges = [];
        const weights = {};
        let nodeId = 0;
        
        const items = str.split(',').map(s => s.trim()).filter(s => s);
        
        items.forEach(item => {
          if (item.includes('->')) {
            // Directed edge
            const [from, rest] = item.split('->');
            let to = rest;
            let weight = 1;
            
            if (rest.includes(':')) {
              const [toPart, weightPart] = rest.split(':');
              to = toPart;
              weight = parseFloat(weightPart) || 1;
            }
            
            const fromNode = from.trim();
            const toNode = to.trim();
            
            if (!nodes.has(fromNode)) {
              nodes.set(fromNode, { id: nodeId++, label: fromNode });
            }
            if (!nodes.has(toNode)) {
              nodes.set(toNode, { id: nodeId++, label: toNode });
            }
            
            edges.push({ from: fromNode, to: toNode, directed: true });
            weights[`${fromNode}-${toNode}`] = weight;
          } else if (item.includes('-')) {
            // Undirected edge
            const [node1, rest] = item.split('-');
            let node2 = rest;
            let weight = 1;
            
            if (rest.includes(':')) {
              const [node2Part, weightPart] = rest.split(':');
              node2 = node2Part;
              weight = parseFloat(weightPart) || 1;
            }
            
            const node1Trim = node1.trim();
            const node2Trim = node2.trim();
            
            if (!nodes.has(node1Trim)) {
              nodes.set(node1Trim, { id: nodeId++, label: node1Trim });
            }
            if (!nodes.has(node2Trim)) {
              nodes.set(node2Trim, { id: nodeId++, label: node2Trim });
            }
            
            edges.push({ from: node1Trim, to: node2Trim, directed: false });
            weights[`${node1Trim}-${node2Trim}`] = weight;
          } else {
            // Single node
            const node = item.trim();
            if (!nodes.has(node)) {
              nodes.set(node, { id: nodeId++, label: node });
            }
          }
        });
        
        return {
          nodes: Array.from(nodes.values()),
          edges,
          weights,
          root: Array.from(nodes.values())[0]?.label || null
        };
      }
      
      // Format 4: Simple list (treat as linear tree)
      const simpleNodes = str.split(/[,;\s]+/).filter(s => s.trim());
      const nodes = simpleNodes.map((label, index) => ({
        id: index,
        label,
        level: 0
      }));
      
      const edges = [];
      for (let i = 0; i < simpleNodes.length - 1; i++) {
        edges.push({ from: simpleNodes[i], to: simpleNodes[i + 1] });
      }
      
      return {
        nodes,
        edges,
        weights: {},
        root: simpleNodes[0] || null
      };
      
    } catch (err) {
      throw new Error(`Tree parsing error: ${err.message}`);
    }
  };

  // Enhanced graph parsing
  const parseGraph = (str) => {
    try {
      if (!str.trim()) return { nodes: [], edges: [], weights: {}, adjacency: {} };
      
      str = str.trim();
      
      // JSON format
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          return JSON.parse(str);
        } catch (e) {
          // Not valid JSON, continue
        }
      }
      
      return parseTree(str); // Reuse tree parser for now
      
    } catch (err) {
      throw new Error(`Graph parsing error: ${err.message}`);
    }
  };

  // Calculate metadata for visualization
  const calculateMetadata = (data, type) => {
    const meta = {
      type,
      timestamp: new Date().toISOString(),
      summary: ''
    };
    
    switch (type) {
      case 'array':
      case 'stack':
      case 'queue':
      case 'linked-list':
        meta.count = data.length;
        meta.min = Math.min(...data.filter(n => typeof n === 'number'));
        meta.max = Math.max(...data.filter(n => typeof n === 'number'));
        meta.sum = data.filter(n => typeof n === 'number').reduce((a, b) => a + b, 0);
        meta.average = meta.count > 0 ? meta.sum / data.filter(n => typeof n === 'number').length : 0;
        meta.hasStrings = data.some(item => typeof item === 'string');
        meta.hasNumbers = data.some(item => typeof item === 'number');
        meta.hasBooleans = data.some(item => typeof item === 'boolean');
        meta.hasNulls = data.some(item => item === null);
        
        // Set appropriate summary based on type
        if (type === 'stack') {
          meta.summary = `Stack with ${meta.count} elements`;
        } else if (type === 'queue') {
          meta.summary = `Queue with ${meta.count} elements`;
        } else if (type === 'linked-list') {
          meta.summary = `Linked List with ${meta.count} elements`;
        } else {
          meta.summary = `Array with ${meta.count} elements`;
        }
        break;
        
      case 'tree':
      case 'graph':
        meta.nodeCount = data.nodes.length;
        meta.edgeCount = data.edges.length;
        meta.directedEdges = data.edges.filter(e => e.directed).length;
        meta.undirectedEdges = data.edges.filter(e => !e.directed).length;
        meta.leafNodes = data.nodes.filter(n => 
          data.edges.filter(e => e.from === n.label || e.to === n.label).length <= 1
        ).length;
        meta.root = data.root;
        
        // Calculate degree for each node
        const degrees = {};
        data.nodes.forEach(node => {
          degrees[node.label] = 0;
        });
        
        data.edges.forEach(edge => {
          degrees[edge.from]++;
          degrees[edge.to]++;
        });
        
        meta.maxDegree = Math.max(...Object.values(degrees));
        meta.minDegree = Math.min(...Object.values(degrees));
        meta.summary = `${type.charAt(0).toUpperCase() + type.slice(1)} with ${meta.nodeCount} nodes and ${meta.edgeCount} edges`;
        break;
    }
    
    return meta;
  };

  // Parse input based on selected type
  const parseInput = (type, value) => {
    setError('');
    setSelectedNode(null);
    setNodeDetails(null);
    
    try {
      let data;
      
      switch (type) {
        case 'array':
          data = parseArray(value);
          break;
          
        case 'stack':
          data = parseStack(value);
          break;
          
        case 'queue':
          data = parseQueue(value);
          break;
          
        case 'linked-list':
          data = parseLinkedList(value);
          break;
          
        case 'tree':
          data = parseTree(value);
          break;
          
        case 'graph':
          data = parseGraph(value);
          break;
          
        default:
          data = value;
      }
      
      // Calculate metadata
      const meta = calculateMetadata(data, type);
      setMetadata(meta);
      
      return data;
      
    } catch (err) {
      setError(`Invalid ${type} format: ${err.message}`);
      return null;
    }
  };

  // Reset stack and queue data when input type changes
  useEffect(() => {
    setStackData([]);
    setQueueData([]);
  }, [inputType]);
  
  // Update parsed data when input changes
  useEffect(() => {
    // Skip parsing if this is a programmatic update
    if (isProgrammaticUpdate.current) {
      isProgrammaticUpdate.current = false;
      return;
    }
    
    if (inputValue === undefined || inputValue === '') {
      // For array-like structures, use empty array; for tree/graph, use empty object
      const isArrayLike = ['array', 'stack', 'queue', 'linked-list'].includes(inputType);
      const emptyData = isArrayLike ? [] : { nodes: [], edges: [] };
      setParsedData(emptyData);
      setMetadata(calculateMetadata(emptyData, inputType));
      
      // Initialize stack and queue data only when input type changes
      if (inputType === 'stack') {
        setStackData([]);
      } else if (inputType === 'queue') {
        setQueueData([]);
      }
    } else {
      const data = parseInput(inputType, inputValue);
      setParsedData(data);
      
      // Update stack and queue data only if not manually modified
      // Check if the parsed data differs from current stack/queue data to avoid overriding manual operations
      if (inputType === 'stack') {
        // Convert both arrays to strings for comparison
        const currentStackStr = JSON.stringify(stackData);
        const parsedStackStr = JSON.stringify(data);
        
        // Only update if they're different (meaning user typed in the input field)
        if (currentStackStr !== parsedStackStr) {
          setStackData(data);
        }
      } else if (inputType === 'queue') {
        // Convert both arrays to strings for comparison
        const currentQueueStr = JSON.stringify(queueData);
        const parsedQueueStr = JSON.stringify(data);
        
        // Only update if they're different (meaning user typed in the input field)
        if (currentQueueStr !== parsedQueueStr) {
          setQueueData(data);
        }
      }
    }
  }, [inputType, inputValue, stackData, queueData, isProgrammaticUpdate]);

  // Enhanced array visualization with unique animations
  const renderArrayVisualization = () => {
    if (!Array.isArray(parsedData)) return null;
    
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {parsedData.map((item, index) => (
            <div 
              key={index}
              className={`
                w-20 h-20 flex flex-col items-center justify-center 
                border-2 rounded-xl transition-all duration-300
                ${selectedNode === index ? 'ring-4 ring-blue-500 scale-110 shadow-lg' : 'shadow-md'}
                bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100
                border-gray-300 hover:border-blue-400
                ${isAnimating ? 'animate-puddingWave' : ''}
              `}
              style={{
                animationDelay: isAnimating ? `${index * 0.1}s` : '0s'
              }}
              onClick={() => {
                setSelectedNode(index);
                setNodeDetails({
                  index,
                  value: item,
                  type: typeof item,
                  isEven: index % 2 === 0,
                  isFirst: index === 0,
                  isLast: index === parsedData.length - 1
                });
              }}
            >
              <span className="font-bold text-lg text-gray-800">
                {item === null ? 'null' : String(item)}
              </span>
              <span className="text-xs text-gray-500 mt-1 font-medium">[{index}]</span>
            </div>
          ))}
        </div>
        
        {/* Array stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Length</div>
            <div className="text-xl font-bold text-blue-800">{parsedData.length}</div>
          </div>
          
          {metadata.hasNumbers && (
            <>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Sum</div>
                <div className="text-xl font-bold text-blue-800">{metadata.sum}</div>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Avg</div>
                <div className="text-xl font-bold text-blue-800">{metadata.average.toFixed(2)}</div>
              </div>
            </>
          )}
          
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Types</div>
            <div className="text-xs text-gray-700 font-medium">
              {metadata.hasNumbers && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-1">N</span>}
              {metadata.hasStrings && <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs mr-1">S</span>}
              {metadata.hasBooleans && <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs mr-1">B</span>}
              {metadata.hasNulls && <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Null</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stack visualization (vertical layout) with slide-in animation
  const renderStackVisualization = () => {
    // Use stackData for stack operations
    const displayData = inputType === 'stack' ? stackData : parsedData;
    
    if (!Array.isArray(displayData)) return null;
    
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col-reverse items-center mb-6 w-full max-w-md">
          {displayData.map((item, index) => (
            <div 
              key={index}
              className={`
                w-full h-18 flex items-center justify-between px-5
                border-2 rounded-xl transition-all duration-300 mb-3
                ${selectedNode === index ? 'ring-4 ring-blue-500 scale-105 shadow-lg' : 'shadow-md'}
                bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100
                border-gray-300 hover:border-blue-400
                ${isAnimating ? 'animate-puddingWave' : ''}
              `}
              style={{
                animationDelay: isAnimating ? `${index * 0.1}s` : '0s'
              }}
              onClick={() => {
                setSelectedNode(index);
                setNodeDetails({
                  index,
                  value: item,
                  type: typeof item,
                  position: index + 1, // Stack position (top = 1)
                  isFirst: index === 0,
                  isLast: index === displayData.length - 1
                });
              }}
            >
              <div className="flex items-center">
                <span className="font-bold text-lg text-gray-800">
                  {item === null ? 'null' : String(item)}
                </span>
                <span className="text-xs text-gray-500 ml-3 font-medium">[{index}]</span>
              </div>
              <div className="text-xs text-blue-600 font-bold">
                Pos: {index + 1}
              </div>
            </div>
          ))}
        </div>
        
        {/* Stack stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Size</div>
            <div className="text-xl font-bold text-blue-800">{stackData.length}</div>
          </div>
          
          {stackData.length > 0 && (
            <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
              <div className="text-sm text-gray-600 font-medium">Top Element</div>
              <div className="text-xl font-bold text-blue-800">
                {stackData[0] === null ? 'null' : String(stackData[0])}
              </div>
            </div>
          )}
          
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Bottom Index</div>
            <div className="text-xl font-bold text-blue-800">{stackData.length > 0 ? stackData.length - 1 : 'N/A'}</div>
          </div>
          
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Top Index</div>
            <div className="text-xl font-bold text-blue-800">0</div>
          </div>
        </div>
      </div>
    );
  };

  // Queue visualization (vertical layout) with slide-in animation
  const renderQueueVisualization = () => {
    // Use queueData for queue operations
    const displayData = inputType === 'queue' ? queueData : parsedData;
    
    if (!Array.isArray(displayData)) return null;
    
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col items-center mb-6 w-full max-w-md">
          {displayData.map((item, index) => (
            <div 
              key={index}
              className={`
                w-full h-18 flex items-center justify-between px-5
                border-2 rounded-xl transition-all duration-300 mb-3
                ${selectedNode === index ? 'ring-4 ring-blue-500 scale-105 shadow-lg' : 'shadow-md'}
                bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100
                border-gray-300 hover:border-blue-400
                ${isAnimating ? 'animate-puddingWave' : ''}
              `}
              style={{
                animationDelay: isAnimating ? `${index * 0.1}s` : '0s'
              }}
              onClick={() => {
                setSelectedNode(index);
                setNodeDetails({
                  index,
                  value: item,
                  type: typeof item,
                  position: index + 1, // Queue position (front = 1)
                  isFirst: index === 0,
                  isLast: index === displayData.length - 1
                });
              }}
            >
              <div className="flex items-center">
                <span className="font-bold text-lg text-gray-800">
                  {item === null ? 'null' : String(item)}
                </span>
                <span className="text-xs text-gray-500 ml-3 font-medium">[{index}]</span>
              </div>
              <div className="text-xs text-blue-600 font-bold">
                Pos: {index + 1}
              </div>
            </div>
          ))}
        </div>
        
        {/* Queue stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Size</div>
            <div className="text-xl font-bold text-blue-800">{queueData.length}</div>
          </div>
          
          {queueData.length > 0 && (
            <>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Front Element</div>
                <div className="text-xl font-bold text-blue-800">
                  {queueData[0] === null ? 'null' : String(queueData[0])}
                </div>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Rear Element</div>
                <div className="text-xl font-bold text-blue-800">
                  {queueData[queueData.length - 1] === null ? 'null' : String(queueData[queueData.length - 1])}
                </div>
              </div>
            </>
          )}
          
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Front Index</div>
            <div className="text-xl font-bold text-blue-800">0</div>
          </div>
        </div>
      </div>
    );
  };

  // Linked list visualization with chain animation
  const renderLinkedListVisualization = () => {
    if (!Array.isArray(parsedData)) return null;
    
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex items-center mb-6 w-full overflow-x-auto py-4">
          <div className="flex items-center">
            {parsedData.map((item, index) => (
              <React.Fragment key={index}>
                <div 
                  className={`
                    w-24 h-20 flex flex-col items-center justify-center
                    border-2 rounded-xl transition-all duration-300
                    ${selectedNode === index ? 'ring-4 ring-blue-500 scale-105 shadow-lg' : 'shadow-md'}
                    bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100
                    border-gray-300 hover:border-blue-400
                    ${isAnimating ? 'animate-puddingWave' : ''}
                  `}
                  style={{
                    animationDelay: isAnimating ? `${index * 0.1}s` : '0s'
                  }}
                  onClick={() => {
                    setSelectedNode(index);
                    setNodeDetails({
                      index,
                      value: item,
                      type: typeof item,
                      isFirst: index === 0,
                      isLast: index === parsedData.length - 1,
                      hasNext: index < parsedData.length - 1
                    });
                  }}
                >
                  <span className="font-bold text-base text-gray-800">
                    {item === null ? 'null' : String(item)}
                  </span>
                  <span className="text-xs text-gray-500 mt-1 font-medium">[{index}]</span>
                </div>
                {index < parsedData.length - 1 && (
                  <div className="mx-3 text-2xl font-bold text-blue-600">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Linked list stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Length</div>
            <div className="text-xl font-bold text-blue-800">{parsedData.length}</div>
          </div>
          
          {parsedData.length > 0 && (
            <>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Head</div>
                <div className="text-xl font-bold text-blue-800">
                  {parsedData[0] === null ? 'null' : String(parsedData[0])}
                </div>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="text-sm text-gray-600 font-medium">Tail</div>
                <div className="text-xl font-bold text-blue-800">
                  {parsedData[parsedData.length - 1] === null ? 'null' : String(parsedData[parsedData.length - 1])}
                </div>
              </div>
            </>
          )}
          
          <div className="border border-gray-200 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="text-sm text-gray-600 font-medium">Operations</div>
            <div className="text-xs text-gray-700 font-medium">Insert, Delete, Traverse</div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced tree visualization with branch grow animation
  const renderTreeVisualization = () => {
    if (!parsedData || !parsedData.nodes) return null;
    
    const { nodes, edges } = parsedData;
    if (nodes.length === 0) return <div className="text-gray-500">No nodes to display</div>;
    
    // Calculate hierarchical layout
    const calculateTreeLayout = () => {
      const nodeMap = new Map();
      const childrenMap = new Map();
      const levelMap = new Map();
      
      // Initialize
      nodes.forEach(node => {
        nodeMap.set(node.label, { ...node, x: 0, y: 0 });
        childrenMap.set(node.label, []);
      });
      
      // Build parent-child relationships
      edges.forEach(edge => {
        if (childrenMap.has(edge.from)) {
          childrenMap.get(edge.from).push(edge.to);
        }
      });
      
      // Find root (node with no incoming edges)
      const incomingCount = new Map();
      nodes.forEach(node => incomingCount.set(node.label, 0));
      edges.forEach(edge => {
        incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
      });
      
      const root = nodes.find(node => incomingCount.get(node.label) === 0)?.label || nodes[0]?.label;
      
      // Calculate levels (BFS)
      const queue = [{ node: root, level: 0 }];
      const visited = new Set();
      
      while (queue.length > 0) {
        const { node, level } = queue.shift();
        if (visited.has(node)) continue;
        
        visited.add(node);
        levelMap.set(node, level);
        
        const children = childrenMap.get(node) || [];
        children.forEach(child => {
          queue.push({ node: child, level: level + 1 });
        });
      }
      
      // Group nodes by level
      const levels = new Map();
      levelMap.forEach((level, node) => {
        if (!levels.has(level)) levels.set(level, []);
        levels.get(level).push(node);
      });
      
      // Calculate positions
      const nodeWidth = 60;
      const nodeHeight = 60;
      const levelHeight = 120;
      const padding = 80;
      
      levels.forEach((levelNodes, level) => {
        const totalWidth = levelNodes.length * nodeWidth + (levelNodes.length - 1) * 40;
        const startX = -totalWidth / 2;
        
        levelNodes.forEach((node, index) => {
          const nodeObj = nodeMap.get(node);
          nodeObj.x = startX + index * (nodeWidth + 40) + nodeWidth / 2;
          nodeObj.y = level * levelHeight + padding;
        });
      });
      
      // Adjust for centering
      const allNodes = Array.from(nodeMap.values());
      const minX = Math.min(...allNodes.map(n => n.x));
      const maxX = Math.max(...allNodes.map(n => n.x));
      const minY = Math.min(...allNodes.map(n => n.y));
      const maxY = Math.max(...allNodes.map(n => n.y));
      
      const width = Math.max(800, maxX - minX + padding * 2);
      const height = Math.max(600, maxY - minY + padding * 2);
      const offsetX = width / 2;
      const offsetY = padding;
      
      allNodes.forEach(node => {
        node.x += offsetX;
        node.y += offsetY;
      });
      
      return { nodes: allNodes, edges, width, height };
    };
    
    const layout = calculateTreeLayout();
    
    return (
      <div className="w-full overflow-auto">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-white min-h-[400px] shadow-inner"
        >
          {/* Render edges with draw animation */}
          {layout.edges.map((edge, index) => {
            const fromNode = layout.nodes.find(n => n.label === edge.from);
            const toNode = layout.nodes.find(n => n.label === edge.to);
            
            if (!fromNode || !toNode) return null;
            
            const length = Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2));
            
            return (
              <line
                key={index}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#001F3F"
                strokeWidth="2"
                markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
                className={`transition-all duration-300 ${isAnimating ? 'animate-uniqueEdgeDraw' : ''}`}
                style={{ strokeDasharray: length, strokeDashoffset: isAnimating ? length : 0 }}
              />
            );
          })}
          
          {/* Render nodes with grow animation */}
          {layout.nodes.map((node, index) => (
            <g key={index}>
              <circle
                cx={node.x}
                cy={node.y}
                r="28"
                fill={selectedNode === node.label ? "#001F3F" : "white"}
                stroke={selectedNode === node.label ? "#001F3F" : "black"}
                strokeWidth="3"
                className={`cursor-pointer transition-all duration-300 hover:stroke-[#001F3F] hover:scale-110 ${isAnimating ? 'animate-uniqueGrow' : ''}`}
                onClick={() => {
                  setSelectedNode(node.label);
                  setNodeDetails({
                    label: node.label,
                    level: node.level || 0,
                    children: edges.filter(e => e.from === node.label).length,
                    parents: edges.filter(e => e.to === node.label).length
                  });
                }}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-bold text-sm fill-black select-none pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          ))}
          
          {/* Arrowhead marker for directed edges */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#001F3F" />
            </marker>
          </defs>
        </svg>
      </div>
    );
  };

  // Enhanced graph visualization with circular layout
  const renderGraphVisualization = () => {
    if (!parsedData || !parsedData.nodes) return null;
    
    const { nodes, edges } = parsedData;
    if (nodes.length === 0) return <div className="text-gray-500">No nodes to display</div>;
    
    // Calculate circular layout for graph
    const calculateGraphLayout = () => {
      const nodeMap = new Map();
      nodes.forEach(node => {
        nodeMap.set(node.label, { ...node, x: 0, y: 0 });
      });
      
      const numNodes = nodes.length;
      const centerX = 400;
      const centerY = 300;
      const minRadius = 100;
      const maxRadius = 300;
      const radius = Math.min(maxRadius, minRadius + (numNodes * 10)); // Scale radius with number of nodes
      
      nodes.forEach((node, index) => {
        const angle = (index / numNodes) * Math.PI * 2;
        const n = nodeMap.get(node.label);
        n.x = centerX + radius * Math.cos(angle);
        n.y = centerY + radius * Math.sin(angle);
      });
      
      const allNodes = Array.from(nodeMap.values());
      const width = Math.max(800, radius * 2 + 100);
      const height = Math.max(600, radius * 2 + 100);
      
      return { nodes: allNodes, edges, width, height };
    };
    
    const layout = calculateGraphLayout();
    
    return (
      <div className="w-full overflow-auto">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-white min-h-[400px] shadow-inner"
        >
          {/* Render edges with draw animation */}
          {layout.edges.map((edge, index) => {
            const fromNode = layout.nodes.find(n => n.label === edge.from);
            const toNode = layout.nodes.find(n => n.label === edge.to);
            
            if (!fromNode || !toNode) return null;
            
            const length = Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2));
            
            return (
              <line
                key={index}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#001F3F"
                strokeWidth="2"
                markerEnd={edge.directed ? "url(#arrowhead)" : undefined}
                className={`transition-all duration-300 ${isAnimating ? 'animate-uniqueEdgeDraw' : ''}`}
                style={{ strokeDasharray: length, strokeDashoffset: isAnimating ? length : 0 }}
              />
            );
          })}
          
          {/* Render nodes with grow animation */}
          {layout.nodes.map((node, index) => (
            <g key={index}>
              <circle
                cx={node.x}
                cy={node.y}
                r="28"
                fill={selectedNode === node.label ? "#001F3F" : "white"}
                stroke={selectedNode === node.label ? "#001F3F" : "black"}
                strokeWidth="3"
                className={`cursor-pointer transition-all duration-300 hover:stroke-[#001F3F] hover:scale-110 ${isAnimating ? 'animate-uniqueGrow' : ''}`}
                onClick={() => {
                  setSelectedNode(node.label);
                  setNodeDetails({
                    label: node.label,
                    level: node.level || 0,
                    children: edges.filter(e => e.from === node.label).length,
                    parents: edges.filter(e => e.to === node.label).length
                  });
                }}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-bold text-sm fill-black select-none pointer-events-none"
              >
                {node.label}
              </text>
            </g>
          ))}
          
          {/* Arrowhead marker for directed edges */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#001F3F" />
            </marker>
          </defs>
        </svg>
      </div>
    );
  };

  // Render visualization based on input type
  const renderVisualization = () => {
    if (error) {
      return (
        <div className="p-4 bg-white border border-[#001F3F] rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-[#001F3F] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-[#001F3F]">Error Parsing Input</h3>
              <p className="text-[#001F3F] text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (parsedData === null || parsedData === undefined) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 11-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Enter data to visualize...</p>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">
            {inputType.charAt(0).toUpperCase() + inputType.slice(1)} Visualization
          </h3>
          <div className="flex items-center space-x-3">
            <select
              value={visualizationMode}
              onChange={(e) => setVisualizationMode(e.target.value)}
              className="text-sm p-2.5 border-2 border-gray-200 rounded-xl bg-white text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="default">Default View</option>
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
            </select>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${isAnimating 
                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg' 
                : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-sm hover:shadow-md'}`}
            >
              {isAnimating ? 'Stop' : 'Animate'}
            </button>
            <button 
              title="Full Screen"
              onClick={() => setIsFullScreen(true)}
              className="p-2 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          {inputType === 'array' && renderArrayVisualization()}
          {inputType === 'stack' && renderStackVisualization()}
          {inputType === 'queue' && renderQueueVisualization()}
          {inputType === 'linked-list' && renderLinkedListVisualization()}
          {inputType === 'tree' && renderTreeVisualization()}
          {inputType === 'graph' && renderGraphVisualization()}
        </div>
        
        {/* Node Details Panel */}
        {nodeDetails && (
          <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <h4 className="font-bold text-gray-800 text-lg mb-4 pb-2 border-b border-gray-200">Node Details</h4>
            <div className="grid grid-cols-2 gap-3 text-base">
              {Object.entries(nodeDetails).map(([key, value]) => (
                <div key={key} className="flex justify-between p-2 rounded-lg bg-white border border-gray-100 hover:bg-blue-50 transition-colors duration-200">
                  <span className="text-gray-600 font-medium capitalize">{key}:</span>
                  <span className="font-bold text-blue-800">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Metadata Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-800 font-bold text-lg">{metadata.summary}</span>
          </div>
        </div>
      </div>
    );
  };

  // If external props are provided (split-view mode)
  if (externalInputType !== undefined || externalInputValue !== undefined) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white border border-black rounded-lg shadow-sm flex-grow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#001F3F]">I/O Visualization</h2>
            <span className="px-3 py-1 bg-[#001F3F] text-white rounded-full text-sm font-medium">
              {inputType.toUpperCase()}
            </span>
          </div>
          <div className="flex-grow overflow-auto h-full">
            {renderVisualization()}
          </div>
        </div>
      </div>
    );
  }
  
  // Standalone mode with full controls
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="p-6 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-indigo-800">I/O Visualizer</h2>
            <p className="text-gray-600 mt-2 text-lg">Interactive visualization for data structures and algorithms</p>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-xl border border-gray-300">
            <span className="text-sm text-gray-700 font-medium">Speed:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-32 accent-blue-700"
            />
            <span className="text-sm font-bold text-blue-800 min-w-[30px]">{animationSpeed}x</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">Input Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {['array', 'stack', 'queue', 'linked-list', 'tree', 'graph'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setInputType(type)}
                        className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${inputType === type 
                          ? 'bg-gradient-to-br from-blue-700 to-blue-900 text-white shadow-lg shadow-blue-500/30' 
                          : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 shadow-sm hover:shadow-md'}`}
                      >
                        <div className="font-bold text-sm">{type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Add element input for stack and queue */}
                {(inputType === 'stack' || inputType === 'queue') && (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter element to add"
                      className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 shadow-sm transition-all duration-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddElement(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button 
                      onClick={(e) => {
                        const input = e.target.previousSibling;
                        handleAddElement(input.value);
                        input.value = '';
                      }}
                      className="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      Add
                    </button>
                    {inputType === 'stack' && stackData.length > 0 && (
                      <button 
                        onClick={handlePopElement}
                        className="px-4 py-3 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl hover:from-red-600 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        Pop
                      </button>
                    )}
                    {inputType === 'queue' && queueData.length > 0 && (
                      <button 
                        onClick={handleDequeueElement}
                        className="px-4 py-3 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl hover:from-red-600 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        Dequeue
                      </button>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Input Data
                  </label>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={getPlaceholder(inputType)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 bg-white text-gray-800 shadow-sm transition-all duration-300 resize-none"
                    rows="4"
                  />
                </div>
              </div>
            </div>
            
            {/* Examples Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">Quick Examples</h3>
              <div className="grid grid-cols-1 gap-4">
                <ExampleButton
                  title="Array Example"
                  description="Mixed data types array"
                  data="1, 2, hello, true, null, 3.14"
                  type="array"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
                <ExampleButton
                  title="Stack Example"
                  description="LIFO data structure"
                  data="1, 2, 3, 4, 5"
                  type="stack"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
                <ExampleButton
                  title="Queue Example"
                  description="FIFO data structure"
                  data="1, 2, 3, 4, 5"
                  type="queue"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
                <ExampleButton
                  title="Linked List Example"
                  description="Singly linked list"
                  data="10, 20, 30, 40, 50"
                  type="linked-list"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
                <ExampleButton
                  title="Tree Example"
                  description="Binary tree structure"
                  data="A(B(D,E),C(F,G))"
                  type="tree"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
                <ExampleButton
                  title="Graph Example"
                  description="Directed weighted graph"
                  data="A->B:5, B->C:3, C->A:2, D->E:1"
                  type="graph"
                  setInputType={setInputType}
                  setInputValue={setInputValue}
                  currentType={inputType}
                  external={externalInputType !== undefined}
                />
              </div>
            </div>
          </div>
          
          {/* Visualization Section */}
          <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-gray-200 rounded-2xl shadow-xl p-6 overflow-hidden min-h-[600px]">
            <div className="h-full overflow-auto bg-white/70 rounded-xl p-4 border border-gray-100">
              {renderVisualization()}
            </div>
          </div>
        </div>
        
        {/* Footer with info */}
        <div className="mt-8 pt-6 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Click on elements for detailed information</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {metadata.type}
              </span>
              <span className="text-gray-500 font-medium">•</span>
              <span className="text-gray-700 font-medium">{new Date(metadata.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
      {isFullScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-11/12 h-5/6 overflow-auto">
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => setIsFullScreen(false)}
                className="px-3 py-1 bg-[#001F3F] text-white rounded hover:bg-[#001F3F]/80"
              >
                Close
              </button>
            </div>
            {renderVisualization()}
          </div>
        </div>
      )}
      <style>{`
        @keyframes uniquePulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; box-shadow: 0 0 10px rgba(0, 31, 63, 0.5); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes uniqueSlideIn {
          0% { transform: translateY(-50px); opacity: 0; }
          60% { transform: translateY(10px); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes uniqueChain {
          0% { transform: rotate(0deg); opacity: 0.5; }
          50% { transform: rotate(5deg); opacity: 1; }
          100% { transform: rotate(0deg); opacity: 1; }
        }
        @keyframes uniqueEdgeDraw {
          0% { stroke-dashoffset: inherit; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes uniqueGrow {
          0% { r: 0; opacity: 0; }
          70% { r: 30; opacity: 0.8; }
          100% { r: 28; opacity: 1; }
        }
        @keyframes puddingEffect {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(0, 31, 63, 0.5); }
          30% { transform: scale(1.05); box-shadow: 0 0 15px rgba(0, 31, 63, 0.7); }
          60% { transform: scale(0.98); box-shadow: 0 0 10px rgba(0, 31, 63, 0.6); }
          100% { transform: scale(1); box-shadow: 0 0 5px rgba(0, 31, 63, 0.5); }
        }
        @keyframes puddingWave {
          0% { transform: translateY(0) scale(1); box-shadow: 0 0 0 rgba(0, 31, 63, 0); }
          30% { transform: translateY(-8px) scale(1.02); box-shadow: 0 5px 15px rgba(0, 31, 63, 0.4); }
          70% { transform: translateY(3px) scale(0.98); box-shadow: 0 2px 8px rgba(0, 31, 63, 0.3); }
          100% { transform: translateY(0) scale(1); box-shadow: 0 0 5px rgba(0, 31, 63, 0.2); }
        }
        .animate-uniquePulse {
          animation: uniquePulse 0.6s ease-in-out;
        }
        .animate-uniqueSlideIn {
          animation: uniqueSlideIn 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }
        .animate-uniqueChain {
          animation: uniqueChain 0.5s ease-in-out;
        }
        .animate-uniqueEdgeDraw {
          animation: uniqueEdgeDraw 1s linear forwards;
        }
        .animate-uniqueGrow {
          animation: uniqueGrow 0.7s ease-out;
        }
        .animate-puddingEffect {
          animation: puddingEffect 0.6s ease-out;
        }
        .animate-puddingWave {
          animation: puddingWave 1.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// Helper component for example buttons
const ExampleButton = ({ title, description, data, type, setInputType, setInputValue, currentType, external }) => (
  <button
    onClick={() => {
      if (!external) {
        setInputType(type);
        setInputValue(data);
      }
    }}
    className={`p-5 text-left rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md ${currentType === type ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
  >
    <div className="font-bold text-gray-800">{title}</div>
    <div className="text-sm text-gray-600 mt-2">{description}</div>
    <div className="text-xs font-mono bg-gradient-to-br from-gray-100 to-gray-50 p-3 mt-3 rounded-lg truncate text-gray-700 border border-gray-200">{data}</div>
  </button>
);

// Helper function for placeholders
const getPlaceholder = (type) => {
  switch (type) {
    case 'array':
      return 'Enter values separated by commas: 1, 2, 3, "hello", true, null';
    case 'stack':
      return 'Enter values separated by commas: 1, 2, 3, 4, 5';
    case 'queue':
      return 'Enter values separated by commas: 1, 2, 3, 4, 5';
    case 'linked-list':
      return 'Enter values separated by commas: 1, 2, 3, 4, 5';
    case 'tree':
      return 'Nested format: A(B(C,D),E) or edge format: A->B, B->C, C-D';
    case 'graph':
      return 'Edge format: A->B:5, B->C:3, C-D:2 (-> for directed, - for undirected)';
    default:
      return 'Enter data...';
  }
};

export default IOVisualizer;