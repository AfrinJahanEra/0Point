// TestContestInside.jsx - Compact Version
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
  TestTube,
  Shield,
  ChevronRight,
  Eye,
  BarChart3,
  Medal,
  Zap,
  TrendingUp
} from 'lucide-react';

const TestContestInside = () => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState('problems');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const { testContestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contestData, setContestData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState(new Set());
  const [problemStatuses, setProblemStatuses] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [userStats, setUserStats] = useState({
    solved: 0,
    attempted: 0,
    total: 0,
    accuracy: '0%'
  });

  const TOKEN = localStorage.getItem('token');

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
      case 'easy': return 'bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full';
      case 'medium': return 'bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full';
      case 'hard': return 'bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full';
      default: return 'bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded-full';
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5 rounded-full';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-0.5 rounded-full';
      case 'past': return 'bg-green-100 text-green-800 border-green-200 text-xs px-2 py-0.5 rounded-full';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200 text-xs px-2 py-0.5 rounded-full';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 text-xs px-2 py-0.5 rounded-full';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const problemIndex = status.problem_id || status.index || status.code;
    const stat = problemStatuses[problemIndex];
    
    if (!stat) {
      return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
    }
    
    if (stat.solved) {
      return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
    }
    
    if (stat.status === 'attempted') {
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    }
    
    return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
  };

  // Fetch test contest data
  const fetchTestContestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const contestRes = await axios.get(
        `http://localhost:8000/test-contests/${testContestId}/`, 
        { headers: getHeaders() }
      );
      
      if (!contestRes.data) {
        throw new Error('No test contest data received');
      }

      const contest = contestRes.data;
      setContestData(contest);

      let problemsList = [];
      try {
        const problemsRes = await axios.get(
          `http://localhost:8000/test-contests/${testContestId}/problems/`, 
          { headers: getHeaders() }
        );
        
        if (problemsRes.data) {
          if (Array.isArray(problemsRes.data)) {
            problemsList = problemsRes.data;
          } else if (problemsRes.data.problems && Array.isArray(problemsRes.data.problems)) {
            problemsList = problemsRes.data.problems;
          } else if (problemsRes.data.data && Array.isArray(problemsRes.data.data)) {
            problemsList = problemsRes.data.data;
          }
        }
        setProblems(problemsList);
      } catch (problemsError) {
        setProblems([]);
      }

      setAnnouncements([]);

      const initialStatuses = {};
      problemsList.forEach(problem => {
        const problemIndex = problem.problem_id || problem.index || problem.code;
        if (problemIndex) {
          initialStatuses[problemIndex] = {
            solved: false,
            status: 'unsolved',
            attempts: 0
          };
        }
      });
      setProblemStatuses(initialStatuses);
      
      setUserStats({
        solved: 0,
        attempted: 0,
        total: problemsList.length, 
        accuracy: '0%'
      });

      if (contest.status === 'live' && contest.test_start_time && contest.duration) {
        try {
          const startTime = new Date(contest.test_start_time);
          const endTime = new Date(startTime.getTime() + (contest.duration * 60 * 60 * 1000));
          const now = new Date();
          
          if (now >= startTime && now <= endTime) {
            const remainingSeconds = Math.floor((endTime - now) / 1000);
            setTimeRemaining(remainingSeconds);
          } else if (now > endTime) {
            setTimeRemaining(0);
          }
        } catch (timeError) {
          console.error('Time calculation error:', timeError);
        }
      }

      setLoading(false);
      
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Test contest not found');
      } else if (err.response?.status === 403) {
        setError('Access denied. You are not authorized to view this test contest.');
      } else if (err.response?.status === 401) {
        setError('Please login to access this test contest');
      } else if (err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load test contest');
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testContestId) {
      fetchTestContestData();
    } else {
      setError('No test contest ID provided');
      setLoading(false);
    }
  }, [testContestId]);

  // Countdown timer effect
  useEffect(() => {
    let intervalId;
    
    if (contestData?.status === 'live' && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setTimeout(() => {
              fetchTestContestData();
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
  }, [contestData?.status, timeRemaining]);

  // Handle problem click
  const handleProblemClick = (problem) => {
    const problemIndex = problem.problem_id || problem.index || problem.code;
    if (problemIndex) {
      navigate(`/test-contests/${testContestId}/problems/${problemIndex}`);
    }
  };

  // Handle test contest registration
  const handleRegister = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/test-contests/${testContestId}/register/`,
        {},
        { headers: getHeaders() }
      );
      
      if (response.status === 200 || response.status === 201) {
        alert('Successfully registered for the test contest!');
        fetchTestContestData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register for test contest');
    }
  };

  // Handle posting announcement
  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) {
      alert('Please enter announcement text');
      return;
    }

    try {
      alert('Announcement posting for test contests is not yet implemented');
      setNewAnnouncement('');
      setShowAnnouncementForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Unknown error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading test contest data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Test Contest Access Error</h3>
          <p className="text-gray-600 text-xs mb-3">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
            >
              Back to Contests
            </button>
            <button
              onClick={() => fetchTestContestData()}
              className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TestTube className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">No test contest data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 text-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">{contestData.title}</h1>
              <span className="text-xs bg-green-800 text-green-100 px-1.5 py-0.5 rounded">
                TEST
              </span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getStatusBadge(contestData.status)}`}>
              {contestData.status === 'live' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
              <span className="text-xs">
                {contestData.status === 'live' ? 'Test Live' : 
                 contestData.status === 'upcoming' ? 'Test Starting Soon' :
                 contestData.status.charAt(0).toUpperCase() + contestData.status.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-green-100">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDateTime(contestData.test_start_time || contestData.start_time)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(contestData.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{contestData.testers_count || 0} testers</span>
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
                  { id: 'problems', icon: <Code2 className="w-3.5 h-3.5" />, label: 'Problems' },
                  { id: 'submissions', icon: <History className="w-3.5 h-3.5" />, label: 'Submissions' },
                  { id: 'standings', icon: <Trophy className="w-3.5 h-3.5" />, label: 'Standings' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.id === 'problems' ? setActiveTab(item.id) : navigate(`/test-contests/${testContestId}/${item.id}`)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 ${
                      activeTab === item.id
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            {contestData.status === 'live' && timeRemaining > 0 && (
              <div className="bg-gradient-to-br from-green-900 to-green-700 text-white rounded-lg p-3">
                <div className="text-xs mb-1">Time Remaining</div>
                <div className="text-sm font-bold font-mono mb-1">{formatTime(timeRemaining)}</div>
                <div className="text-xs opacity-80">Test ends in</div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900">Your Stats</h2>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-green-700">{userStats.solved}</div>
                    <div className="text-xs text-gray-600">Solved</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-green-700">{userStats.attempted}</div>
                    <div className="text-xs text-gray-600">Attempted</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-green-700">{userStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-green-700">{userStats.accuracy}</div>
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
                {contestData.access && !contestData.access.is_registered && contestData.access.can_register && (
                  <button 
                    onClick={handleRegister}
                    className="w-full bg-green-800 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-green-900 transition-colors flex items-center justify-center gap-1"
                  >
                    Register for Test
                  </button>
                )}
                <button className="w-full border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" />
                  Download Problems
                </button>
                <button className="w-full border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" />
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
                <h2 className="text-sm font-bold text-gray-900">Problems</h2>
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
                      <th className="text-left p-2 font-medium text-gray-900 w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.length > 0 ? (
                      problems.map((problem, index) => (
                        <tr 
                          key={problem.id || index} 
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-2">
                            {getStatusIcon(problem)}
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-green-700">
                              {problem.problem_id || problem.index || problem.code || String.fromCharCode(65 + index)}
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
                            <button
                              onClick={() => handleProblemClick(problem)}
                              className="text-xs bg-blue-800 text-white px-2 py-1 rounded hover:bg-blue-900 transition-colors font-medium flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" />
                              Solve
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Code2 className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-gray-500 text-xs">No test problems available</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Announcements
                </h2>
                {contestData.is_creator && (
                  <button
                    onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="bg-green-800 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-900 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New
                  </button>
                )}
              </div>
              
              {showAnnouncementForm && contestData.is_creator && (
                <div className="p-2 border-b border-gray-200">
                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Enter test announcement text..."
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    rows="2"
                  />
                  <div className="flex justify-end gap-1.5 mt-2">
                    <button
                      onClick={() => {
                        setShowAnnouncementForm(false);
                        setNewAnnouncement('');
                      }}
                      className="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePostAnnouncement}
                      className="px-2 py-1 bg-green-800 text-white rounded text-xs font-medium hover:bg-green-900 transition-colors"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
              
              <div className="divide-y divide-gray-100">
                {announcements.length > 0 ? (
                  announcements.map((announcement, index) => (
                    <div key={index} className="p-2 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-600">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(announcement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">by {announcement.author || 'Test Admin'}</span>
                      </div>
                      <p className="text-gray-700 text-xs">{announcement.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center">
                    <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-gray-500 text-xs">No test announcements yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Test Info */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Test Information
                </h2>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-blue-50 p-2 rounded">
                    <h3 className="font-semibold text-blue-800 text-xs mb-1">About This Test</h3>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      <li>• Test version of original contest</li>
                      <li>• Only invited testers can participate</li>
                      <li>• {contestData.testers_count || 0} testers invited</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <h3 className="font-semibold text-green-800 text-xs mb-1">Your Role</h3>
                    <ul className="text-xs text-green-700 space-y-0.5">
                      <li>
                        <span className="font-medium">Status: </span>
                        {contestData.is_creator? 'Creator' : 'Participant'}
                      </li>
                      <li>
                        <span className="font-medium">Access: </span>
                        {contestData.access?.can_access ? 'Full' : 'Limited'}
                      </li>
                    </ul>
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

export default TestContestInside;

