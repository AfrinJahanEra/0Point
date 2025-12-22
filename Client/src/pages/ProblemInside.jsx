import React, { useState, useEffect } from 'react';
import { Clipboard } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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
  Trophy,
  Loader2,
  Users
} from 'lucide-react';
import axios from 'axios';

const ProblemInside = () => {
  const { contestId, problemIndex } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contestData, setContestData] = useState(null);
  const [problemData, setProblemData] = useState(null);
  const [problemsList, setProblemsList] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState(`#include <bits/stdc++.h>
using namespace std;

int main() {
    // Your code here
    return 0;
}`);
  const [language, setLanguage] = useState('cpp');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    return () => {
      if (footer) footer.style.display = "block";
    };
  }, []);

  // Helper function to calculate time remaining
  const calculateTimeRemaining = (contest) => {
    if (!contest?.start_time || contest?.status !== 'live') {
      return 0;
    }
    
    try {
      const startTime = new Date(contest.start_time);
      const durationMinutes = contest.duration_minutes || 
                             (contest.duration ? contest.duration * 60 : 0);
      
      if (durationMinutes <= 0) return 0;
      
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      const now = new Date();
      
      if (now >= startTime && now <= endTime) {
        return Math.floor((endTime - now) / 1000);
      } else if (now > endTime) {
        return 0;
      }
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return 0;
    }
    
    return 0;
  };

  // Hide footer only in ProblemInside page
  useEffect(() => {
    const fetchAllData = async () => {
      if (!contestId) {
        setLoading(false);
        return;
      }

      console.log('Fetching data for contest:', contestId, 'problem:', problemIndex);
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch contest problems list
        console.log('Fetching contest problems...');
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        console.log('Problems API Response:', problemsRes.data);
        
        // Check if we got a successful response
        if (problemsRes.data) {
          // IMPORTANT: Only set contestData if we actually have contest data
          if (problemsRes.data.contest_info) {
            setContestData(problemsRes.data.contest_info);
          } else if (problemsRes.data.contest) {
            setContestData(problemsRes.data.contest);
          } else {
            // If no contest data in the response, keep it null
            setContestData(null);
          }
          setProblemsList(problemsRes.data.problems || []);
        }
        
        // 2. Determine which problem to fetch
        let problemToFetch = problemIndex;
        
        // If no problemIndex specified, use the first problem
        if (!problemToFetch && problemsRes.data?.problems?.length > 0) {
          const firstProblem = problemsRes.data.problems[0];
          problemToFetch = firstProblem.problem_id || firstProblem.code || firstProblem.index;
          console.log('No problem index specified, using first problem:', problemToFetch);
          
          // Navigate to the first problem
          navigate(`/contests/${contestId}/problems/${problemToFetch}`, { replace: true });
          return;
        }
        
        // 3. Fetch specific problem data
        if (problemToFetch) {
          console.log('Fetching specific problem:', problemToFetch);
          try {
            const problemRes = await axios.get(
              `http://localhost:8000/contests/${contestId}/problems/${problemToFetch}/`,
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            if (problemRes.data) {
              console.log('Problem data response:', problemRes.data);
              console.log('Contest status from problem response:', problemRes.data.contest_status);
              setProblemData(problemRes.data);
              
              // If we don't have contestData yet, use data from problem response
              if (!contestData && problemRes.data.contest_title) {
                setContestData({
                  status: problemRes.data.contest_status,
                  title: problemRes.data.contest_title,
                  platform: 'Custom Platform',
                  type: 'individual'
                });
              }
            } else {
              console.error('No problem data in response');
            }
          } catch (problemError) {
            console.error('Error fetching specific problem:', problemError);
            
            // Check if we have problems list to fall back to
            if (problemsRes.data?.problems?.length > 0) {
              // Show the first problem instead
              const firstProblem = problemsRes.data.problems[0];
              const firstIndex = firstProblem.problem_id || firstProblem.code || firstProblem.index;
              navigate(`/contests/${contestId}/problems/${firstIndex}`);
            }
          }
        }
        
        // Calculate initial time remaining from API response data
        const contestInfo = problemsRes.data?.contest_info || problemsRes.data?.contest;
        if (contestInfo) {
          const remaining = calculateTimeRemaining(contestInfo);
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setIsTimerActive(true);
            console.log('⏰ Timer started:', remaining, 'seconds remaining');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching contest data:', error);
        setError(error.response?.data?.error || 'Failed to load contest');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [contestId, problemIndex, navigate]);

  // Dynamic countdown timer effect
  useEffect(() => {
    let intervalId;
    
    if (isTimerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setIsTimerActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerActive, timeRemaining]);

  // Update timer when contestData changes
  useEffect(() => {
    if (contestData?.start_time && contestData?.status === 'live') {
      try {
        const remaining = calculateTimeRemaining(contestData);
        if (remaining > 0 && remaining !== timeRemaining) {
          setTimeRemaining(remaining);
          setIsTimerActive(true);
        }
      } catch (timeError) {
        console.error('Error updating timer from contestData:', timeError);
      }
    }
  }, [contestData]);

  // Format time for display
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (problemIdentifier) => {
    const status = userStatus[problemIdentifier]?.status || 'unsolved';
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'attempted': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusClass = (problemIdentifier) => {
    const status = userStatus[problemIdentifier]?.status || 'unsolved';
    switch (status) {
      case 'solved': return 'bg-green-100 text-green-800';
      case 'attempted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Handle code submission
  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting.');
      return;
    }

    try {
      const submissionData = {
        contest_id: contestId,
        problem_index: problemData?.problem_index || problemIndex,
        language: language,
        code: code
      };

      alert('Submission endpoint not implemented yet.');
    } catch (error) {
      console.error('Submission error:', error);
      alert(error.response?.data?.error || 'Submission failed');
    }
  };

  // Handle Run test
  const handleRun = async () => {
    if (!code.trim()) {
      alert('Please write some code before running.');
      return;
    }

    try {
      alert('Run endpoint not implemented yet.');
    } catch (error) {
      console.error('Run error:', error);
      alert(error.response?.data?.error || 'Run failed');
    }
  };

  // Format problem difficulty
  const formatDifficulty = (difficulty) => {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading problem...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/contests')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Contests
          </button>
        </div>
      </div>
    );
  }

  // If no problem data loaded (but we have problems list)
  if (!problemData && problemsList.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading problem data...</p>
        </div>
      </div>
    );
  }

  // If no problems in contest
  if (problemsList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/contests')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {contestData?.title || problemData?.contest_title || 'Contest'}
                  </h1>
                  <p className="text-xs text-gray-600">{contestData?.platform || 'Custom Platform'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-10">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Problems Available</h3>
            <p className="text-gray-600 mb-4">This contest doesn't have any problems yet.</p>
            <button
              onClick={() => navigate('/contests')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback data if contestData is missing
  const displayContestData = contestData || {
    title: problemData?.contest_title || 'Contest',
    platform: 'Custom Platform',
    status: 'live',
    type: 'individual'
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
                <h1 className="text-xl font-bold text-gray-900">{displayContestData.title}</h1>

<div className="flex items-center space-x-3 text-xs text-gray-600">
  <span className="flex items-center space-x-1">
    <Users className="w-3 h-3" />
    <span>{problemData?.contest_platform || displayContestData?.platform || 'Custom Platform'}</span>
  </span>
  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
    {problemData?.contest_type === 'team' ? 'Team' : 'Individual'}
  </span>
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
    displayContestData?.status === 'live' ? 'bg-red-100 text-red-800' :
    displayContestData?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
    displayContestData?.status === 'past' ? 'bg-green-100 text-green-800' :
    'bg-gray-100 text-gray-800'
  }`}>
    {displayContestData?.status?.charAt(0).toUpperCase() + displayContestData?.status?.slice(1)}
  </span>
</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {displayContestData.status === 'live' && timeRemaining > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    Time Remaining
                  </div>
                  <div className="font-mono font-bold text-lg text-red-600 animate-pulse">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Collapsible Sidebar */}
        <div className={`
          bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          h-[calc(100vh-4rem)] overflow-y-auto sticky top-16
          ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}
        `}>
          <div className="p-6 space-y-6">
            {/* Problems List */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Problems ({problemsList.length})
              </h3>
              <div className="space-y-2">
                {problemsList.map((problem) => {
                  const problemId = problem.problem_id || problem.code || problem.index;
                  const isActive = problemId === (problemData?.problem_index || problemIndex);
                  
                  return (
                    <Link
                      key={problemId}
                      to={`/contests/${contestId}/problems/${problemId}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {getStatusIcon(problemId)}
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getStatusClass(problemId)}`}>
                        {problemId}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{problem.title}</div>
                        <div className="text-xs text-gray-500">{formatDifficulty(problem.difficulty)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Contest Navigation */}
            <div className="space-y-1">
              <Link
                to={`/contests/${contestId}/submissions`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Code2 className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">My Submissions</span>
              </Link>
              
              <Link
                to={`/contests/${contestId}/discussion`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Discussions</span>
              </Link>
              
              <Link
                to={`/contests/${contestId}/clarifications`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Clarification</span>
              </Link>
              
              <Link
                to={`/contests/${contestId}/leaderboard`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Leaderboard</span>
              </Link>
              {displayContestData.status === 'past' && (
                <Link
                  to={`/contests/${contestId}/editorial`}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-900">Editorial</span>
                </Link>
              )}
            </div>

            {/* Problem Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Problem Stats</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-medium text-gray-900">{problemData?.points || 100}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Solved By:</span>
                  <span className="font-medium text-green-600">{problemData?.solved_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium text-gray-900">{problemData?.accuracy || '0%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attempts:</span>
                  <span className="font-medium text-yellow-600">{problemData?.attempted_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Problem Statement - Left Side */}
            <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-6">
                {/* Problem Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {problemData?.problem_index || problemIndex} - {problemData?.title || 'Problem'}
                    </h1>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Time Limit: {problemData?.time_limit || 1} sec</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Memory Limit: {problemData?.memory_limit || 256} MB</span>
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {formatDifficulty(problemData?.difficulty)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Statement Content */}
                <div className="prose prose-sm max-w-none">
                  {problemData?.statement ? (
                    <div className="mb-8" dangerouslySetInnerHTML={{ __html: problemData.statement }} />
                  ) : (
                    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800">No problem statement available.</p>
                    </div>
                  )}
                  
                  {/* Sample Test Cases */}
                  {problemData?.sample_test_cases && problemData.sample_test_cases.length > 0 ? (
                    <div className="space-y-8 mb-8">
                      {problemData.sample_test_cases.map((testCase, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">
                              Sample Test Case {index + 1}
                            </h4>
                          </div>
                          
                          {/* Input and Output side by side */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            {/* Input Column */}
                            <div className="border-r border-gray-200">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h5 className="font-medium text-gray-900">Input</h5>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(testCase.input);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 transition-colors" 
                                  title="Copy"
                                >
                                  <Clipboard className="w-4 h-4" />
                                </button>
                              </div>
                              <pre className="bg-gray-800 text-gray-100 p-4 font-mono text-xs overflow-x-auto whitespace-pre m-0">
                                {testCase.input}
                              </pre>
                            </div>
                            
                            {/* Output Column */}
                            <div>
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h5 className="font-medium text-gray-900">Output</h5>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(testCase.output);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 transition-colors" 
                                  title="Copy"
                                >
                                  <Clipboard className="w-4 h-4" />
                                </button>
                              </div>
                              <pre className="bg-gray-800 text-gray-100 p-4 font-mono text-xs overflow-x-auto whitespace-pre m-0">
                                {testCase.output}
                              </pre>
                            </div>
                          </div>
                          
                          {/* Explanation - Full width below */}
                          {testCase.explanation && (
                            <div className="border-t border-gray-200">
                              <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                                <h5 className="font-medium text-blue-900">Explanation</h5>
                              </div>
                              <div className="p-4 bg-blue-50 text-blue-800 text-xs">
                                {testCase.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-gray-600 text-sm">No sample test cases available.</p>
                    </div>
                  )}
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
                      className="border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cpp">C++ 17</option>
                      <option value="java">Java</option>
                      <option value="python">Python 3</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const blob = new Blob([code], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `solution_${problemData?.problem_index || problemIndex}.${language}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert('Code downloaded!');
                      }}
                      title="Download Code"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
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
                  placeholder={`// Write your ${language.toUpperCase()} code here...`}
                  rows={20}
                />
              </div>

              {/* Editor Footer */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    Language: {language === 'cpp' ? 'C++ 17' : 
                              language === 'java' ? 'Java' : 
                              language === 'python' ? 'Python 3' : 'C'}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleRun}
                      className="px-4 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Run
                    </button>
                    <button 
                      onClick={handleSubmit}
                      className="px-6 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
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