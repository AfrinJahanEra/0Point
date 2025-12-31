// ContestInside.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, Clock, Users, School, Play, Code2, 
  History, Trophy, MessageSquare, Download, Flag,
  Award, Plus, AlertCircle, Loader2, CheckCircle,
  XCircle, Clock as ClockIcon,
  FileQuestionIcon,
  BookOpen
} from 'lucide-react';

const ContestInside = () => {

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState('problems');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const { contestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contestData, setContestData] = useState(null);
  const [problems, setProblems] = useState([]);
  // Add this with your other state variables
const [solvedProblems, setSolvedProblems] = useState(new Set());
  // Add this to your state variables
  const [problemStatuses, setProblemStatuses] = useState({});
  const [announcements, setAnnouncements] = useState([]);
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
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // SIMPLIFIED fetch function - FIXED VERSION
  const fetchContestData = async () => {
    console.log('🚀 Starting fetchContestData for contest:', contestId);
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch contest details (REQUIRED)
      console.log('📡 Fetching contest details...');
      const contestRes = await axios.get(
        `http://localhost:8000/contests/${contestId}/`, 
        { headers: getHeaders() }
      ).catch(err => {
        console.error('❌ Contest details error:', err.response?.data || err.message);
        throw err;
      });
      
      console.log('✅ Contest details:', contestRes.data);
      
      if (!contestRes.data) {
        throw new Error('No contest data received');
      }

      const contest = contestRes.data;
      setContestData(contest);

      // 2. Fetch problems (REQUIRED) - SIMPLIFIED
      console.log('📡 Fetching problems...');
      try {
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/problems/`, 
          { headers: getHeaders() }
        ).catch(err => {
          console.error('⚠️ Problems fetch error (continuing):', err.response?.data || err.message);
          return { data: [] }; // Return empty array on error
        });
        
        console.log('📊 Problems response:', problemsRes.data);
        
        let problemsList = [];
        if (problemsRes.data) {
          // Handle different response structures
          if (Array.isArray(problemsRes.data)) {
            problemsList = problemsRes.data;
          } else if (problemsRes.data.problems && Array.isArray(problemsRes.data.problems)) {
            problemsList = problemsRes.data.problems;
          } else if (problemsRes.data.data && Array.isArray(problemsRes.data.data)) {
            problemsList = problemsRes.data.data;
          }
        }
        
        console.log('✅ Parsed problems:', problemsList.length);
        setProblems(problemsList);
        
      } catch (problemsError) {
        console.error('⚠️ Problems error caught:', problemsError);
        setProblems([]); // Set empty array and continue
      }

// In your fetchContestData function, add more logging:
console.log('📡 Fetching announcements...');
try {
  const announcementsRes = await axios.get(
    `http://localhost:8000/contests/${contestId}/announcements/`,
    { headers: getHeaders() }
  ).catch(err => {
    console.error('⚠️ Announcements fetch error (continuing):', err.response?.data || err.message);
    return { data: { announcements: [] } };
  });
  
  console.log('📢 Announcements response:', announcementsRes.data);
  console.log('📢 Announcements array:', announcementsRes.data.announcements);
  console.log('📢 Announcements count:', announcementsRes.data.announcements?.length);
  
  if (announcementsRes.data && announcementsRes.data.announcements) {
    setAnnouncements(announcementsRes.data.announcements);
  }
} catch (announcementsError) {
  console.error('⚠️ Announcements error:', announcementsError);
}

// In your fetchContestData function, replace the status fetching section:
// 4. Fetch user problem status
console.log('📡 Fetching user problem status...');
try {
  const statusRes = await axios.get(
    `http://localhost:8000/contests/${contestId}/problems/status/`,
    { headers: getHeaders() }
  ).catch(err => {
    console.error('⚠️ Status fetch error (continuing):', err.response?.data || err.message);
    return { data: { problem_statuses: {} } };
  });
  
  console.log('👤 Problem status response:', statusRes.data);
  
  if (statusRes.data && statusRes.data.problem_statuses) {
    const statuses = statusRes.data.problem_statuses;
    setProblemStatuses(statuses);
    
    // Calculate stats
    let solved = 0;
    let attempted = 0;
    
    Object.values(statuses).forEach(status => {
      if (status.solved) solved++;
      if (status.status === 'attempted' || status.status === 'solved') attempted++;
    });
    
    const totalAttempts = solved + (attempted - solved); // Unique attempted problems
    const accuracy = totalAttempts > 0 ? Math.round((solved / totalAttempts) * 100) : 0;
    
    setUserStats({
      solved,
      attempted: totalAttempts,
      total: problemsList.length, 
      accuracy: `${accuracy}%`
    });
    
    // Also create a set of solved problems for quick checking
    const solvedSet = new Set();
    Object.entries(statuses).forEach(([problemIndex, status]) => {
      if (status.solved) {
        solvedSet.add(problemIndex);
      }
    });
    setSolvedProblems(solvedSet);
  }
} catch (statusError) {
  console.error('⚠️ Status error:', statusError);
  // Don't block on error
}



      // 5. Calculate time remaining (OPTIONAL)
if (contest.status === 'live' && contest.start_time && contest.duration) {
  try {
    const startTime = new Date(contest.start_time);
    const endTime = new Date(startTime.getTime() + (contest.duration * 60 * 60 * 1000));
    const now = new Date();
    
    if (now >= startTime && now <= endTime) {
      const remainingSeconds = Math.floor((endTime - now) / 1000);
      setTimeRemaining(remainingSeconds);
      console.log('⏰ Timer started:', remainingSeconds, 'seconds remaining');
    } else if (now > endTime) {
      setTimeRemaining(0);
    }
  } catch (timeError) {
    console.error('⚠️ Time calculation error:', timeError);
  }
}

      console.log('🎉 All data loaded successfully!');
      setLoading(false);
      
    } catch (err) {
      console.error('💥 Critical error in fetchContestData:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // User-friendly error messages
      if (err.response?.status === 404) {
        setError('Contest not found');
      } else if (err.response?.status === 403) {
        setError('Access denied. You may need to register for this contest.');
      } else if (err.response?.status === 401) {
        setError('Please login to access this contest');
      } else if (err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load contest');
      }
      
      setLoading(false);
    }
  };

useEffect(() => {
  if (contestId) {
    console.log('🔍 useEffect triggered for contest:', contestId);
    fetchContestData();
  } else {
    console.error('❌ No contestId provided');
    setError('No contest ID provided');
    setLoading(false);
  }
}, [contestId]);


useEffect(() => {
  if (contestId) {
    console.log('🔍 useEffect triggered for contest:', contestId);
    fetchContestData();
  } else {
    console.error('❌ No contestId provided');
    setError('No contest ID provided');
    setLoading(false);
  }
}, [contestId]);

// === ADD THIS COUNTDOWN TIMER EFFECT HERE ===
useEffect(() => {
  let intervalId;
  
  if (contestData?.status === 'live' && timeRemaining > 0) {
    intervalId = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          clearInterval(intervalId);
          
          // Optionally refresh contest data when time runs out
          setTimeout(() => {
            fetchContestData();
          }, 1000);
          
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }
  
  // Cleanup interval on component unmount or when dependencies change
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, [contestData?.status, timeRemaining]);
// === END OF ADDED CODE ===


  // Handle problem click
  const handleProblemClick = (problem) => {
  const problemIndex = problem.problem_id || problem.index || problem.code;
  if (problemIndex) {
    console.log('🎯 Navigating to problem:', problemIndex);
    // Change from /contests/ to /contest/ (singular)
    navigate(`/contests/${contestId}/problems/${problemIndex}`);
  }
};

  // Handle registration
  const handleRegister = async () => {
    try {
      console.log('📝 Registering for contest:', contestId);
      const response = await axios.post(
        `http://localhost:8000/contests/${contestId}/register/`,
        {},
        { headers: getHeaders() }
      );
      
      if (response.status === 200 || response.status === 201) {
        alert('Successfully registered for the contest!');
        fetchContestData();
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      alert(err.response?.data?.error || 'Failed to register');
    }
  };

  // Handle post announcement
// Handle post announcement
const handlePostAnnouncement = async () => {
  if (!newAnnouncement.trim()) {
    alert('Please enter announcement text');
    return;
  }

  try {
    const response = await axios.post(
      `http://localhost:8000/announcements/create/`,
      { 
        contest_id: contestId,
        text: newAnnouncement 
      },
      { headers: getHeaders() }
    );
    
    console.log('📝 Post announcement response:', response.data);
    
    if (response.data && response.data.announcement) {
      setAnnouncements([response.data.announcement, ...announcements]);
      setNewAnnouncement('');
      setShowAnnouncementForm(false);
      alert('Announcement posted successfully!');
    }
  } catch (err) {
    console.error('❌ Error posting announcement:', err);
    console.error('Error details:', err.response?.data);
    alert(err.response?.data?.error || 'Unknown error');
  }
};

  // Get problem status icon
// Update getProblemStatusIcon function
const getProblemStatusIcon = (problem) => {
  const problemIndex = problem.problem_id || problem.index || problem.code;
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
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 mb-2">Loading contest data...</p>
        <p className="text-xs text-gray-500">Contest ID: {contestId}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Unable to Load Contest</h3>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Contests
            </button>
            {error.includes('need to register') && contestData?.status === 'upcoming' && (
              <button
                onClick={handleRegister}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Register Now
              </button>
            )}
            <button
              onClick={() => fetchContestData()}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Try Again
            </button>
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">Contest ID: {contestId}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No contest data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contest Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 mb-6 lg:mb-0">
              <h1 className="text-3xl font-bold mb-4">{contestData.title}</h1>
              
              {contestData.description && (
                <p className="text-blue-100 mb-6 max-w-3xl">
                  {contestData.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDateTime(contestData.start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{formatDuration(contestData.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{contestData.participants || 0} Participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  <span>{contestData.platform || 'Custom Platform'}</span>
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${getStatusBadge(contestData.status)}`}>
              {contestData.status === 'live' && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
              <span>{contestData.status === 'live' ? 'Live Now' : contestData.status.charAt(0).toUpperCase() + contestData.status.slice(1)}</span>
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
                <h2 className="font-semibold text-gray-900">Contest Navigation</h2>
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
                    onClick: () => navigate(`/contests/${contestId}/submissions`)
                  },
                  { 
                    id: 'leaderboard', 
                    icon: <Trophy className="w-5 h-5" />, 
                    label: 'Leaderboard',
                    onClick: () => navigate(`/contests/${contestId}/leaderboard`)
                  },
                  { 
                    id: 'clarifications', 
                    icon: <FileQuestionIcon className="w-5 h-5" />,
                    label: 'Clarifications',
                    onClick: () => navigate(`/contests/${contestId}/clarifications`)
                  },
                  { 
                    id: 'discussions', 
                    icon: <MessageSquare className="w-5 h-5" />, 
                    label: 'Discussions',
                    onClick: () => navigate(`/contests/${contestId}/discussion`)
                  },
                  // In the navigation array, add this new item:
                  { 
                    id: 'editorial', 
                    icon: <BookOpen className="w-5 h-5" />, 
                    label: 'Editorial',
                    onClick: () => navigate(`/contests/${contestId}/editorial`),
                    // Conditionally show only for past contests
                    show: contestData.status === 'past'
                  }
                ].map((item) => {
                  
                  if (item.id === 'editorial' && contestData.status !== 'past') {
    return null; // Don't render editorial
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
})}
              </div>
            </div>

            {/* Timer */}
            {contestData.status === 'live' && timeRemaining > 0 && (
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-xl p-6 text-center">
                <div className="text-xs text-blue-100 mb-2">Time Remaining</div>
                <div className="text-xl font-bold font-mono mb-2">{formatTime(timeRemaining)}</div>
                <div className="text-xs text-blue-200">Contest ends in</div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Your Stats</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{userStats.solved}</div>
                    <div className="text-xs text-gray-600">Solved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{userStats.attempted}</div>
                    <div className="text-xs text-gray-600">Attempted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{userStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{userStats.accuracy}</div>
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
                {contestData.status === 'past' && (
                  <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Play className="w-5 h-5" />
                    Start Virtual Contest
                  </button>
                )}
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
                    </tr>
                  </thead>
                  <tbody>
                    {problems.length > 0 ? (
                      problems.map((problem, index) => (
                        <tr 
                          key={problem.id || index} 
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleProblemClick(problem)}
                        >
                          <td className="p-4">
                            {getProblemStatusIcon(problem)}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-blue-700">
                              {problem.problem_id || problem.index || problem.code || String.fromCharCode(65 + index)}
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Code2 className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Problems Yet</h3>
                            <p className="text-gray-500 max-w-md">
                              This contest doesn't have any problems yet.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Announcements
                </h2>
                {contestData.is_creator && (
                  <button
                    onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Announcement
                  </button>
                )}
              </div>
              
              {showAnnouncementForm && contestData.is_creator && (
                <div className="p-6 border-b border-gray-200">
                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Enter announcement text..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => {
                        setShowAnnouncementForm(false);
                        setNewAnnouncement('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePostAnnouncement}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Post Announcement
                    </button>
                  </div>
                </div>
              )}
              
              <div className="divide-y divide-gray-100">
                {announcements.length > 0 ? (
                  announcements.map((announcement, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-green-600">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(announcement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">by {announcement.author || 'Admin'}</span>
                      </div>
                      <p className="text-gray-700">{announcement.text}</p>
                      {announcement.problem_index && (
                        <div className="mt-2">
                          <span className="inline-block px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Problem {announcement.problem_index}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Announcements</h3>
                    <p className="text-gray-500">
                      No announcements have been posted for this contest yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestInside;