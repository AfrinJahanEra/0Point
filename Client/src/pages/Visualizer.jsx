import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import AlgorithmSelector from '../components/AlgorithmSelector';
import InputPanel from '../components/InputPanel';
import SequentialSortingVisualizer from '../components/Visualizer_comp/SequentialSortingVisualizer';
import HeapTreeVisualizer from '../components/Visualizer_comp/HeapTreeVisualizer';
import SearchVisualizer from '../components/Visualizer_comp/SearchVisualizer';
import BSTVisualizer from '../components/Visualizer_comp/BSTVisualizer';
import AVLVisualizer from '../components/Visualizer_comp/AVLVisualizer';
import TrieVisualizer from '../components/Visualizer_comp/TrieVisualizer';
import TreeVisualizer from '../components/Visualizer_comp/TreeVisualizer';
import BFSVisualizer from '../components/Visualizer_comp/BFSVisualizer';
import DFSVisualizer from '../components/Visualizer_comp/DFSVisualizer';
import DijkstraVisualizer from '../components/Visualizer_comp/DijkstraVisualizer';
import KruskalVisualizer from '../components/Visualizer_comp/KruskalVisualizer';
import PrimVisualizer from '../components/Visualizer_comp/PrimVisualizer';
import IOVisualizer from '../components/Io_Visualizer/IOVisualizer';
import CodeVisualizer from '../components/CodeVisualizer/CodeVisualizer';
import { algorithms } from '../utils/algorithms';
import { parseInputs } from '../utils/inputParser';

// Algorithm code templates for display
const algorithmCodes = {
  'bubble-sort': `
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        // Swap elements
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,

  'quick-sort': `
function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}`,

  'merge-sort': `
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  let result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }
  
  return result.concat(left.slice(i)).concat(right.slice(j));
}`,

  'insertion-sort': `
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    
    arr[j + 1] = key;
  }
  return arr;
}`,

  'selection-sort': `
function selectionSort(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    let minIdx = i;
    
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
  }
  return arr;
}`,

  'heap-sort': `
function heapSort(arr) {
  const n = arr.length;
  
  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  
  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    // Move current root to end
    [arr[0], arr[i]] = [arr[i], arr[0]];
    
    // Call heapify on the reduced heap
    heapify(arr, i, 0);
  }
  
  return arr;
}

function heapify(arr, n, i) {
  let largest = i; // Initialize largest as root
  const left = 2 * i + 1; // left child
  const right = 2 * i + 2; // right child
  
  // If left child is larger than root
  if (left < n && arr[left] > arr[largest]) {
    largest = left;
  }
  
  // If right child is larger than largest so far
  if (right < n && arr[right] > arr[largest]) {
    largest = right;
  }
  
  // If largest is not root
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    
    // Recursively heapify the affected sub-tree
    heapify(arr, n, largest);
  }
}`,

  'linear-search': `
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i; // Return index if found
    }
  }
  return -1; // Return -1 if not found
}`,

  'binary-search': `
function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    
    if (arr[mid] === target) {
      return mid; // Return index if found
    } else if (arr[mid] < target) {
      low = mid + 1; // Search right half
    } else {
      high = mid - 1; // Search left half
    }
  }
  
  return -1; // Return -1 if not found
}`,

  'bst': `
class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BST {
  constructor() {
    this.root = null;
  }
  
  insert(value) {
    this.root = this.insertNode(this.root, value);
  }
  
  insertNode(node, value) {
    if (node === null) {
      return new TreeNode(value);
    }
    
    if (value < node.value) {
      node.left = this.insertNode(node.left, value);
    } else if (value > node.value) {
      node.right = this.insertNode(node.right, value);
    }
    
    return node;
  }
}`,

  'avl-tree': `
class AVLNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
  }
  
  getHeight(node) {
    return node ? node.height : 0;
  }
  
  getBalance(node) {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }
  
  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    
    x.right = y;
    y.left = T2;
    
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;
    
    return x;
  }
  
  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    
    y.left = x;
    x.right = T2;
    
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;
    
    return y;
  }
  
  insert(value) {
    this.root = this.insertNode(this.root, value);
  }
  
  insertNode(node, value) {
    if (node === null) {
      return new AVLNode(value);
    }
    
    if (value < node.value) {
      node.left = this.insertNode(node.left, value);
    } else if (value > node.value) {
      node.right = this.insertNode(node.right, value);
    } else {
      return node; // Duplicate values not allowed
    }
    
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    
    const balance = this.getBalance(node);
    
    // Left Left Case
    if (balance > 1 && value < node.left.value) {
      return this.rotateRight(node);
    }
    
    // Right Right Case
    if (balance < -1 && value > node.right.value) {
      return this.rotateLeft(node);
    }
    
    // Left Right Case
    if (balance > 1 && value > node.left.value) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }
    
    // Right Left Case
    if (balance < -1 && value < node.right.value) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }
    
    return node;
  }
}`,

  'trie': `
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(word) {
    let current = this.root;
    
    for (let char of word) {
      if (!current.children[char]) {
        current.children[char] = new TrieNode();
      }
      current = current.children[char];
    }
    
    current.isEnd = true;
  }
  
  search(word) {
    let current = this.root;
    
    for (let char of word) {
      if (!current.children[char]) {
        return false;
      }
      current = current.children[char];
    }
    
    return current.isEnd;
  }
}`,

  'bfs': `
function bfs(graph, startNode) {
  const visited = new Set();
  const queue = [startNode];
  visited.add(startNode);
  
  while (queue.length > 0) {
    const currentNode = queue.shift();
    
    // Process neighbors
    const neighbors = graph[currentNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return visited;
}`,

  'dfs': `
function dfs(graph, startNode) {
  const visited = new Set();
  const stack = [startNode];
  
  while (stack.length > 0) {
    const currentNode = stack.pop();
    
    if (!visited.has(currentNode)) {
      visited.add(currentNode);
      
      // Add neighbors to stack in reverse order for consistent traversal
      const neighbors = graph[currentNode] || [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i];
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }
  
  return visited;
}`,

  'dijkstra': `
function dijkstra(graph, startNode) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const unvisited = new Set(Object.keys(graph));
  
  // Initialize distances
  for (const node in graph) {
    distances[node] = node === startNode ? 0 : Infinity;
    previous[node] = null;
  }
  
  while (unvisited.size > 0) {
    // Find node with minimum distance
    let currentNode = null;
    let minDistance = Infinity;
    
    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        currentNode = node;
      }
    }
    
    // If all remaining nodes are unreachable, break
    if (currentNode === null || distances[currentNode] === Infinity) {
      break;
    }
    
    // Mark current node as visited
    unvisited.delete(currentNode);
    visited.add(currentNode);
    
    // Update distances to neighbors
    const neighbors = graph[currentNode] || [];
    for (const neighborObj of neighbors) {
      const { node: neighbor, weight } = neighborObj;
      if (!visited.has(neighbor)) {
        const newDistance = distances[currentNode] + weight;
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          previous[neighbor] = currentNode;
        }
      }
    }
  }
  
  return { distances, previous };
}`,

  'kruskal': `
class UnionFind {
  constructor(nodes) {
    this.parent = {};
    this.rank = {};
    
    nodes.forEach(node => {
      this.parent[node] = node;
      this.rank[node] = 0;
    });
  }
  
  find(node) {
    if (this.parent[node] !== node) {
      this.parent[node] = this.find(this.parent[node]); // Path compression
    }
    return this.parent[node];
  }
  
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX !== rootY) {
      // Union by rank
      if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
      } else if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
      } else {
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
      }
      return true;
    }
    return false;
  }
}

function kruskal(nodes, edges) {
  // Sort edges by weight
  edges.sort((a, b) => a.weight - b.weight);
  
  // Initialize Union-Find
  const uf = new UnionFind(nodes);
  
  // Kruskal's algorithm
  const mst = [];
  
  for (const edge of edges) {
    // Check if adding this edge creates a cycle
    if (uf.union(edge.from, edge.to)) {
      mst.push(edge);
    }
    
    // Stop when MST is complete
    if (mst.length === nodes.length - 1) {
      break;
    }
  }
  
  return mst;
}`,

  'prim': `
function prim(graph, startNode) {
  const mst = [];
  const visited = new Set([startNode]);
  const edgesQueue = [];
  
  // Add all edges from start node to queue
  const startEdges = graph[startNode] || [];
  startEdges.forEach(edge => {
    edgesQueue.push({ from: startNode, to: edge.node, weight: edge.weight });
  });
  
  // Sort queue by weight
  edgesQueue.sort((a, b) => a.weight - b.weight);
  
  while (edgesQueue.length > 0 && visited.size < Object.keys(graph).length) {
    // Get the minimum weight edge
    const minEdge = edgesQueue.shift();
    
    // If the destination node is not yet visited
    if (!visited.has(minEdge.to)) {
      // Add the edge to MST
      mst.push(minEdge);
      visited.add(minEdge.to);
      
      // Add all edges from the newly added node to queue
      const newEdges = graph[minEdge.to] || [];
      newEdges.forEach(edge => {
        if (!visited.has(edge.node)) {
          edgesQueue.push({ from: minEdge.to, to: edge.node, weight: edge.weight });
        }
      });
      
      // Sort queue by weight
      edgesQueue.sort((a, b) => a.weight - b.weight);
    }
  }
  
  return mst;
}`
};

const Visualizer = () => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [inputValues, setInputValues] = useState([]);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizationData, setVisualizationData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [heapViewMode, setHeapViewMode] = useState('array'); // 'array' or 'tree'
  const [activeTab, setActiveTab] = useState('dsa'); // 'dsa', 'io', or 'code'
  const [customCode, setCustomCode] = useState('// Enter your code here\nfunction example() {\n  // Your code\n}');
  const [customInput, setCustomInput] = useState('');
  // IO Visualizer states
  const [ioInputType, setIoInputType] = useState('array');
  const [ioInputValue, setIoInputValue] = useState('');
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context on mount to handle browser autoplay policies
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    // Try to initialize on first user interaction
    const handleFirstInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Ref to track if we should auto-start visualization
  const shouldAutoStartRef = useRef(false);
  
  const handleAlgorithmChange = (algId) => {
    setSelectedAlgorithm(algId);
    setInputValues([]);
    setVisualizationData(null);
    setSteps([]);
    setCurrentStep(0);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    setIsVisualizing(false);
  };

  const handleInputChange = (index, value) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);
  };

  const loadExample = (exampleIndex) => {
    const algorithm = algorithms.find(alg => alg.id === selectedAlgorithm);
    if (algorithm && algorithm.examples) {
      if (typeof algorithm.examples[exampleIndex] === 'string') {
        setInputValues([algorithm.examples[exampleIndex]]);
      } else if (Array.isArray(algorithm.examples[exampleIndex])) {
        setInputValues([...algorithm.examples[exampleIndex]]);
      }
    }
  };

  const startVisualization = () => {
    if (!selectedAlgorithm) return;
    
    // Validate inputs
    const algorithm = algorithms.find(alg => alg.id === selectedAlgorithm);
    if (!algorithm) return;
    
    const hasEmptyInput = algorithm.inputs.some((_, idx) => !inputValues[idx] || inputValues[idx].trim() === '');
    if (hasEmptyInput) {
      toast.error('Please provide input for all fields before starting visualization');
      return;
    }
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const parsedData = parseInputs(selectedAlgorithm, inputValues);
    
    if (algorithm.generateSteps) {
      const algorithmSteps = algorithm.generateSteps(parsedData);
      setSteps(algorithmSteps);
      setVisualizationData(algorithmSteps[0]);
      // Set isVisualizing to true after steps are set
      setIsVisualizing(true);
      setCurrentStep(0);
      // Animation will be handled by the SequentialSortingVisualizer auto-advance
    } else {
      setVisualizationData(parsedData);
      setIsVisualizing(true);
      setCurrentStep(0);
    }
  };

  const stopVisualization = () => {
    setIsVisualizing(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setVisualizationData(steps[currentStep + 1]);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setVisualizationData(steps[currentStep - 1]);
    }
  };
  
  const restartVisualization = () => {
    setCurrentStep(0);
    setVisualizationData(steps[0]);
    setIsVisualizing(true); // Start playing automatically
  };

  const renderVisualization = () => {
    // For tree algorithms, we can render even without initial visualizationData if we have steps
    const treeAlgorithmTypes = ['bst', 'avl-tree', 'trie'];
    const isTreeAlgorithm = selectedAlgorithm && treeAlgorithmTypes.includes(selectedAlgorithm);
    
    if (!selectedAlgorithm || (!visualizationData && !isTreeAlgorithm) || (isTreeAlgorithm && steps.length === 0)) return null;
    
    // If it's a tree algorithm and we don't have visualizationData yet, use the first step
    const effectiveVisualizationData = visualizationData || (isTreeAlgorithm && steps.length > 0 ? steps[0] : null);
    
    const visualizerProps = {
      data: effectiveVisualizationData,
      steps: steps,
      isPlaying: isVisualizing,
      currentStep,
      totalSteps: steps.length,
      onStop: stopVisualization,
      onNext: nextStep,
      onPrev: prevStep,
      onRestart: restartVisualization
    };

    // Check if it's a sorting algorithm
    const sortingAlgorithms = ['bubble-sort', 'quick-sort', 'merge-sort', 'insertion-sort', 'selection-sort', 'heap-sort'];
    // Check if it's a search algorithm
    const searchAlgorithms = ['linear-search', 'binary-search'];
    // Check if it's a tree algorithm
    const treeAlgorithms = ['bst', 'avl-tree', 'trie'];
    // Check if it's a graph traversal algorithm
    const graphTraversalAlgorithms = ['bfs', 'dfs'];
    // Check if it's a weighted graph algorithm
    const weightedGraphAlgorithms = ['dijkstra', 'kruskal', 'prim'];
    
    if (sortingAlgorithms.includes(selectedAlgorithm)) {
      // Special handling for heap sort with toggle between array and tree view
      if (selectedAlgorithm === 'heap-sort') {
        return (
          <div>
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    heapViewMode === 'array'
                      ? 'bg-[#001F3F] text-white border-[#001F3F]'
                      : 'bg-white text-[#001F3F] border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setHeapViewMode('array')}
                >
                  Array View
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                    heapViewMode === 'tree'
                      ? 'bg-[#001F3F] text-white border-[#001F3F]'
                      : 'bg-white text-[#001F3F] border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setHeapViewMode('tree')}
                >
                  Tree View
                </button>
              </div>
            </div>
            {heapViewMode === 'array' ? (
              <SequentialSortingVisualizer {...visualizerProps} viewMode="array" />
            ) : (
              <HeapTreeVisualizer {...visualizerProps} viewMode="tree" />
            )}
          </div>
        );
      }
      return <SequentialSortingVisualizer {...visualizerProps} />;
    }
    
    if (searchAlgorithms.includes(selectedAlgorithm)) {
      return <SearchVisualizer {...visualizerProps} />;
    }
    
    if (treeAlgorithms.includes(selectedAlgorithm)) {
      // Render specific tree visualizer based on algorithm type
      if (selectedAlgorithm === 'bst') {
        return <BSTVisualizer {...visualizerProps} />;
      } else if (selectedAlgorithm === 'avl-tree') {
        return <AVLVisualizer {...visualizerProps} />;
      } else if (selectedAlgorithm === 'trie') {
        return <TrieVisualizer {...visualizerProps} />;
      }
      // Fallback to generic TreeVisualizer if needed
      return <TreeVisualizer {...visualizerProps} />;
    }
    
    if (selectedAlgorithm === 'bfs') {
      return <BFSVisualizer {...visualizerProps} />;
    }
    
    if (selectedAlgorithm === 'dfs') {
      return <DFSVisualizer {...visualizerProps} />;
    }
    
    if (selectedAlgorithm === 'dijkstra') {
      return <DijkstraVisualizer {...visualizerProps} />;
    }
    
    if (selectedAlgorithm === 'kruskal') {
      return <KruskalVisualizer {...visualizerProps} />;
    }
    
    if (selectedAlgorithm === 'prim') {
      return <PrimVisualizer {...visualizerProps} />;
    }

    switch (selectedAlgorithm) {

      
      default:
        return null;
    }
  };

  // Get the current line to highlight based on the current step
  const getCurrentLineToHighlight = () => {
    if (!steps || steps.length === 0 || currentStep >= steps.length) return -1;
    
    const stepData = steps[currentStep];
    
    // Map step operations to line numbers in the code
    switch (selectedAlgorithm) {
      case 'bubble-sort':
        if (stepData.comparing && stepData.comparing.length > 0) {
          return 5; // Partitioning
        } else if (stepData.swapping && stepData.swapping.length > 0) {
          return 6; // Swapping elements
        }
        return -1;
        
      case 'quick-sort':
        if (stepData.pivot !== undefined) {
          return 11; // Partitioning
        } else if (stepData.comparing && stepData.comparing.length > 0) {
          return 14; // Comparing in partition
        } else if (stepData.swapping && stepData.swapping.length > 0) {
          return 16; // Swapping in partition
        }
        return -1;
        
      case 'merge-sort':
        if (stepData.operation === 'divide') {
          return 4; // Dividing array
        } else if (stepData.operation === 'merge_start' || stepData.operation === 'compare') {
          return 18; // Merging
        } else if (stepData.operation === 'place' || stepData.operation === 'place_remaining') {
          return 24; // Placing elements
        }
        return -1;
        
      case 'insertion-sort':
        if (stepData.comparing && stepData.comparing.length > 0) {
          return 5; // Comparing elements
        } else if (stepData.swapping && stepData.swapping.length > 0) {
          return 8; // Shifting elements
        }
        return -1;
        
      case 'selection-sort':
        if (stepData.comparing && stepData.comparing.length > 0) {
          return 7; // Finding minimum
        } else if (stepData.swapping && stepData.swapping.length > 0) {
          return 13; // Swapping elements
        }
        return -1;
        
      case 'heap-sort':
        if (stepData.operation === 'build_heap_start') {
          return 4; // Building heap
        } else if (stepData.operation === 'heapify_start' || stepData.operation === 'compare_children') {
          return 20; // Heapifying
        } else if (stepData.operation === 'swap_heap') {
          return 22; // Swapping in heap
        } else if (stepData.operation === 'extract_max') {
          return 12; // Extracting max
        }
        return -1;
        
      case 'linear-search':
        if (stepData.operation === 'compare') {
          return 3; // Comparing elements
        } else if (stepData.operation === 'found') {
          return 4; // Element found
        } else if (stepData.operation === 'not_found') {
          return 9; // Return -1
        }
        return -1;
        
      case 'binary-search':
        if (stepData.operation === 'compare') {
          return 6; // Comparing elements
        } else if (stepData.operation === 'found') {
          return 7; // Element found
        } else if (stepData.operation === 'move_right') {
          return 9; // Move right
        } else if (stepData.operation === 'move_left') {
          return 11; // Move left
        } else if (stepData.operation === 'not_found') {
          return 16; // Return -1
        }
        return -1;
        
      case 'bst':
        if (stepData.operation === 'insert_root') {
          return 17; // Insert root
        } else if (stepData.operation === 'traverse') {
          return 24; // Traverse
        } else if (stepData.operation === 'insert') {
          return 27; // Insert node
        }
        return -1;
        
      case 'avl-tree':
        if (stepData.operation === 'traverse') {
          return 37; // Traverse
        } else if (stepData.operation === 'rotate') {
          if (stepData.rotation === 'left') {
            return 60; // Left rotate
          } else if (stepData.rotation === 'right') {
            return 44; // Right rotate
          } else if (stepData.rotation === 'leftright') {
            return 70; // Left-right rotate
          } else if (stepData.rotation === 'rightleft') {
            return 80; // Right-left rotate
          }
        } else if (stepData.operation === 'insert') {
          return 34; // Insert node
        }
        return -1;
        
      case 'trie':
        if (stepData.operation === 'insert_start') {
          return 13; // Insert start
        } else if (stepData.operation === 'create_node') {
          return 18; // Create node
        } else if (stepData.operation === 'traverse') {
          return 24; // Traverse
        } else if (stepData.operation === 'mark_end') {
          return 28; // Mark end
        }
        return -1;
        
      case 'bfs':
        if (stepData.operation === 'start') {
          return 3; // Starting BFS
        } else if (stepData.operation === 'visit') {
          return 8; // Visiting node
        } else if (stepData.operation === 'process') {
          return 15; // Processing node
        }
        return -1;
        
      case 'dfs':
        if (stepData.operation === 'start') {
          return 3; // Starting DFS
        } else if (stepData.operation === 'visit') {
          return 8; // Visiting node
        } else if (stepData.operation === 'process') {
          return 13; // Processing node
        }
        return -1;
        
      case 'dijkstra':
        if (stepData.operation === 'start') {
          return 7; // Starting Dijkstra
        } else if (stepData.operation === 'select_node') {
          return 22; // Selecting node
        } else if (stepData.operation === 'update_distance') {
          return 34; // Updating distance
        }
        return -1;
        
      case 'kruskal':
        if (stepData.operation === 'start') {
          return 15; // Starting Kruskal
        } else if (stepData.operation === 'consider_edge') {
          return 25; // Considering edge
        } else if (stepData.operation === 'add_edge') {
          return 30; // Adding edge
        } else if (stepData.operation === 'skip_edge') {
          return 35; // Skipping edge
        }
        return -1;
        
      case 'prim':
        if (stepData.operation === 'start') {
          return 7; // Starting Prim
        } else if (stepData.operation === 'consider_edge') {
          return 20; // Considering edge
        } else if (stepData.operation === 'add_edge') {
          return 25; // Adding edge
        } else if (stepData.operation === 'skip_edge') {
          return 30; // Skipping edge
        } else if (stepData.operation === 'update_queue') {
          return 35; // Updating queue
        }
        return -1;
        
      default:
        return -1;
    }
  };

  const currentLineToHighlight = getCurrentLineToHighlight();

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-grow flex flex-col">
        <div className="text-center py-4 bg-[#001F3F] border-b border-black">
          <h1 className="text-3xl font-bold text-white mb-1">0Point Visualizer</h1>
          <p className="text-white text-base">Watch algorithms come to life with interactive visualizations</p>
          
          {/* Navbar for Visualizer Sections */}
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1 bg-black p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('dsa')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${activeTab === 'dsa' ? 'bg-white text-[#001F3F] shadow' : 'text-gray-300 hover:text-white'}`}
              >
                DSA Visualizer
              </button>
              <button
                onClick={() => setActiveTab('io')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${activeTab === 'io' ? 'bg-white text-[#001F3F] shadow' : 'text-gray-300 hover:text-white'}`}
              >
                I/O Visualizer
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${activeTab === 'code' ? 'bg-white text-[#001F3F] shadow' : 'text-gray-300 hover:text-white'}`}
              >
                Code Visualizer
              </button>
            </div>
          </div>
        </div>
        
        <div className={`flex-grow ${activeTab === 'code' ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-2'} gap-0`} style={{ height: 'calc(100vh - 160px)' }}>
          {/* Left Column - Input and Code for DSA and IO tabs only */}
          {(activeTab === 'dsa' || activeTab === 'io') && (
            <div className="bg-white border-r border-black flex flex-col h-full">
              {activeTab === 'dsa' && (
                <div className="p-6 overflow-y-auto flex-grow h-full">
                  <h2 className="text-xl text-[#001F3F] mb-3">Algorithm & Input</h2>
                  
                  <div className="mb-6">
                    <AlgorithmSelector
                      selectedAlgorithm={selectedAlgorithm}
                      onAlgorithmChange={handleAlgorithmChange}
                    />
                  </div>
                  
                  {selectedAlgorithm && (
                    <div className="mb-6">
                      <InputPanel
                        algorithm={algorithms.find(alg => alg.id === selectedAlgorithm)}
                        inputValues={inputValues}
                        onInputChange={handleInputChange}
                        onLoadExample={loadExample}
                        onStart={startVisualization}
                        isVisualizing={isVisualizing}
                        selectedAlgorithm={selectedAlgorithm}
                      />
                    </div>
                  )}
                  
                  {/* Code Display */}
                  {selectedAlgorithm && (
                    <div className="mt-6 flex-grow flex flex-col">
                      <h3 className="text-lg text-[#001F3F] mb-2">Algorithm Code</h3>
                      <div className="bg-black text-white p-4 rounded-lg overflow-x-auto font-mono text-sm flex-grow">
                        {algorithmCodes[selectedAlgorithm]?.split('\n').map((line, index) => (
                          <div 
                            key={index} 
                            className={index === currentLineToHighlight ? 'bg-[#001F3F] p-1 rounded code-line-highlight animate-uniqueCodeHighlight' : ''}
                          >
                            <span className="text-gray-500 mr-4 select-none">{index + 1}</span>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'io' && (
                <div className="p-6 overflow-y-auto flex-grow h-full">
                  <h2 className="text-xl text-[#001F3F] mb-3">I/O Visualizer</h2>
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Type
                      </label>
                      <select
                        value={ioInputType}
                        onChange={(e) => setIoInputType(e.target.value)}
                        className="mb-4 p-2 border border-black rounded-md focus:ring-[#001F3F] focus:border-[#001F3F]"
                      >
                        <option value="array">Array/List</option>
                        <option value="stack">Stack</option>
                        <option value="queue">Queue</option>
                        <option value="linked-list">Linked List</option>
                        <option value="tree">Tree</option>
                        <option value="graph">Graph</option>
                      </select>
                      
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Data
                      </label>
                      <textarea
                        value={ioInputValue}
                        onChange={(e) => setIoInputValue(e.target.value)}
                        placeholder={
                          ioInputType === 'array' 
                            ? 'Enter values separated by commas or spaces (e.g., 1,2,3,4,5 or 1 2 3 4 5)'
                            : ioInputType === 'stack'
                            ? 'Enter values separated by commas (e.g., 1,2,3,4,5)'
                            : ioInputType === 'queue'
                            ? 'Enter values separated by commas (e.g., 1,2,3,4,5)'
                            : ioInputType === 'linked-list'
                            ? 'Enter values separated by commas (e.g., 10,20,30,40,50)'
                            : ioInputType === 'tree'
                            ? 'Nested: A(B(C,D),E) or Edges: A->B,B->C'
                            : 'Undirected: A,B,C,A-B:5,B-C:3 or Directed: A->B:5,B->C:3'
                        }
                        className="flex-grow p-3 border border-black rounded-md focus:ring-[#001F3F] focus:border-[#001F3F]"
                        rows="4"
                      />
                      
                      <div className="mt-2 text-xs text-gray-500">
                        {ioInputType === 'array' && 'Supports numbers and strings'}
                        {ioInputType === 'stack' && 'LIFO data structure'}
                        {ioInputType === 'queue' && 'FIFO data structure'}
                        {ioInputType === 'linked-list' && 'Linear collection of elements'}
                        {ioInputType === 'tree' && 'Hierarchical tree structure with parent-child relationships'}
                        {ioInputType === 'graph' && 'Format: node1,node2,edge1-edge2:weight'}
                      </div>
                    </div>
                    
                    {/* Examples Section */}
                    <div className="bg-gray-50 p-4 rounded-lg flex-grow">
                      <h3 className="font-medium text-black mb-3">Examples</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Array Example:</div>
                          <div 
                            className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setIoInputType('array');
                              setIoInputValue('5,2,8,1,9,3');
                            }}
                          >
                            5,2,8,1,9,3
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700">Stack Example:</div>
                          <div 
                            className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setIoInputType('stack');
                              setIoInputValue('1,2,3,4,5');
                            }}
                          >
                            1,2,3,4,5
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700">Queue Example:</div>
                          <div 
                            className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setIoInputType('queue');
                              setIoInputValue('1,2,3,4,5');
                            }}
                          >
                            1,2,3,4,5
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700">Linked List Example:</div>
                          <div 
                            className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setIoInputType('linked-list');
                              setIoInputValue('10,20,30,40,50');
                            }}
                          >
                            10,20,30,40,50
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700">Tree Example:</div>
                          <div 
                            className="text-sm bg-white p-2 mt-1 rounded border cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setIoInputType('tree');
                              setIoInputValue('A(B(D,E),C(F))');
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
                              setIoInputType('graph');
                              setIoInputValue('A,B,C,D,A-B:5,B-C:3,C-D:7');
                            }}
                          >
                            A,B,C,D,A-B:5,B-C:3,C-D:7
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Or: A{'->'}B:5,B{'->'}C:3,C{'->'}D:7</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Right Column - Visualization or Full-width for Code Visualizer */}
          <div className="bg-white flex flex-col h-full">
            <div className="p-6 overflow-y-auto flex-grow h-full">
              {activeTab === 'dsa' && (
                <>
                  <h2 className="text-xl text-[#001F3F] mb-3">Visualization</h2>
                  {renderVisualization()}
                  
                  {!selectedAlgorithm && (
                    <div className="border border-black p-6 mt-6 bg-white">
                      <div className="flex flex-col md:flex-row items-center">
                        <div className="mb-4 md:mb-0 md:mr-6">
                          <div className="w-16 h-20 bg-white border border-black flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg text-black mb-2">How to Use This Visualizer</h3>
                          <div className="grid grid-cols-1 gap-4 text-black">
                            <p><span>1. Select an algorithm</span> from the dropdown menu</p>
                            <p><span>2. Enter the required inputs</span> as comma-separated values</p>
                            <p><span>3. Click "Start Visualization"</span> to see the algorithm in action</p>
                            <p><span>4. Observe</span> how the algorithm works step by step</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tips for new users */}
                      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                        <h3 className="text-black mb-1">Quick Tips</h3>
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                          <li>Try the "Example" buttons to quickly load sample data</li>
                          <li>Sorting algorithms work best with 5-10 numbers</li>
                          <li>Pause animations anytime to examine steps closely</li>
                          <li>Use the navigation buttons to move between steps</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {selectedAlgorithm && !visualizationData && (
                    <div className="text-center py-6 text-black">
                      <p className="mb-4">Click "Start Visualization" to begin</p>
                      <div className="inline-block p-3 bg-white border border-gray-200 rounded-lg max-w-md">
                        <h3 className="text-black mb-1">Visualization Tips</h3>
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 text-left">
                          <li>Animations will show each step of the algorithm</li>
                          <li>Use controls to pause, stop, or navigate steps</li>
                          <li>Hover over elements to see additional information</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Tips for using the visualizer */}
                  {selectedAlgorithm && (
                    <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                      <h3 className="text-black mb-1">Tips for Using the Visualizer</h3>
                      <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                        <li>Click "Start Visualization" to begin the animation</li>
                        <li>Use the Next/Previous buttons to navigate through steps</li>
                        <li>Hover over elements to see more details</li>
                        <li>Adjust your browser window for better viewing</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'io' && (
                <div className="h-full flex flex-col">
                  <h2 className="text-xl text-[#001F3F] mb-3">I/O Visualization</h2>
                  <div className="flex-grow">
                    <IOVisualizer inputType={ioInputType} inputValue={ioInputValue} />
                  </div>
                </div>
              )}
              
              {activeTab === 'code' && (
                <div className="h-full flex flex-col">
                  {selectedAlgorithm ? (
                    <CodeVisualizer 
                      algorithmId={selectedAlgorithm}
                      algorithmCode={algorithmCodes[selectedAlgorithm]}
                      inputData={inputValues}
                    />
                  ) : (
                    <CodeVisualizer 
                      algorithmId={null}
                      algorithmCode={customCode}
                      inputData={customInput}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes uniqueCodeHighlight {
          0% { opacity: 0; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .code-line-highlight {
          animation: uniqueCodeHighlight 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Visualizer;