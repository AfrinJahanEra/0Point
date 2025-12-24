// VirtualContestInside.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, Clock, Users, School, Play, Code2, 
  History, Trophy, MessageSquare, Download, Flag,
  Award, Plus, AlertCircle, Loader2, CheckCircle,
  XCircle, Clock as ClockIcon,
  FileQuestionIcon,
  BookOpen,
  RotateCcw, // Icon for restart virtual contest
  BarChart3, // Icon for statistics
  Trophy as TrophyIcon,
  Timer
} from 'lucide-react';

const VirtualContestInside = () => {
  const navigate = useNavigate();
  const { contestId, virtualContestId } = useParams(); // Get BOTH IDs
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [virtualContestData, setVirtualContestData] = useState(null);
  const [originalContestData, setOriginalContestData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [problemStatuses, setProblemStatuses] = useState({});
  const [solvedProblems, setSolvedProblems] = useState(new Set());
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
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    return 'bg-purple-100 text-purple-800 border-purple-200'; // Purple for virtual contests
  };

  // Main fetch function for virtual contest
  const fetchVirtualContestData = async () => {
    console.log('🚀 Starting fetchVirtualContestData for virtual contest:', virtualContestId);
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch virtual contest details
      console.log('📡 Fetching virtual contest details...');
      const virtualContestRes = await axios.get(
        `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/`, 
        { headers: getHeaders() }
      ).catch(err => {
        console.error('❌ Virtual contest details error:', err.response?.data || err.message);
        throw err;
      });
      
      console.log('✅ Virtual contest details:', virtualContestRes.data);
      
      if (!virtualContestRes.data) {
        throw new Error('No virtual contest data received');
      }

      const virtualContest = virtualContestRes.data;
      setVirtualContestData(virtualContest);

      // Store original contest ID for later use
      const originalContestId = virtualContest.original_contest_id;

      // 2. Fetch problems for the virtual contest
      console.log('📡 Fetching virtual contest problems...');
      try {
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/problems/`, 
          { headers: getHeaders() }
        ).catch(err => {
          console.error('⚠️ Problems fetch error (continuing):', err.response?.data || err.message);
          return { data: { problems: [] } };
        });
        
        console.log('📊 Virtual problems response:', problemsRes.data);
        
        let problemsList = [];
        if (problemsRes.data && problemsRes.data.problems) {
          problemsList = problemsRes.data.problems;
        }
        
        console.log('✅ Parsed virtual problems:', problemsList.length);
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
        
        // Set solved problems
        const solvedSet = new Set();
        problemsList.forEach(problem => {
          if (problem.solved) {
            solvedSet.add(problem.index);
          }
        });
        setSolvedProblems(solvedSet);
        
      } catch (problemsError) {
        console.error('⚠️ Problems error caught:', problemsError);
        setProblems([]);
      }

      // 3. Fetch original contest details (for reference)
      console.log('📡 Fetching original contest details...');
      try {
        const originalContestRes = await axios.get(
          `http://localhost:8000/contests/${originalContestId}/`, 
          { headers: getHeaders() }
        ).catch(err => {
          console.error('⚠️ Original contest fetch error (continuing):', err.response?.data || err.message);
          return { data: {} };
        });
        
        if (originalContestRes.data) {
          setOriginalContestData(originalContestRes.data);
        }
      } catch (originalError) {
        console.error('⚠️ Original contest error:', originalError);
      }

      // 4. Calculate time remaining if contest is active
      if (virtualContest.is_active) {
        try {
          const endTime = new Date(virtualContest.virtual_end_time);
          const now = new Date();
          
          if (now < endTime) {
            const remainingSeconds = Math.floor((endTime - now) / 1000);
            setTimeRemaining(remainingSeconds);
            console.log('⏰ Virtual contest timer started:', remainingSeconds, 'seconds remaining');
          } else {
            setTimeRemaining(0);
          }
        } catch (timeError) {
          console.error('⚠️ Time calculation error:', timeError);
        }
      }

      console.log('🎉 Virtual contest data loaded successfully!');
      setLoading(false);
      
    } catch (err) {
      console.error('💥 Critical error in fetchVirtualContestData:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // User-friendly error messages
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
      console.log('🔍 useEffect triggered for virtual contest:', virtualContestId);
      fetchVirtualContestData();
    } else {
      console.error('❌ No virtualContestId provided');
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
            
            // Refresh data when time runs out
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
      console.log('🎯 Navigating to virtual problem:', problemIndex);
      // Navigate to virtual contest problem page
      navigate(`/contests/${contestId}/virtual/${virtualContestId}/problems/${problemIndex}`);
    }
  };

  // Handle restart virtual contest
  const handleRestartVirtualContest = async () => {
    if (!virtualContestData || !virtualContestData.original_contest_id) return;
    
    if (window.confirm('Are you sure you want to restart this virtual contest? Your current progress will be lost.')) {
      try {
        console.log('🔄 Restarting virtual contest for:', virtualContestData.original_contest_id);
        const response = await axios.post(
          `http://localhost:8000/contests/${contestId}/virtual-start/`,
          { 
            contest_id: virtualContestData.original_contest_id 
          },
          { headers: getHeaders() }
        );
        
        console.log('✅ New virtual contest started:', response.data);
        
        if (response.data.virtual_contest_id) {
          alert('New virtual contest started!');
          navigate(`/contests/${contestId}/virtual/${response.data.virtual_contest_id}`);
        }
      } catch (err) {
        console.error('❌ Restart virtual contest error:', err.response?.data || err.message);
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

  // Handle view leaderboard
  const handleViewLeaderboard = () => {
    navigate(`/contests/${contestId}/standings`);
  };

  const handleViewSubmissions = () => {
    navigate(`/contests/${contestId}/submissions`);
  };

  const handleViewEditorial = () => {
    navigate(`/contests/${contestId}/editorial`);
  };

  const handleViewClarifications = () => {
    navigate(`/contests/${contestId}/clarifications`);
  };

  

  // Get problem status icon
  const getProblemStatusIcon = (problem) => {
    const problemIndex = problem.index || problem.code;
    const status = problemStatuses[problemIndex];
    
    if (!status) {
      return <div className="w-3 h-3 rounded-full bg-gray-300"></div>;
    }
    
    if (status.solved) {
      return (
        <div className="flex items-center justify-center" title="Solved">
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
      );
    }
    
    if (status.status === 'attempted') {
      return (
        <div className="flex items-center justify-center" title="Attempted">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
      );
    }
    
    return (
      <div className="w-3 h-3 rounded-full bg-gray-300" title="Not attempted"></div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600 mb-2">Loading virtual contest...</p>
        <p className="text-xs text-gray-500">Virtual Contest ID: {virtualContestId}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Unable to Load Virtual Contest</h3>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Contests
            </button>
            <button
              onClick={() => fetchVirtualContestData()}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Try Again
            </button>
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">Virtual Contest ID: {virtualContestId}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!virtualContestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No virtual contest data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Virtual Contest Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 mb-6 lg:mb-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-purple-800 text-purple-100 rounded-full text-sm font-medium">
                  Virtual Contest
                </span>
                {virtualContestData.is_active && (
                  <span className="px-3 py-1 bg-green-800 text-green-100 rounded-full text-sm font-medium flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-2">
                {originalContestData?.title || virtualContestData.original_contest_title || 'Virtual Contest'}
              </h1>
              
              {originalContestData?.description && (
                <p className="text-purple-100 mb-4 max-w-3xl">
                  {originalContestData.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>Started: {formatDateTime(virtualContestData.virtual_start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Duration: {formatDuration(
                  virtualContestData.original_contest_duration ||  // Try flat first
                  virtualContestData.original_contest?.duration_hours  // Then try nested
                )}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Original Participants: {originalContestData?.participants || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  <span>{originalContestData?.platform || 'Custom Platform'}</span>
                </div>
              </div>
              
              {/* Progress info */}
              <div className="mt-4">
                <div className="flex items-center gap-4">
                  <span className="text-purple-200">
                    Your Progress: {userStats.solved}/{problems.length} problems solved
                  </span>
                  <div className="w-48 h-2 bg-purple-800 rounded-full">
                    <div 
                      className="h-2 bg-green-400 rounded-full transition-all duration-300" 
                      style={{ 
                        width: problems.length > 0 ? `${(userStats.solved / problems.length) * 100}%` : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Virtual Contest Navigation</h2>
              </div>
              <div className="p-2">
                {[
                  { 
                    id: 'problems', 
                    icon: <Code2 className="w-5 h-5" />, 
                    label: 'Problems',
                    onClick: () => setActiveTab('problems')
                  },
                  { 
                    id: 'submissions', 
                    icon: <History className="w-5 h-5" />, 
                    label: 'My Submissions',
                    onClick: handleViewSubmissions
                  },
                  { 
                    id: 'leaderboard', 
                    icon: <Trophy className="w-5 h-5" />, 
                    label: 'Standings',
                    onClick: handleViewLeaderboard
                  },
                  { 
                    id: 'discussions', 
                    icon: <MessageSquare className="w-5 h-5" />, 
                    label: 'Discussions',
                    onClick: () => navigate(`/contests/${contestId}/discussion`)
                  },
                  { 
                    id: 'editorial', 
                    icon: <BarChart3 className="w-5 h-5" />, 
                    label: 'Editorial',
                    onClick: handleViewEditorial
                  },
                  { 
                    id: 'clarifications', 
                    icon: <BarChart3 className="w-5 h-5" />, 
                    label: 'Clarifications',
                    onClick: handleViewClarifications
                  }
                ].map((item) => {
                  if ((item.id === 'editorial' || item.id === 'discussions') && virtualContestData.status !== 'past') {
                    return null;
                  }
                  if ((item.id === 'clarifications') && virtualContestData.status !== 'live') {
                    return null;
                  }

                  
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors mb-1 ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                }
                //   (
                //   <button
                //     key={item.id}
                //     onClick={item.onClick}
                //     className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors mb-1 ${
                //       activeTab === item.id
                //         ? 'bg-purple-50 text-purple-700 border border-purple-200'
                //         : 'text-gray-700 hover:bg-gray-50'
                //     }`}
                //   >
                //     {item.icon}
                //     <span className="font-medium">{item.label}</span>
                //   </button>
                // )
              )}
              </div>
            </div>

            {/* Timer (only for active virtual contests) */}
            {virtualContestData.is_active && timeRemaining > 0 && (
              <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white rounded-xl p-6 text-center">
                <div className="text-xs text-purple-100 mb-2">Time Remaining</div>
                <div className="text-xl font-bold font-mono mb-2">{formatTime(timeRemaining)}</div>
                <div className="text-xs text-purple-200">Virtual contest ends in</div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Your Virtual Stats</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">{userStats.solved}</div>
                    <div className="text-xs text-gray-600">Solved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">{userStats.attempted}</div>
                    <div className="text-xs text-gray-600">Attempted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">{userStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">{userStats.accuracy}</div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-3">                
                <button
                  onClick={handleViewOriginalContest}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Original Contest
                </button>
                
                <button className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download Problems
                </button>
                
                <button className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <Flag className="w-5 h-5" />
                  Report Issue
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Problems Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Problems</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-green-600">
                    {userStats.solved}/{problems.length} Solved
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-green-600 rounded-full transition-all duration-300" 
                      style={{ 
                        width: problems.length > 0 ? `${(userStats.solved / problems.length) * 100}%` : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-900 w-16">Status</th>
                      <th className="text-left p-4 font-medium text-gray-900 w-20">#</th>
                      <th className="text-left p-4 font-medium text-gray-900">Problem</th>
                      <th className="text-left p-4 font-medium text-gray-900 w-32">Difficulty</th>
                      <th className="text-left p-4 font-medium text-gray-900 w-24">Points</th>
                      <th className="text-left p-4 font-medium text-gray-900 w-32">Your Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.length > 0 ? (
                      problems.map((problem, index) => (
                        <tr 
                          key={problem.index || index} 
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleProblemClick(problem)}
                        >
                          <td className="p-4">
                            {getProblemStatusIcon(problem)}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-purple-700">
                              {problem.index || problem.code || String.fromCharCode(65 + index)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{problem.title}</div>
                            {problem.tags && problem.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {problem.tags.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty?.charAt(0).toUpperCase() + problem.difficulty?.slice(1) || 'Medium'}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-900">
                            {problem.points || 100}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              problem.attempts > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {problem.attempts || 0} attempt{problem.attempts !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Code2 className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Problems Yet</h3>
                            <p className="text-gray-500 max-w-md">
                              Loading problems for this virtual contest...
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Virtual Contest Info Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrophyIcon className="w-6 h-6" />
                  Virtual Contest Information
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                      <p className="text-lg font-semibold text-gray-900">
                        {virtualContestData.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-600">Completed</span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Start Time</h3>
                      <p className="text-gray-900">{formatDateTime(virtualContestData.virtual_start_time)}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Duration</h3>
                      <p className="text-gray-900">{formatDuration(
  virtualContestData.original_contest_duration ||  // Try flat first
  virtualContestData.original_contest?.duration_hours  // Then try nested
)}</p>
                      
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Original Contest</h3>
                      <p className="text-gray-900">{virtualContestData.original_contest_title}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Your Best Score</h3>
                      <p className="text-2xl font-bold text-purple-700">
                        {problems.reduce((total, problem) => total + (problem.solved ? (problem.points || 100) : 0), 0)} points
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Progress</h3>
                      <div className="flex items-center gap-3">
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-purple-600 rounded-full transition-all duration-300" 
                            style={{ 
                              width: problems.length > 0 ? `${(userStats.solved / problems.length) * 100}%` : '0%' 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {Math.round((userStats.solved / problems.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Note about virtual contests */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">About Virtual Contests</h4>
                      <p className="text-sm text-blue-700">
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