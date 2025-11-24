export const algorithms = [
  { 
    id: 'bubble-sort', 
    name: 'Bubble Sort', 
    description: 'Simple sorting algorithm that repeatedly steps through the list',
    inputs: [{ label: 'Array Elements', placeholder: 'Enter numbers separated by commas, e.g., 5,2,8,1,9' }],
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
    examples: ['5,2,8,1,9', '3,7,1,4,6'],
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
  }
];