import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  GraduationCap,
  Eye,
  Check,
  X,
  Code2,
  FileText,
  BookOpen,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

// Mock data - you'll get this from props or context in real app
const PROBLEMS = [
  { id: 'A', code: 'ARRTRN', title: 'Array Transformation', difficulty: 'Easy', hasTutorial: true },
  { id: 'B', code: 'BSTREE', title: 'Binary Search Tree', difficulty: 'Medium', hasTutorial: false },
  { id: 'C', code: 'CYCDET', title: 'Cycle Detection', difficulty: 'Hard', hasTutorial: false },
  { id: 'D', code: 'DYNPTH', title: 'Dynamic Path', difficulty: 'Medium', hasTutorial: false },
];

const AddTutorial = () => {
  const navigate = useNavigate();
  const [isProblemDropdownOpen, setIsProblemDropdownOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(PROBLEMS[0]);
  const [tutorialContent, setTutorialContent] = useState(`# Array Transformation - Solution Guide

## Problem Overview
Given an array of integers, transform it for k iterations according to specific rules.

## Key Observations
1. Each element's transformation depends only on its previous element
2. The first element always remains unchanged
3. We need to perform exactly k iterations

## Approach
### Brute Force Simulation
The simplest approach is to simulate the process exactly as described:

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> arr(n);
    
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    
    // Perform k iterations
    for (int iter = 0; iter < k; iter++) {
        for (int i = 1; i < n; i++) {
            if (arr[i] > arr[i-1]) {
                arr[i] *= 2;      // Double if greater
            } else {
                arr[i] /= 2;      // Halve if smaller (integer division)
            }
        }
    }
    
    // Output result
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    return 0;
}
\`\`\`

## Complexity Analysis
- **Time Complexity:** O(n × k) - For each of k iterations, we process n elements
- **Space Complexity:** O(n) - We store the array

## Step-by-Step Walkthrough
Let's trace through the example: \`n=5, k=2, arr=[1, 3, 2, 5, 4]\`

### Iteration 1:
- Index 1: 3 > 1 → 3 × 2 = 6
- Index 2: 2 < 6 → 2 ÷ 2 = 1
- Index 3: 5 > 1 → 5 × 2 = 10
- Index 4: 4 < 10 → 4 ÷ 2 = 2
**Result:** [1, 6, 1, 10, 2]

### Iteration 2:
- Index 1: 6 > 1 → 6 × 2 = 12
- Index 2: 1 < 12 → 1 ÷ 2 = 0
- Index 3: 10 > 0 → 10 × 2 = 20
- Index 4: 2 < 20 → 2 ÷ 2 = 1
**Final Result:** [1, 12, 0, 20, 1]

## Edge Cases to Consider
1. **Single element array:** Returns unchanged
2. **k = 0:** Returns original array
3. **All equal elements:** All elements (except first) will be halved each iteration
4. **Large values:** Watch for integer overflow when doubling
5. **Negative numbers:** Problem states integers, but constraints might restrict to non-negative

## Optimization Tips
1. **In-place modification:** We can modify the array in-place
2. **Early termination:** If array becomes stable (no changes), we can stop early
3. **Pattern recognition:** For large k, look for cycles in transformations

## Related Problems
- Array Rotation
- Array Sum Transformations
- Prefix Sum Problems`);

  const handleProblemSelect = (problem) => {
    setSelectedProblem(problem);
    setIsProblemDropdownOpen(false);
    
    // Here you would load existing tutorial for this problem if available
    // For now, we just set a placeholder
    if (problem.hasTutorial) {
      setTutorialContent(`# Editing existing tutorial for ${problem.title}\n\nCurrent tutorial content...`);
    } else {
      setTutorialContent(`# New Tutorial: ${problem.title}\n\nWrite your solution guide here...`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Saving tutorial for:', selectedProblem);
    console.log('Content:', tutorialContent);
    // Save logic here
    navigate('/contests/create');
  };

  const handlePreview = () => {
    // Open preview in new tab or modal
    console.log('Preview tutorial');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-blue-800" />
                </div>
              </div>
              
              {/* Problem Selector */}
              <div className="mt-4 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Problem for Tutorial
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProblemDropdownOpen(!isProblemDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                        selectedProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        selectedProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedProblem.id}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{selectedProblem.title}</div>
                        <div className="text-xs text-gray-500">{selectedProblem.code} • {selectedProblem.difficulty}</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isProblemDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isProblemDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {PROBLEMS.map((problem) => (
                        <button
                          key={problem.id}
                          type="button"
                          onClick={() => handleProblemSelect(problem)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            selectedProblem.id === problem.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                            problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                            problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {problem.id}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{problem.title}</div>
                            <div className="text-xs text-gray-500">{problem.code} • {problem.difficulty}</div>
                          </div>
                          {problem.hasTutorial && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              Has Tutorial
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProblem.hasTutorial && (
                  <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                    
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Editor */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Editor Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-900">Tutorial Content</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {tutorialContent.length} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="p-1">
              <div className="relative">
                <textarea
                  value={tutorialContent}
                  onChange={(e) => setTutorialContent(e.target.value)}
                  rows={25}
                  className="w-full px-4 py-3 border-0 focus:ring-0 font-mono text-sm text-gray-900 resize-none focus:outline-none"
                  placeholder="# Write your tutorial here using Markdown...

## Problem Approach
Describe the solution approach...

## Code Example
\`\`\`cpp
// Your code here
\`\`\`

## Complexity Analysis
- Time: O(n)
- Space: O(1)"
                />
                {/* Line numbers - hidden on mobile */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-50 border-r border-gray-200 hidden md:block">
                  <div className="font-mono text-xs text-gray-400 text-right pr-2 py-3">
                    {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
                      <div key={num} className="h-6 leading-6">{num}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Auto-save enabled
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span>Markdown supported</span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold text-sm flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200 font-semibold text-sm flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Tutorial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddTutorial;