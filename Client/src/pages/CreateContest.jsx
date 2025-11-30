import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Trophy,
  Calendar,
  Clock,
  Users,
  Settings,
  FileText,
  Plus,
  Trash2,
  Save,
  Eye,
  Check,
  Tag,
  Image,
  TestTube,
  GraduationCap,
  Sliders
} from 'lucide-react';

const CreateContest = () => {
  const navigate = useNavigate();
  const [activeProblem, setActiveProblem] = useState('A');
  const [contestData, setContestData] = useState({
    title: 'IUT Winter Coding Challenge',
    description: 'A competitive programming contest with problems of varying difficulty levels for IUT students.',
    startTime: '2023-12-15T18:00',
    duration: 3,
    type: 'individual',
    platform: 'IUT'
  });

  const [problems, setProblems] = useState([
    {
      id: 'A',
      title: 'Array Transformation',
      statement: `You are given an array of integers. Your task is to transform the array according to the following rules:

1. For each element at position i, if it is greater than the element at position i-1, double its value.
2. If it is less than the element at position i-1, halve its value (rounding down).
3. The first element remains unchanged.

Write a function that performs this transformation for k iterations.

**Input**
- The first line contains two integers n and k (1 ≤ n ≤ 1000, 1 ≤ k ≤ 10)
- The second line contains n integers representing the array

**Output**
- Print the transformed array after k iterations

**Example**
Input:
5 2
1 3 2 5 4

Output:
1 6 1 10 2`,
      testCases: [
        {
          id: 1,
          input: '5 2\n1 3 2 5 4',
          output: '1 6 1 10 2'
        },
        {
          id: 2,
          input: '3 1\n4 2 8',
          output: '4 1 16'
        }
      ],
      timeLimit: 2,
      memoryLimit: 256,
      tags: ['Arrays', 'Simulation', 'Easy'],
      tutorial: `This problem can be solved by directly simulating the process for k iterations.

Approach:
1. Read the input values n, k and the array
2. For k iterations:
   - Create a new array for the next iteration
   - For each element (except the first), apply the transformation rules
   - Update the array for the next iteration
3. Print the final array

Time Complexity: O(n*k)
Space Complexity: O(n)`
    },
    {
      id: 'B',
      title: 'Binary Search Tree',
      statement: 'Problem statement for Binary Search Tree...',
      testCases: [],
      timeLimit: 2,
      memoryLimit: 256,
      tags: ['Trees', 'BST'],
      tutorial: ''
    }
  ]);

  const [newTag, setNewTag] = useState('');

  const handleContestChange = (field, value) => {
    setContestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProblemChange = (problemId, field, value) => {
    setProblems(prev => prev.map(problem => 
      problem.id === problemId ? { ...problem, [field]: value } : problem
    ));
  };

  const addProblem = () => {
    const newId = String.fromCharCode(65 + problems.length);
    setProblems(prev => [...prev, {
      id: newId,
      title: `Problem ${newId}`,
      statement: '',
      testCases: [],
      timeLimit: 2,
      memoryLimit: 256,
      tags: [],
      tutorial: ''
    }]);
    setActiveProblem(newId);
  };

  const addTestCase = (problemId) => {
    const newTestCase = {
      id: Date.now(),
      input: '',
      output: ''
    };
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, testCases: [...problem.testCases, newTestCase] }
        : problem
    ));
  };

  const removeTestCase = (problemId, testCaseId) => {
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, testCases: problem.testCases.filter(tc => tc.id !== testCaseId) }
        : problem
    ));
  };

  const addTag = (problemId) => {
    if (newTag.trim()) {
      setProblems(prev => prev.map(problem => 
        problem.id === problemId 
          ? { ...problem, tags: [...problem.tags, newTag.trim()] }
          : problem
      ));
      setNewTag('');
    }
  };

  const removeTag = (problemId, tagIndex) => {
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, tags: problem.tags.filter((_, index) => index !== tagIndex) }
        : problem
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle contest creation logic here
    console.log('Creating contest:', { contestData, problems });
    // Navigate to contests page or show success message
    navigate('/contests');
  };

  const currentProblem = problems.find(p => p.id === activeProblem);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/contests" 
            className="inline-flex items-center gap-2 text-blue-800 hover:text-blue-900 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contests
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Contest</h1>
          <p className="text-gray-600 mt-2">
            Set up your coding contest with problems, test cases, and configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Problems List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Problems</h3>
              </div>
              <div className="p-2">
                {problems.map(problem => (
                  <button
                    key={problem.id}
                    onClick={() => setActiveProblem(problem.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors duration-200 ${
                      activeProblem === problem.id
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      activeProblem === problem.id
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {problem.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {problem.title}
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={addProblem}
                  className="w-full flex items-center gap-2 p-3 text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-medium">Add Problem</span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <button className="w-full bg-blue-800 text-white py-2 rounded text-xs font-semibold hover:bg-blue-900 transition-colors duration-200 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Contest Settings */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Contest Settings</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Contest Name
                      </label>
                      <input
                        type="text"
                        value={contestData.title}
                        onChange={(e) => handleContestChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter contest name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={contestData.description}
                        onChange={(e) => handleContestChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the contest..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          value={contestData.startTime}
                          onChange={(e) => handleContestChange('startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Duration (hours)
                        </label>
                        <input
                          type="number"
                          value={contestData.duration}
                          onChange={(e) => handleContestChange('duration', e.target.value)}
                          min="0.5"
                          step="0.5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Participation Type
                        </label>
                        <select
                          value={contestData.type}
                          onChange={(e) => handleContestChange('type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="individual">Individual</option>
                          <option value="team">Team</option>
                          <option value="both">Both Individual & Team</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Platform
                        </label>
                        <select
                          value={contestData.platform}
                          onChange={(e) => handleContestChange('platform', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="IUT">IUT Platform</option>
                          <option value="codeforces">Codeforces</option>
                          <option value="codechef">CodeChef</option>
                          <option value="atcoder">AtCoder</option>
                          <option value="hackerrank">HackerRank</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Problem Editor */}
                {currentProblem && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Problem {currentProblem.id} - {currentProblem.title}
                      </h2>
                      <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Saved
                      </span>
                    </div>

                    <div className="space-y-6">
                      {/* Problem Statement */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-gray-700" />
                          <h3 className="font-semibold text-gray-900">Problem Statement</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Problem Title
                            </label>
                            <input
                              type="text"
                              value={currentProblem.title}
                              onChange={(e) => handleProblemChange(currentProblem.id, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Problem Statement
                            </label>
                            <textarea
                              value={currentProblem.statement}
                              onChange={(e) => handleProblemChange(currentProblem.id, 'statement', e.target.value)}
                              rows={12}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Test Cases */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TestTube className="w-4 h-4 text-gray-700" />
                          <h3 className="font-semibold text-gray-900">Test Cases</h3>
                        </div>
                        <div className="space-y-4">
                          {currentProblem.testCases.map(testCase => (
                            <div key={testCase.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-gray-900">Test Case</h4>
                                <button
                                  type="button"
                                  onClick={() => removeTestCase(currentProblem.id, testCase.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Input
                                  </label>
                                  <textarea
                                    value={testCase.input}
                                    onChange={(e) => {
                                      const updatedTestCases = currentProblem.testCases.map(tc =>
                                        tc.id === testCase.id ? { ...tc, input: e.target.value } : tc
                                      );
                                      handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                                    }}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Expected Output
                                  </label>
                                  <textarea
                                    value={testCase.output}
                                    onChange={(e) => {
                                      const updatedTestCases = currentProblem.testCases.map(tc =>
                                        tc.id === testCase.id ? { ...tc, output: e.target.value } : tc
                                      );
                                      handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                                    }}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addTestCase(currentProblem.id)}
                            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-colors duration-200 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Test Case
                          </button>
                        </div>
                      </div>

                      {/* Constraints */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Sliders className="w-4 h-4 text-gray-700" />
                          <h3 className="font-semibold text-gray-900">Constraints & Limits</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Time Limit (seconds)
                            </label>
                            <input
                              type="number"
                              value={currentProblem.timeLimit}
                              onChange={(e) => handleProblemChange(currentProblem.id, 'timeLimit', e.target.value)}
                              min="0.1"
                              step="0.1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Memory Limit (MB)
                            </label>
                            <input
                              type="number"
                              value={currentProblem.memoryLimit}
                              onChange={(e) => handleProblemChange(currentProblem.id, 'memoryLimit', e.target.value)}
                              min="16"
                              step="16"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="w-4 h-4 text-gray-700" />
                          <h3 className="font-semibold text-gray-900">Problem Tags</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {currentProblem.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(currentProblem.id, index)}
                                className="hover:text-blue-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add a tag..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => addTag(currentProblem.id)}
                            className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/contests')}
                      className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold"
                    >
                      Cancel
                    </button>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200 font-semibold flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContest;