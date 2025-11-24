import React, { useState, useEffect, useRef } from 'react';
import AlgorithmSelector from '../components/AlgorithmSelector';
import InputPanel from '../components/InputPanel';


import SequentialSortingVisualizer from '../components/sort/SequentialSortingVisualizer';
import HeapTreeVisualizer from '../components/sort/HeapTreeVisualizer';
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
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsVisualizing(true);
    setCurrentStep(0);
    
    const algorithm = algorithms.find(alg => alg.id === selectedAlgorithm);
    const parsedData = parseInputs(selectedAlgorithm, inputValues);
    
    if (algorithm.generateSteps) {
      const algorithmSteps = algorithm.generateSteps(parsedData);
      setSteps(algorithmSteps);
      setVisualizationData(algorithmSteps[0]);
      animateSteps();
    } else {
      setVisualizationData(parsedData);
    }
  };

  const animateSteps = () => {
    if (currentStep < steps.length - 1) {
      animationRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setVisualizationData(steps[currentStep + 1]);
        animateSteps();
      }, 800);
    } else {
      setTimeout(() => {
        setIsVisualizing(false);
      }, 1000);
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

  const renderVisualization = () => {
    if (!selectedAlgorithm || !visualizationData) return null;

    const visualizerProps = {
      data: visualizationData,
      steps: steps,
      isPlaying: isVisualizing,
      currentStep,
      totalSteps: steps.length,
      onStop: stopVisualization,
      onNext: nextStep,
      onPrev: prevStep
    };

    // Check if it's a sorting algorithm
    const sortingAlgorithms = ['bubble-sort', 'quick-sort', 'merge-sort', 'insertion-sort', 'selection-sort', 'heap-sort'];
    
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
                      ? 'bg-blue-800 text-white border-blue-800'
                      : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setHeapViewMode('array')}
                >
                  Array View
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                    heapViewMode === 'tree'
                      ? 'bg-blue-800 text-white border-blue-800'
                      : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setHeapViewMode('tree')}
                >
                  Tree View
                </button>
              </div>
            </div>
            {heapViewMode === 'array' ? (
              <SequentialSortingVisualizer {...visualizerProps} />
            ) : (
              <HeapTreeVisualizer {...visualizerProps} />
            )}
          </div>
        );
      }
      return <SequentialSortingVisualizer {...visualizerProps} />;
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
          return 5; // Comparing elements
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
        
      default:
        return -1;
    }
  };

  const currentLineToHighlight = getCurrentLineToHighlight();

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow flex flex-col">
        <div className="text-center py-4 bg-white border-b border-gray-200">
          <h1 className="text-3xl font-bold text-blue-800 mb-1">0Point Visualizer</h1>
          <p className="text-blue-800 text-base">Watch algorithms come to life with interactive visualizations</p>
        </div>
        
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-0" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Left Column - Input and Code */}
          <div className="bg-white border-r border-sky-200 flex flex-col h-full">
            <div className="p-6 overflow-y-auto flex-grow h-full">
              <h2 className="text-xl text-blue-800 mb-3">Algorithm & Input</h2>
              
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
                  <h3 className="text-lg text-blue-800 mb-2">Algorithm Code</h3>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm flex-grow">
                    {algorithmCodes[selectedAlgorithm]?.split('\n').map((line, index) => (
                      <div 
                        key={index} 
                        className={index === currentLineToHighlight ? 'bg-yellow-500 bg-opacity-30 p-1 rounded code-line-highlight' : ''}
                      >
                        <span className="text-gray-500 mr-4 select-none">{index + 1}</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Visualization */}
          <div className="bg-white flex flex-col h-full">
            <div className="p-6 overflow-y-auto flex-grow h-full">
              <h2 className="text-xl text-blue-800 mb-3">Visualization</h2>
              {renderVisualization()}
              
              {!selectedAlgorithm && (
                <div className="border border-gray-400 p-6 mt-6 bg-white">
                  <div className="flex flex-col md:flex-row items-center">
                    <div className="mb-4 md:mb-0 md:mr-6">
                      <div className="w-16 h-20 bg-white border border-gray-400 flex items-center justify-center">
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
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Visualizer;