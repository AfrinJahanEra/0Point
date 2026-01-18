// VirtualContestInside.jsx - Compact Version
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, Clock, Users, School, Play, Code2, 
  History, Trophy, MessageSquare, Download, Flag,
  AlertCircle, Loader2, CheckCircle,
  XCircle, BookOpen, RotateCcw
} from 'lucide-react';

const VirtualContestInside = () => {
  const navigate = useNavigate();
  const { contestId, virtualContestId } = useParams();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [virtualContestData, setVirtualContestData] = useState(null);
  const [originalContestData, setOriginalContestData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [problemStatuses, setProblemStatuses] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState('problems');
  
  const [userStats, setUserStats] = useState({
    solved: 0,
    attempted: 0,
    total: 0,
    accuracy: '0%'
  });

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  const getHeaders = () => ({
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  });

  // Format time remaining
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format date time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' ' + 
      date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Format duration
  const formatDuration = (hours) => {
    if (!hours) return 'Not set';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded-full';
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full';
      case 'medium': return 'bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full';
      case 'hard': return 'bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full';
      default: return 'bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded-full';
    }
  };

  // Get status badge color
  const getStatusBadge = () => {
    return 'bg-purple-100 text-purple-800 border-purple-200 text-xs px-2 py-0.5 rounded-full';
  };

  // Main fetch function for virtual contest
  const fetchVirtualContestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch virtual contest details
      const virtualContestRes = await axios.get(
        `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/`, 
        { headers: getHeaders() }
      );
      
      if (!virtualContestRes.data) {
        throw new Error('No virtual contest data received');
      }

      const virtualContest = virtualContestRes.data;
      setVirtualContestData(virtualContest);

      // Store original contest ID for later use
      const originalContestId = virtualContest.original_contest_id;

      // 2. Fetch problems for the virtual contest
      try {
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/problems/`, 
          { headers: getHeaders() }
        );
        
        let problemsList = [];
        if (problemsRes.data && problemsRes.data.problems) {
          problemsList = problemsRes.data.problems;
        }
        
        setProblems(problemsList);
        
        // Calculate stats from problems
        let solved = 0;
        let attempted = 0;
        
        problemsList.forEach(problem => {
          if (problem.solved) solved++;
          if (problem.virtual_status === 'attempted' || problem.virtual_status === 'solved') attempted++;
        });
        
        const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
        
        setUserStats({
          solved,
          attempted,
          total: problemsList.length,
          accuracy: `${accuracy}%`
        });
        
        // Set problem statuses
        const statuses = {};
        problemsList.forEach(problem => {
          statuses[problem.index] = {
            solved: problem.solved,
            status: problem.virtual_status,
            attempts: problem.attempts || 0
          };
        });
        setProblemStatuses(statuses);
        
      } catch (problemsError) {
        console.error('Problems error:', problemsError);
        setProblems([]);
      }

      // 3. Fetch original contest details
      try {
        const originalContestRes = await axios.get(
          `http://localhost:8000/contests/${originalContestId}/`, 
          { headers: getHeaders() }
        );
        
        if (originalContestRes.data) {
          setOriginalContestData(originalContestRes.data);
        }
      } catch (originalError) {
        console.error('Original contest error:', originalError);
      }

      // 4. Calculate time remaining if contest is active
      if (virtualContest.is_active) {
        try {
          const endTime = new Date(virtualContest.virtual_end_time);
          const now = new Date();
          
          if (now < endTime) {
            const remainingSeconds = Math.floor((endTime - now) / 1000);
            setTimeRemaining(remainingSeconds);
          } else {
            setTimeRemaining(0);
          }
        } catch (timeError) {
          console.error('Time calculation error:', timeError);
        }
      }

      setLoading(false);
      
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Virtual contest not found');
      } else if (err.response?.status === 403) {
        setError('Access denied. This virtual contest is private.');
      } else if (err.response?.status === 401) {
        setError('Please login to access this virtual contest');
      } else if (err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load virtual contest');
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    if (virtualContestId) {
      fetchVirtualContestData();
    } else {
      setError('No virtual contest ID provided');
      setLoading(false);
    }
  }, [virtualContestId]);

  // Timer effect for active virtual contests
  useEffect(() => {
    let intervalId;
    
    if (virtualContestData?.is_active && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setTimeout(() => {
              fetchVirtualContestData();
            }, 1000);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [virtualContestData?.is_active, timeRemaining]);

  // Handle problem click
  const handleProblemClick = (problem) => {
    const problemIndex = problem.index || problem.code;
    if (problemIndex) {
      navigate(`/contests/${contestId}/virtual/${virtualContestId}/problems/${problemIndex}`);
    }
  };

  // Handle restart virtual contest
  const handleRestartVirtualContest = async () => {
    if (!virtualContestData || !virtualContestData.original_contest_id) return;
    
    if (window.confirm('Are you sure you want to restart this virtual contest? Your current progress will be lost.')) {
      try {
        const response = await axios.post(
          `http://localhost:8000/contests/${contestId}/virtual-start/`,
          { 
            contest_id: virtualContestData.original_contest_id 
          },
          { headers: getHeaders() }
        );
        
        if (response.data.virtual_contest_id) {
          alert('New virtual contest started!');
          navigate(`/contests/${contestId}/virtual/${response.data.virtual_contest_id}`);
        }
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to restart virtual contest');
      }
    }
  };

  // Handle view original contest
  const handleViewOriginalContest = () => {
    if (virtualContestData?.original_contest_id) {
      navigate(`/contests/${virtualContestData.original_contest_id}`);
    }
  };

  // Get problem status icon
  const getProblemStatusIcon = (problem) => {
    const problemIndex = problem.index || problem.code;
    const status = problemStatuses[problemIndex];
    
    if (!status) {
      return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
    }
    
    if (status.solved) {
      return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
    }
    
    if (status.status === 'attempted') {
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    }
    
    return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading virtual contest...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Virtual Contest Error</h3>
          <p className="text-gray-600 text-xs mb-3">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
            >
              Back to Contests
            </button>
            <button
              onClick={() => fetchVirtualContestData()}
              className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!virtualContestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">No virtual contest data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">{originalContestData?.title || virtualContestData.original_contest_title || 'Virtual Contest'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getStatusBadge()}`}>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs">
                  Virtual {virtualContestData.is_active ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
          </div>
          
          {originalContestData?.description && (
            <p className="text-purple-100 text-xs mt-1 mb-2">
              {originalContestData.description.length > 100 
                ? originalContestData.description.substring(0, 100) + '...' 
                : originalContestData.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 text-xs text-purple-100">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Started: {formatDateTime(virtualContestData.virtual_start_time)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Duration: {formatDuration(
                virtualContestData.original_contest_duration ||
                virtualContestData.original_contest?.duration_hours
              )}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Original: {originalContestData?.participants || 0} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <School className="w-3 h-3" />
              <span>{originalContestData?.platform || 'Custom Platform'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            {/* Navigation */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-1">
                {[
                  { 
                    id: 'problems', 
                    icon: <Code2 className="w-3.5 h-3.5" />, 
                    label: 'Problems',
                    onClick: () => setActiveTab('problems')
                  },
                  { 
                    id: 'submissions', 
                    icon: <History className="w-3.5 h-3.5" />, 
                    label: 'Submissions',
                    onClick: () => navigate(`/contests/${contestId}/submissions`)
                  },
                  { 
                    id: 'leaderboard', 
                    icon: <Trophy className="w-3.5 h-3.5" />, 
                    label: 'Standings',
                    onClick: () => navigate(`/contests/${contestId}/standings`)
                  },
                  { 
                    id: 'editorial', 
                    icon: <BookOpen className="w-3.5 h-3.5" />, 
                    label: 'Editorial',
                    onClick: () => navigate(`/contests/${contestId}/editorial`),
                    show: !virtualContestData.is_active
                  }
                ].map((item) => {
                  if (item.show !== undefined && !item.show) return null;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 ${
                        activeTab === item.id
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timer */}
            {virtualContestData.is_active && timeRemaining > 0 && (
              <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white rounded-lg p-3">
                <div className="text-xs mb-1">Time remaining</div>
                <div className="text-sm font-bold font-mono mb-1">{formatTime(timeRemaining)}</div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900">Your Virtual Stats</h2>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-purple-700">{userStats.solved}</div>
                    <div className="text-xs text-gray-600">Solved</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-purple-700">{userStats.attempted}</div>
                    <div className="text-xs text-gray-600">Attempted</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-purple-700">{userStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-purple-700">{userStats.accuracy}</div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-2 space-y-1.5">
                {virtualContestData.is_active ? (
                  <button 
                    onClick={handleRestartVirtualContest}
                    className="w-full bg-yellow-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-yellow-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restart Virtual
                  </button>
                ) : (
                  <button 
                    onClick={handleRestartVirtualContest}
                    className="w-full bg-purple-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Start New Virtual
                  </button>
                )}
                
                <button 
                  onClick={handleViewOriginalContest}
                  className="w-full border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  Original Contest
                </button>
                
                <button className="w-full border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" />
                  Download Problems
                </button>
                
                <button className="w-full border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                  <Flag className="w-3 h-3" />
                  Report Issue
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-3">
            {/* Problems Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-900">Virtual Contest Problems</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-600">
                    {userStats.solved}/{problems.length} Solved
                  </span>
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                    <div 
                      className="h-1.5 bg-green-600 rounded-full transition-all duration-300" 
                      style={{ 
                        width: problems.length > 0 ? `${(userStats.solved / problems.length) * 100}%` : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-2 font-medium text-gray-900 w-10">Status</th>
                      <th className="text-left p-2 font-medium text-gray-900 w-12">#</th>
                      <th className="text-left p-2 font-medium text-gray-900">Problem</th>
                      <th className="text-left p-2 font-medium text-gray-900 w-20">Difficulty</th>
                      <th className="text-left p-2 font-medium text-gray-900 w-16">Points</th>
                      <th className="text-left p-2 font-medium text-gray-900 w-20">Attempts</th>
                      <th className="text-left p-2 font-medium text-gray-900 w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.length > 0 ? (
                      problems.map((problem, index) => (
                        <tr 
                          key={problem.index || index} 
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-2">
                            {getProblemStatusIcon(problem)}
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-purple-700">
                              {problem.index || problem.code || String.fromCharCode(65 + index)}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-gray-900">{problem.title}</div>
                            {problem.tags && problem.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {problem.tags.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="px-1 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <span className={`${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty?.charAt(0).toUpperCase() + problem.difficulty?.slice(1) || 'Medium'}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-gray-900">
                            {problem.points || 100}
                          </td>
                          <td className="p-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              problem.attempts > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {problem.attempts || 0}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleProblemClick(problem)}
                              className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors font-medium flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" />
                              Solve
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Code2 className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-gray-500 text-xs">No problems available</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Virtual Contest Info */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  Virtual Contest Information
                </h2>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="mb-1">
                      <span className="font-medium">Status: </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        virtualContestData.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {virtualContestData.is_active ? 'Active' : 'Completed'}
                      </span>
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">Started: </span>
                      {formatDateTime(virtualContestData.virtual_start_time)}
                    </div>
                    <div>
                      <span className="font-medium">Duration: </span>
                      {formatDuration(
                        virtualContestData.original_contest_duration ||
                        virtualContestData.original_contest?.duration_hours
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1">
                      <span className="font-medium">Original Contest: </span>
                      {virtualContestData.original_contest_title}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">Your Score: </span>
                      <span className="font-bold text-purple-700">
                        {problems.reduce((total, problem) => total + (problem.solved ? (problem.points || 100) : 0), 0)} pts
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Progress: </span>
                      <div className="inline-flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                          <div 
                            className="h-1.5 bg-purple-600 rounded-full transition-all duration-300" 
                            style={{ 
                              width: problems.length > 0 ? `${(userStats.solved / problems.length) * 100}%` : '0%' 
                            }}
                          ></div>
                        </div>
                        <span className="text-xs">
                          {Math.round((userStats.solved / problems.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Note about virtual contests */}
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 text-xs mb-0.5">About Virtual Contests</h4>
                      <p className="text-blue-700 text-xs">
                        This is a virtual contest. Your submissions will not affect your rating. 
                        You can practice at your own pace and restart the contest anytime.
                      </p>
                    </div>
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

export default VirtualContestInside;