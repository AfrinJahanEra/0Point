export const algorithms = [
  { 
    id: 'bubble-sort', 
    name: 'Bubble Sort', 
    description: 'Simple sorting algorithm that repeatedly steps through the list',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'start'
      });
      
      for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array.length - i - 1; j++) {
          steps.push({ 
            array: [...array], 
            comparing: [j, j + 1], 
            swapping: [], 
            sorted: Array.from({length: i}, (_, idx) => array.length - 1 - idx),
            operation: 'compare'
          });
          
          if (array[j] > array[j + 1]) {
            [array[j], array[j + 1]] = [array[j + 1], array[j]];
            steps.push({ 
              array: [...array], 
              comparing: [], 
              swapping: [j, j + 1], 
              sorted: Array.from({length: i}, (_, idx) => array.length - 1 - idx),
              operation: 'swap'
            });
          }
        }
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: i + 1}, (_, idx) => array.length - 1 - idx),
          operation: 'pass_complete'
        });
      }
      
      // Final sorted state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: Array.from({length: array.length}, (_, idx) => idx),
        operation: 'complete'
      });
      
      return steps;
    }
  },
  { 
    id: 'quick-sort', 
    name: 'Quick Sort', 
    description: 'Divide-and-conquer algorithm that picks an element as pivot and partitions the array around it',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'start'
      });
      
      const partitionSteps = (arr, low, high, depth = 0) => {
        if (low < high) {
          // Add current state
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [], 
            sorted: [],
            pivot: high,
            range: [low, high],
            operation: 'partition_start'
          });
          
          let pivotIndex = low - 1;
          const pivot = arr[high];
          
          for (let j = low; j < high; j++) {
            steps.push({ 
              array: [...arr], 
              comparing: [j, high], 
              swapping: [], 
              sorted: [],
              pivot: high,
              range: [low, high],
              operation: 'compare_pivot'
            });
            
            if (arr[j] < pivot) {
              pivotIndex++;
              [arr[pivotIndex], arr[j]] = [arr[j], arr[pivotIndex]];
              
              steps.push({ 
                array: [...arr], 
                comparing: [], 
                swapping: [pivotIndex, j], 
                sorted: [],
                pivot: high,
                range: [low, high],
                operation: 'swap'
              });
            }
          }
          
          pivotIndex++;
          [arr[pivotIndex], arr[high]] = [arr[high], arr[pivotIndex]];
          
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [pivotIndex, high], 
            sorted: [],
            pivot: pivotIndex,
            range: [low, high],
            operation: 'place_pivot'
          });
          
          partitionSteps(arr, low, pivotIndex - 1, depth + 1);
          partitionSteps(arr, pivotIndex + 1, high, depth + 1);
        } else if (low === high) {
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [], 
            sorted: [low],
            range: [low, high],
            operation: 'single_element_sorted'
          });
        }
      };
      
      partitionSteps(array, 0, array.length - 1);
      
      // Mark final sorted state
      if (steps.length > 0) {
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: array.length}, (_, i) => i),
          operation: 'complete'
        });
      }
      
      return steps;
    }
  },
  { 
    id: 'insertion-sort', 
    name: 'Insertion Sort', 
    description: 'Simple sorting algorithm that builds the final sorted array one item at a time',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [0],
        operation: 'start'
      });
      
      for (let i = 1; i < array.length; i++) {
        let key = array[i];
        let j = i - 1;
        
        steps.push({ 
          array: [...array], 
          comparing: [i], 
          swapping: [], 
          sorted: Array.from({length: i}, (_, idx) => idx),
          operation: 'select_key'
        });
        
        while (j >= 0 && array[j] > key) {
          steps.push({ 
            array: [...array], 
            comparing: [j, j+1], 
            swapping: [], 
            sorted: Array.from({length: i}, (_, idx) => idx),
            operation: 'compare_key'
          });
          
          array[j + 1] = array[j];
          
          steps.push({ 
            array: [...array], 
            comparing: [], 
            swapping: [j, j+1], 
            sorted: Array.from({length: i}, (_, idx) => idx),
            operation: 'shift_element'
          });
          
          j = j - 1;
        }
        array[j + 1] = key;
        
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: i+1}, (_, idx) => idx),
          operation: 'insert_key'
        });
      }
      
      // Final sorted state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: Array.from({length: array.length}, (_, idx) => idx),
        operation: 'complete'
      });
      
      return steps;
    }
  },
  { 
    id: 'selection-sort', 
    name: 'Selection Sort', 
    description: 'In-place comparison sorting algorithm that divides the input list into sorted and unsorted regions',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'start'
      });
      
      for (let i = 0; i < array.length - 1; i++) {
        let minIdx = i;
        
        steps.push({ 
          array: [...array], 
          comparing: [i], 
          swapping: [], 
          sorted: Array.from({length: i}, (_, idx) => idx),
          operation: 'select_min_candidate'
        });
        
        for (let j = i + 1; j < array.length; j++) {
          steps.push({ 
            array: [...array], 
            comparing: [minIdx, j], 
            swapping: [], 
            sorted: Array.from({length: i}, (_, idx) => idx),
            operation: 'compare_elements'
          });
          
          if (array[j] < array[minIdx]) {
            minIdx = j;
            steps.push({ 
              array: [...array], 
              comparing: [minIdx], 
              swapping: [], 
              sorted: Array.from({length: i}, (_, idx) => idx),
              operation: 'update_min'
            });
          }
        }
        
        if (minIdx !== i) {
          [array[i], array[minIdx]] = [array[minIdx], array[i]];
          
          steps.push({ 
            array: [...array], 
            comparing: [], 
            swapping: [i, minIdx], 
            sorted: Array.from({length: i}, (_, idx) => idx),
            operation: 'swap_min'
          });
        }
        
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: i+1}, (_, idx) => idx),
          operation: 'element_sorted'
        });
      }
      
      // Final sorted state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: Array.from({length: array.length}, (_, idx) => idx),
        operation: 'complete'
      });
      
      return steps;
    }
  },
  { 
    id: 'merge-sort', 
    name: 'Merge Sort', 
    description: 'Divide-and-conquer algorithm that divides the array into halves, sorts each half, and merges them back together',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'start'
      });
      
      // Improved merge sort implementation
      const mergeSort = (arr, start = 0, end = arr.length - 1, depth = 0) => {
        // Base case: single element is already sorted
        if (start >= end) {
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [], 
            sorted: [start],
            operation: 'single_element_sorted',
            range: [start, end]
          });
          return;
        }
        
        const mid = Math.floor((start + end) / 2);
        
        // Show division step
        steps.push({ 
          array: [...arr], 
          comparing: [], 
          swapping: [], 
          sorted: [],
          operation: 'divide',
          range: [start, end],
          mid: mid
        });
        
        // Recursively sort left half
        mergeSort(arr, start, mid, depth + 1);
        
        // Recursively sort right half
        mergeSort(arr, mid + 1, end, depth + 1);
        
        // Merge the sorted halves
        merge(arr, start, mid, end);
      };
      
      const merge = (arr, start, mid, end) => {
        // Show merge start
        steps.push({ 
          array: [...arr], 
          comparing: [], 
          swapping: [], 
          sorted: [],
          operation: 'merge_start',
          range: [start, end]
        });
        
        // Create temporary arrays for left and right subarrays
        const leftArray = arr.slice(start, mid + 1);
        const rightArray = arr.slice(mid + 1, end + 1);
        
        let i = 0, j = 0, k = start;
        
        // Merge the arrays back together
        while (i < leftArray.length && j < rightArray.length) {
          // Show comparison
          steps.push({ 
            array: [...arr], 
            comparing: [start + i, mid + 1 + j], 
            swapping: [], 
            sorted: [],
            operation: 'compare_merge',
            range: [start, end]
          });
          
          if (leftArray[i] <= rightArray[j]) {
            arr[k] = leftArray[i];
            i++;
          } else {
            arr[k] = rightArray[j];
            j++;
          }
          
          // Show placement
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [k], 
            sorted: [],
            operation: 'place_element',
            range: [start, end]
          });
          
          k++;
        }
        
        // Copy remaining elements from left array
        while (i < leftArray.length) {
          arr[k] = leftArray[i];
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [k], 
            sorted: [],
            operation: 'place_remaining',
            range: [start, end]
          });
          i++;
          k++;
        }
        
        // Copy remaining elements from right array
        while (j < rightArray.length) {
          arr[k] = rightArray[j];
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [k], 
            sorted: [],
            operation: 'place_remaining',
            range: [start, end]
          });
          j++;
          k++;
        }
        
        // Show merged result
        steps.push({ 
          array: [...arr], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: end - start + 1}, (_, idx) => start + idx),
          operation: 'merge_complete',
          range: [start, end]
        });
      };
      
      mergeSort(array);
      
      // Final sorted state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: Array.from({length: array.length}, (_, idx) => idx),
        operation: 'complete'
      });
      
      return steps;
    }
  },
  { 
    id: 'heap-sort', 
    name: 'Heap Sort', 
    description: 'Comparison-based sorting algorithm that uses binary heap data structure',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'start'
      });
      
      // Function to heapify a subtree rooted at index i
      const heapify = (arr, n, i) => {
        let largest = i; // Initialize largest as root
        const left = 2 * i + 1; // left child
        const right = 2 * i + 2; // right child
        
        // Show current node and children
        const indicesToShow = [i];
        if (left < n) indicesToShow.push(left);
        if (right < n) indicesToShow.push(right);
        
        steps.push({ 
          array: [...arr], 
          comparing: [], 
          swapping: [], 
          sorted: [],
          operation: 'heapify_start',
          range: indicesToShow,
          heapRoot: i
        });
        
        // If left child is larger than root
        if (left < n) {
          steps.push({ 
            array: [...arr], 
            comparing: [i, left], 
            swapping: [], 
            sorted: [],
            operation: 'compare_children',
            range: [i, left],
            heapRoot: i
          });
          
          if (arr[left] > arr[largest]) {
            largest = left;
          }
        }
        
        // If right child is larger than largest so far
        if (right < n) {
          steps.push({ 
            array: [...arr], 
            comparing: [largest, right], 
            swapping: [], 
            sorted: [],
            operation: 'compare_children',
            range: [largest, right],
            heapRoot: i
          });
          
          if (arr[right] > arr[largest]) {
            largest = right;
          }
        }
        
        // If largest is not root
        if (largest !== i) {
          // Show swap
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [i, largest], 
            sorted: [],
            operation: 'swap_heap',
            range: [i, largest],
            heapRoot: i
          });
          
          // Swap
          [arr[i], arr[largest]] = [arr[largest], arr[i]];
          
          // Show after swap
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [], 
            sorted: [],
            operation: 'after_swap',
            range: [i, largest],
            heapRoot: i
          });
          
          // Recursively heapify the affected sub-tree
          heapify(arr, n, largest);
        } else {
          // No swap needed
          steps.push({ 
            array: [...arr], 
            comparing: [], 
            swapping: [], 
            sorted: [],
            operation: 'no_swap_needed',
            range: indicesToShow,
            heapRoot: i
          });
        }
      };
      
      const n = array.length;
      
      // Build max heap (rearrange array)
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'build_heap_start'
      });
      
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(array, n, i);
      }
      
      // Show heap built
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: [],
        operation: 'heap_built'
      });
      
      // Extract elements from heap one by one
      for (let i = n - 1; i > 0; i--) {
        // Move current root to end
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [0, i], 
          sorted: Array.from({length: n - i - 1}, (_, idx) => n - 1 - idx),
          operation: 'extract_max',
          range: [0, i],
          heapSize: i
        });
        
        // Swap
        [array[0], array[i]] = [array[i], array[0]];
        
        // Show after extraction
        steps.push({ 
          array: [...array], 
          comparing: [], 
          swapping: [], 
          sorted: Array.from({length: n - i}, (_, idx) => n - 1 - idx),
          operation: 'after_extract',
          range: [0, i],
          heapSize: i
        });
        
        // Call heapify on the reduced heap
        heapify(array, i, 0);
      }
      
      // Final sorted state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        swapping: [], 
        sorted: Array.from({length: array.length}, (_, idx) => idx),
        operation: 'complete'
      });
      
      return steps;
    }
  },
  { 
    id: 'linear-search', 
    name: 'Linear Search', 
    description: 'Simple search algorithm that checks each element in sequence until the target is found',
    inputs: [
      { label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' },
      { label: 'Target Element', placeholder: 'Enter the number to search for, e.g., 8' }
    ],
    examples: [
      ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', '8'], 
      ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', '1']
    ],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      const target = data.target;
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        found: -1,
        currentIndex: -1,
        operation: 'start'
      });
      
      for (let i = 0; i < array.length; i++) {
        steps.push({ 
          array: [...array], 
          comparing: [i], 
          found: -1,
          currentIndex: i,
          operation: 'compare'
        });
        
        if (array[i] === target) {
          steps.push({ 
            array: [...array], 
            comparing: [i], 
            found: i,
            currentIndex: i,
            operation: 'found'
          });
          break;
        }
      }
      
      // If not found
      if (steps.length > 0 && steps[steps.length - 1].found === -1) {
        steps.push({ 
          array: [...array], 
          comparing: [], 
          found: -1,
          currentIndex: array.length - 1,
          operation: 'not_found'
        });
      }
      
      return steps;
    }
  },
  { 
    id: 'binary-search', 
    name: 'Binary Search', 
    description: 'Efficient search algorithm that works on sorted arrays by repeatedly dividing the search interval in half',
    inputs: [
      { label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 1,2,5,8,9' },
      { label: 'Target Element', placeholder: 'Enter the number to search for, e.g., 5' }
    ],
    examples: [
      ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', '5'], 
      ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15', '6']
    ],
    generateSteps: (data) => {
      const steps = [];
      const array = [...data.array];
      const target = data.target;
      
      // Add initial state
      steps.push({ 
        array: [...array], 
        comparing: [], 
        found: -1,
        low: 0,
        high: array.length - 1,
        mid: -1,
        operation: 'start'
      });
      
      let low = 0;
      let high = array.length - 1;
      let found = false;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        
        steps.push({ 
          array: [...array], 
          comparing: [mid], 
          found: -1,
          low: low,
          high: high,
          mid: mid,
          operation: 'compare'
        });
        
        if (array[mid] === target) {
          steps.push({ 
            array: [...array], 
            comparing: [mid], 
            found: mid,
            low: low,
            high: high,
            mid: mid,
            operation: 'found'
          });
          found = true;
          break;
        } else if (array[mid] < target) {
          steps.push({ 
            array: [...array], 
            comparing: [mid], 
            found: -1,
            low: mid + 1,
            high: high,
            mid: mid,
            operation: 'move_right'
          });
          low = mid + 1;
        } else {
          steps.push({ 
            array: [...array], 
            comparing: [mid], 
            found: -1,
            low: low,
            high: mid - 1,
            mid: mid,
            operation: 'move_left'
          });
          high = mid - 1;
        }
      }
      
      // If not found
      if (steps.length > 0 && !found) {
        steps.push({ 
          array: [...array], 
          comparing: [], 
          found: -1,
          low: low,
          high: high,
          mid: Math.floor((low + high) / 2),
          operation: 'not_found'
        });
      }
      
      return steps;
    }
  },
{ 
  id: 'bst', 
  name: 'Binary Search Tree', 
  description: 'A binary tree where each node has a value greater than all values in its left subtree and less than all values in its right subtree',
  inputs: [
    { label: 'Values to Insert', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }
  ],
  examples: [
    ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15'], 
    ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15']
  ],
  generateSteps: (data) => {
    const steps = [];
    const values = [...data.array];
    
    // Initialize empty tree
    steps.push({ 
      tree: null,
      operation: 'start',
      insertedValue: null,
      comparing: null,
      found: null,
      traversalPath: []
    });
    
    let tree = null;
    
    // Simple tree node structure
    const createNode = (value) => ({
      value: value,
      left: null,
      right: null
    });
    
    // Helper function to deep copy tree
    const deepCopyTree = (node) => {
      if (!node) return null;
      return {
        value: node.value,
        left: deepCopyTree(node.left),
        right: deepCopyTree(node.right)
      };
    };
    
    // Insert each value
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      
      if (tree === null) {
        tree = createNode(value);
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'insert_root',
          insertedValue: value,
          comparing: null,
          found: null,
          traversalPath: []
        });
      } else {
        // Insert into existing tree
        let current = tree;
        const traversalPath = [];
        let inserted = false;
        
        // Show start of insertion for this value
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'insert_start',
          insertedValue: value,
          comparing: null,
          found: null,
          traversalPath: []
        });
        
        // Find insertion point
        while (!inserted) {
          traversalPath.push(current.value);
          
          // Show traversal step
          steps.push({ 
            tree: deepCopyTree(tree),
            operation: 'traverse',
            insertedValue: value,
            comparing: current.value,
            found: null,
            traversalPath: [...traversalPath]
          });
          
          if (value < current.value) {
            if (current.left === null) {
              // Insert as left child
              current.left = createNode(value);
              steps.push({ 
                tree: deepCopyTree(tree),
                operation: 'insert',
                insertedValue: value,
                comparing: current.value,
                found: null,
                traversalPath: [...traversalPath, value]
              });
              inserted = true;
            } else {
              current = current.left;
            }
          } else if (value > current.value) {
            if (current.right === null) {
              // Insert as right child
              current.right = createNode(value);
              steps.push({ 
                tree: deepCopyTree(tree),
                operation: 'insert',
                insertedValue: value,
                comparing: current.value,
                found: null,
                traversalPath: [...traversalPath, value]
              });
              inserted = true;
            } else {
              current = current.right;
            }
          } else {
            // Value already exists, skip
            steps.push({ 
              tree: deepCopyTree(tree),
              operation: 'duplicate',
              insertedValue: value,
              comparing: current.value,
              found: null,
              traversalPath: [...traversalPath]
            });
            inserted = true;
          }
        }
        
        // Show the tree after insertion
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'after_insert',
          insertedValue: value,
          comparing: null,
          found: null,
          traversalPath: []
        });
      }
    }
    
    // Final state
    steps.push({ 
      tree: deepCopyTree(tree),
      operation: 'complete',
      insertedValue: null,
      comparing: null,
      found: null,
      traversalPath: []
    });
    
    return steps;
  }
},
  { 
  id: 'avl-tree', 
  name: 'AVL Tree', 
  description: 'A self-balancing binary search tree where the heights of the two child subtrees of any node differ by at most one',
  inputs: [
    { label: 'Values to Insert', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }
  ],
  examples: [
    ['5,2,8,1,9,3,7,4,6,10,11,12,13,14,15'], 
    ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15']
  ],
  generateSteps: (data) => {
    const steps = [];
    const values = [...data.array];
    
    // Initialize empty tree
    steps.push({ 
      tree: null,
      operation: 'start',
      insertedValue: null,
      comparing: null,
      found: null,
      rotation: null,
      traversalPath: []
    });
    
    let tree = null;
    
    // Simple AVL tree node structure
    const createNode = (value) => ({
      value: value,
      left: null,
      right: null,
      height: 1
    });
    
    // Get height of node
    const getHeight = (node) => node ? node.height : 0;
    
    // Get balance factor
    const getBalance = (node) => node ? getHeight(node.left) - getHeight(node.right) : 0;
    
    // Update height
    const updateHeight = (node) => {
      if (node) {
        node.height = Math.max(getHeight(node.left), getHeight(node.right)) + 1;
      }
    };
    
    // Right rotate
    const rightRotate = (y) => {
      const x = y.left;
      const T2 = x.right;
      
      // Perform rotation
      x.right = y;
      y.left = T2;
      
      // Update heights
      updateHeight(y);
      updateHeight(x);
      
      return x;
    };
    
    // Left rotate
    const leftRotate = (x) => {
      const y = x.right;
      const T2 = y.left;
      
      // Perform rotation
      y.left = x;
      x.right = T2;
      
      // Update heights
      updateHeight(x);
      updateHeight(y);
      
      return y;
    };
    
    // Insert node with proper step tracking - FIXED VERSION
    const insertNode = (node, value, traversalPath = []) => {
      // Standard BST insertion
      if (node === null) {
        return createNode(value);
      }
      
      // Add current traversal step
      const currentTraversalPath = [...traversalPath, node.value];
      
      // Show traversal step with complete tree
      steps.push({ 
        tree: deepCopyTree(tree), // Show the complete current tree
        operation: 'traverse',
        insertedValue: value,
        comparing: node.value,
        found: null,
        rotation: null,
        traversalPath: currentTraversalPath
      });
      
      if (value < node.value) {
        node.left = insertNode(node.left, value, currentTraversalPath);
      } else if (value > node.value) {
        node.right = insertNode(node.right, value, currentTraversalPath);
      } else {
        // Equal values not allowed
        return node;
      }
      
      // Update height of current node
      updateHeight(node);
      
      // Get balance factor
      const balance = getBalance(node);
      
      // If unbalanced, there are 4 cases
      
      // Left Left Case
      if (balance > 1 && value < node.left.value) {
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'rotate',
          insertedValue: value,
          comparing: node.value,
          found: null,
          rotation: 'right',
          traversalPath: currentTraversalPath
        });
        const newRoot = rightRotate(node);
        // Update the tree structure
        updateTreeStructure(tree, node, newRoot);
        return newRoot;
      }
      
      // Right Right Case
      if (balance < -1 && value > node.right.value) {
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'rotate',
          insertedValue: value,
          comparing: node.value,
          found: null,
          rotation: 'left',
          traversalPath: currentTraversalPath
        });
        const newRoot = leftRotate(node);
        // Update the tree structure
        updateTreeStructure(tree, node, newRoot);
        return newRoot;
      }
      
      // Left Right Case
      if (balance > 1 && value > node.left.value) {
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'rotate',
          insertedValue: value,
          comparing: node.value,
          found: null,
          rotation: 'leftright',
          traversalPath: currentTraversalPath
        });
        node.left = leftRotate(node.left);
        const newRoot = rightRotate(node);
        // Update the tree structure
        updateTreeStructure(tree, node, newRoot);
        return newRoot;
      }
      
      // Right Left Case
      if (balance < -1 && value < node.right.value) {
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'rotate',
          insertedValue: value,
          comparing: node.value,
          found: null,
          rotation: 'rightleft',
          traversalPath: currentTraversalPath
        });
        node.right = rightRotate(node.right);
        const newRoot = leftRotate(node);
        // Update the tree structure
        updateTreeStructure(tree, node, newRoot);
        return newRoot;
      }
      
      // Return unchanged node
      return node;
    };
    
    // Helper function to deep copy tree
    const deepCopyTree = (node) => {
      if (!node) return null;
      return {
        value: node.value,
        left: deepCopyTree(node.left),
        right: deepCopyTree(node.right),
        height: node.height
      };
    };
    
    // Helper function to update tree structure after rotation
    const updateTreeStructure = (root, oldNode, newNode) => {
      if (!root) return;
      
      if (root === oldNode) {
        // If we're replacing the root
        Object.assign(root, newNode);
        return;
      }
      
      if (root.left === oldNode) {
        root.left = newNode;
        return;
      }
      
      if (root.right === oldNode) {
        root.right = newNode;
        return;
      }
      
      updateTreeStructure(root.left, oldNode, newNode);
      updateTreeStructure(root.right, oldNode, newNode);
    };
    
    // Insert each value with proper step tracking
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      
      if (tree === null) {
        // First insertion - create root
        tree = createNode(value);
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'insert_root',
          insertedValue: value,
          comparing: null,
          found: null,
          rotation: null,
          traversalPath: []
        });
      } else {
        // Show start of insertion for this value
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'insert_start',
          insertedValue: value,
          comparing: null,
          found: null,
          rotation: null,
          traversalPath: []
        });
        
        // Use the recursive insert function which will generate all traversal steps
        tree = insertNode(tree, value, []);
        
        // Show the tree after insertion and balancing
        steps.push({ 
          tree: deepCopyTree(tree),
          operation: 'after_insert',
          insertedValue: value,
          comparing: null,
          found: null,
          rotation: null,
          traversalPath: []
        });
      }
    }
    
    // Final state
    steps.push({ 
      tree: deepCopyTree(tree),
      operation: 'complete',
      insertedValue: null,
      comparing: null,
      found: null,
      rotation: null,
      traversalPath: []
    });
    
    return steps;
  }
},
  { 
    id: 'trie', 
    name: 'Trie', 
    description: 'A tree-like data structure that stores strings in a way that allows for efficient retrieval',
    inputs: [
      { label: 'Words to Insert', placeholder: 'Enter words separated by commas, e.g., cat,dog,car' }
    ],
    examples: [
      ['cat,dog,car,bird,fish,elephant,giraffe,hippo,iguana,jaguar,kangaroo,lion,monkey,narwhal,octopus'], 
      ['apple,banana,cherry,date,elderberry,fig,grape,kiwi,lemon,mango,orange,peach,quince,raspberry,strawberry']
    ],
    generateSteps: (data) => {
      const steps = [];
      const words = [...data.array].map(String);
      
      // Initialize empty trie
      steps.push({ 
        tree: null,
        operation: 'start',
        insertedWord: null,
        currentChar: null,
        path: []
      });
      
      let tree = { children: {}, isEnd: false };
      
      // Insert each word
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let current = tree;
        
        steps.push({ 
          tree: JSON.parse(JSON.stringify(tree)),
          operation: 'insert_start',
          insertedWord: word,
          currentChar: null,
          path: []
        });
        
        // Insert each character
        for (let j = 0; j < word.length; j++) {
          const char = word[j];
          
          if (!current.children[char]) {
            current.children[char] = { children: {}, isEnd: false };
            steps.push({ 
              tree: JSON.parse(JSON.stringify(tree)),
              operation: 'create_node',
              insertedWord: word,
              currentChar: char,
              path: word.substring(0, j + 1)
            });
          }
          
          current = current.children[char];
          
          steps.push({ 
            tree: JSON.parse(JSON.stringify(tree)),
            operation: 'traverse',
            insertedWord: word,
            currentChar: char,
            path: word.substring(0, j + 1)
          });
        }
        
        // Mark end of word
        current.isEnd = true;
        
        steps.push({ 
          tree: JSON.parse(JSON.stringify(tree)),
          operation: 'mark_end',
          insertedWord: word,
          currentChar: word[word.length - 1],
          path: word
        });
      }
      
      // Final state
      steps.push({ 
        tree: JSON.parse(JSON.stringify(tree)),
        operation: 'complete',
        insertedWord: null,
        currentChar: null,
        path: []
      });
      
      return steps;
    }
  }
];