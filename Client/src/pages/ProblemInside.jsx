// ProblemInside.jsx
import React, { useState } from 'react';
import { Clipboard } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { 
  Menu,
  Play,
  Download,
  Clock,
  Calendar,
  Code2,
  FileText,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  HelpCircle,
  Trophy
} from 'lucide-react';

const ProblemInside = () => {
  const { problemCode } = useParams();
  const [code, setCode] = useState(`#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    
    // Your solution here
    for (int iter = 0; iter < k; iter++) {
        for (int i = 1; i < n; i++) {
            if (arr[i] > arr[i-1]) {
                arr[i] *= 2;
            } else {
                arr[i] /= 2;
            }
        }
    }
    
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    return 0;
}`);
  const [language, setLanguage] = useState('cpp');
  const [activeTab, setActiveTab] = useState('problem');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const problem = {
    code: 'ARRTRN',
    title: 'Array Transformation',
    timeLimit: '1 sec',
    memoryLimit: '256 MB',
    points: 100,
    solved: 245,
    accuracy: '75.2%'
  };

  const problems = [
    { id: 'A', code: 'ARRTRN', title: 'Array Transformation', status: 'solved' },
    { id: 'B', code: 'BSTREE', title: 'Binary Search Tree', status: 'solved' },
    { id: 'C', code: 'CYCDET', title: 'Cycle Detection', status: 'attempted' },
    { id: 'D', code: 'DYNPTH', title: 'Dynamic Programming', status: 'unsolved' },
    { id: 'E', code: 'EULERP', title: 'Eulerian Path', status: 'unsolved' },
    { id: 'F', code: 'FFTTRN', title: 'Fast Fourier Transform', status: 'unsolved' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'attempted': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IUT Winter Coding Challenge</h1>
                <p className="text-sm text-gray-600">Problem {problem.code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Time Remaining</div>
                <div className="font-mono font-bold text-lg">02:45:18</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Collapsible Sidebar */}
        <div className={`
          bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          h-[calc(100vh-4rem)] overflow-y-auto
          ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}
        `}>
          <div className="p-6 space-y-6">
            {/* Problems List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Problems</h3>
              <div className="space-y-2">
                {problems.map((p) => (
                  <Link
                    key={p.id}
                    to={`/problem/${p.code}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                      p.code === problem.code
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {getStatusIcon(p.status)}
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                      p.status === 'solved' ? 'bg-green-100 text-green-800' :
                      p.status === 'attempted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-xs text-gray-500">{p.code}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Contest Navigation */}
            <div className="space-y-1">
              {[
                { icon: <Code2 className="w-4 h-4" />, label: 'My Submissions' },
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Discussions' },
                { icon: <HelpCircle className="w-4 h-4" />, label: 'Q&A Forum' },
                { icon: <Trophy className="w-4 h-4" />, label: 'Leaderboard' }
              ].map((item, index) => (
                <button
                  key={index}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  {item.icon}
                  <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Problem Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Problem Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-medium text-gray-900">{problem.points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Solved By:</span>
                  <span className="font-medium text-green-600">{problem.solved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium text-gray-900">{problem.accuracy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - CodeChef Style Problem Page */}
        <div className="flex-1 min-w-0">
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Problem Statement - Left Side */}
            <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-6">
                {/* Problem Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{problem.code} - {problem.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Time Limit: {problem.timeLimit}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Memory Limit: {problem.memoryLimit}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex space-x-8">
                    {['problem', 'submissions', 'Q&A'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab === 'problem' && <FileText className="w-4 h-4 inline mr-2" />}
                        {tab === 'submissions' && <Code2 className="w-4 h-4 inline mr-2" />}
                        {tab === 'Q&A' && <MessageSquare className="w-4 h-4 inline mr-2" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Problem Statement Content */}
                <div className="prose prose-sm max-w-none">
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Problem Statement</h2>
                    <p className="text-gray-700 mb-4">
                      You are given an array of integers. Your task is to transform the array according to the following rules:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                      <li>For each element at position i, if it is greater than the element at position i-1, double its value.</li>
                      <li>If it is less than the element at position i-1, halve its value (rounding down).</li>
                      <li>The first element remains unchanged.</li>
                    </ol>
                    <p className="text-gray-700">
                      Write a function that performs this transformation for k iterations.
                    </p>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Input Format</h3>
                    <div className="bg-gray-800 text-gray-100 p-4 rounded font-mono text-sm">
                      The first line contains two integers n and k (1 ≤ n ≤ 1000, 1 ≤ k ≤ 10).<br />
                      The second line contains n integers representing the array.
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Output Format</h3>
                    <div className="bg-gray-800 text-gray-100 p-4 rounded font-mono text-sm">
                      Print the transformed array after k iterations.
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Constraints</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>1 ≤ n ≤ 1000</li>
                      <li>1 ≤ k ≤ 10</li>
                      <li>0 ≤ array elements ≤ 10^6</li>
                    </ul>
                  </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-gray-900">Sample Input</h4>
      <button 
        onClick={() => navigator.clipboard.writeText('5 2\n1 3 2 5 4')}
        className="text-gray-500 hover:text-gray-700 transition-colors" 
        title="Copy"
      >
        <Clipboard className="w-4 h-4" />
      </button>
    </div>
    <pre className="bg-gray-800 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto whitespace-pre">
      {`5 2
1 3 2 5 4`}
    </pre>
  </div>
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-gray-900">Sample Output</h4>
      <button 
        onClick={() => navigator.clipboard.writeText('1 6 1 10 2')}
        className="text-gray-500 hover:text-gray-700 transition-colors" 
        title="Copy"
      >
        <Clipboard className="w-4 h-4" />
      </button>
    </div>
    <pre className="bg-gray-800 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto whitespace-pre">
      {`1 6 1 10 2`}
    </pre>
  </div>
</div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
                    <p className="text-blue-800 text-sm">
                      For the first sample: Initial array: [1, 3, 2, 5, 4]<br />
                      After 1st iteration: [1, 6, 1, 10, 2] (3&gt;1 so 3*2=6, 2&lt;6 so 2/2=1, 5&gt;1 so 5*2=10, 4&lt;10 so 4/2=2)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Editor - Right Side */}
            <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
              {/* Editor Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cpp">C++ 17</option>
                      <option value="java">Java</option>
                      <option value="python">Python 3</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors relative group"
                      title="Download Code"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        Download Code
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 bg-gray-900">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full font-mono text-sm text-gray-100 bg-gray-900 p-4 resize-none focus:outline-none"
                  spellCheck="false"
                />
              </div>

              {/* Editor Footer */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Language: {language === 'cpp' ? 'C++' : language}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Run
                    </button>
                    <button className="px-6 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemInside;