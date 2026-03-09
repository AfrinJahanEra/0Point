// ContestInside.jsx - Compact Version
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ScreenRecorder from '../components/ScreenRecorder';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../utils/api';
import { 
  Calendar, Clock, Users, School, Play, Code2, 
  History, Trophy, MessageSquare, Download, Flag,
  Award, Plus, AlertCircle, Loader2, CheckCircle,
  XCircle, Clock as ClockIcon,
  FileQuestionIcon,
  BookOpen,
  Shield,
  ChevronRight,
  ChevronDown,
  Eye,
  BarChart3,
  Medal,
  Zap,
  TrendingUp
} from 'lucide-react';

const ContestInside = () => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState('problems');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [hasAnyVirtualContest, setHasAnyVirtualContest] = useState(false);
  const [virtualContestId, setVirtualContestId] = useState(null);
  const [user, setUser] = useState(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [expandedProblemIndex, setExpandedProblemIndex] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const { contestId } = useParams();
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
    if (!difficulty) return 'bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded-full';
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

  // Fetch contest data — single unified request
  const fetchContestData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        `${BACKEND_URL}/contests/${contestId}/inside/`,
        { headers: getHeaders() }
      );

      const {
        contest,
        problems: problemsList = [],
        problem_statuses: statuses = {},
        announcements: annList = [],
        has_virtual_contest,
        virtual_contest_id,
        total_solved,
        total_attempted,
      } = res.data;

      // Merge is_creator into contest object so templates can read contest.is_creator
      const mergedContest = { ...contest, is_creator: res.data.is_creator };

      setContestData(mergedContest);
      setProblems(problemsList);
      setAnnouncements(annList);
      setProblemStatuses(statuses);
      setHasAnyVirtualContest(!!has_virtual_contest);
      setVirtualContestId(virtual_contest_id || null);

      // Compute user stats from returned totals
      const solved    = total_solved   ?? 0;
      const attempted = total_attempted ?? 0;
      const accuracy  = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
      setUserStats({
        solved,
        attempted,
        total: problemsList.length,
        accuracy: `${accuracy}%`,
      });

      // Build solved set
      const solvedSet = new Set(
        Object.entries(statuses)
          .filter(([, s]) => s.solved)
          .map(([idx]) => idx)
      );
      setSolvedProblems(solvedSet);

      // Timer
      if (contest.status === 'live' && contest.start_time && contest.duration) {
        try {
          const startTime = new Date(contest.start_time);
          const endTime   = new Date(startTime.getTime() + contest.duration * 60 * 60 * 1000);
          const now       = new Date();
          if (now >= startTime && now <= endTime) {
            setTimeRemaining(Math.floor((endTime - now) / 1000));
          } else {
            setTimeRemaining(0);
          }
        } catch (_) {}
      }

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Contest not found');
      } else if (err.response?.status === 403) {
        setError('Access denied. You may need to register for this contest.');
      } else if (err.response?.status === 401) {
        setError('Please login to access this contest');
      } else if (err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load contest');
      }
      setLoading(false);
    }
  };

  const checkRecordingRequirements = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/contests/${contestId}/recording/status/`,
        { headers: getHeaders() }
      );
      
      const { requires_recording, recording_started } = response.data;
      
      if (requires_recording && !recording_started && contestData.status === 'live') {
        setShowRecordingModal(true);
      }
    } catch (err) {
      console.error('Error checking recording requirements:', err);
    }
  };

  useEffect(() => {
    if (contestId) {
      fetchContestData();
    } else {
      setError('No contest ID provided');
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    let intervalId;
    
    if (contestData?.status === 'live' && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setTimeout(() => {
              fetchContestData();
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
      navigate(`/contests/${contestId}/problems/${problemIndex}`);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/contests/${contestId}/register/`,
        {},
        { headers: getHeaders() }
      );
      
      if (response.status === 200 || response.status === 201) {
        alert('Successfully registered for the contest!');
        fetchContestData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register');
    }
  };

  // Handle start virtual contest
  const handleStartVirtualContest = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/contests/${contestId}/virtual-start/`,
        { contest_id: contestId },
        { headers: getHeaders() }
      );
      
      if (response.data.virtual_contest_id) {
        alert('Virtual contest started successfully!');
        navigate(`/contests/${contestId}/virtual/${response.data.virtual_contest_id}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start virtual contest');
    }
  };

  // Handle post announcement
  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) {
      alert('Please enter announcement text');
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/announcements/create/`,
        { 
          contest_id: contestId,
          text: newAnnouncement 
        },
        { headers: getHeaders() }
      );
      
      if (response.data && response.data.announcement) {
        setAnnouncements([response.data.announcement, ...announcements]);
        setNewAnnouncement('');
        setShowAnnouncementForm(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Unknown error');
    }
  };

  // Handle go to existing virtual contest
  const handleGoToVirtualContest = () => {
    if (virtualContestId) {
      navigate(`/contests/${contestId}/virtual/${virtualContestId}`);
    }
  };

  // Get problem status icon
  const getProblemStatusIcon = (problem) => {
    const problemIndex = problem.problem_id || problem.index || problem.code;
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading contest data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Contest Access Error</h3>
          <p className="text-gray-600 text-xs mb-3">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
            >
              Back to Contests
            </button>
            {error.includes('need to register') && contestData?.status === 'upcoming' && (
              <button
                onClick={handleRegister}
                className="w-full bg-green-800 text-white py-1.5 rounded text-xs font-medium hover:bg-green-900 transition-colors"
              >
                Register Now
              </button>
            )}
            <button
              onClick={() => fetchContestData()}
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
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">No contest data available</p>
        </div>
      </div>
    );
  }

  const RecordingRequirementModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-4 max-w-sm mx-4">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Screen Recording Required</h3>
          <p className="text-gray-600 text-xs mb-3">
            This contest requires screen recording for integrity purposes.
          </p>
        </div>
        
        <div className="space-y-1.5">
          <button
            onClick={() => {
              setShowRecordingModal(false);
            }}
            className="w-full bg-red-600 text-white py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Start Recording Now
          </button>
          
          <button
            onClick={() => {
              setShowRecordingModal(false);
              alert('You must start recording to participate in this contest.');
            }}
            className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add ScreenRecorder component */}
      {contestData && contestData.status === 'live' && (
        <ScreenRecorder 
          contestId={contestId}
          userId={user?.id}
          contestStatus={contestData.status}
          onRecordingComplete={(data) => {
            console.log('Recording completed:', data);
          }}
        />
      )}
      {showRecordingModal && <RecordingRequirementModal />}
      
      {/* Compact Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">{contestData.title}</h1>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getStatusBadge(contestData.status)}`}>
              {contestData.status === 'live' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
              <span className="text-xs">
                {contestData.status === 'live' ? 'Live Now' : 
                 contestData.status === 'upcoming' ? 'Starting Soon' :
                 contestData.status.charAt(0).toUpperCase() + contestData.status.slice(1)}
              </span>
            </div>
          </div>
          
          {contestData.description && (
            <p className="text-blue-100 text-xs mt-1 mb-2">
              {contestData.description.length > 100 
                ? contestData.description.substring(0, 100) + '...' 
                : contestData.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 text-xs text-blue-100">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDateTime(contestData.start_time)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(contestData.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{contestData.participants || 0} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <School className="w-3 h-3" />
              <span>{contestData.platform || 'Custom Platform'}</span>
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
                    id: 'clarifications', 
                    icon: <FileQuestionIcon className="w-3.5 h-3.5" />,
                    label: 'Clarifications',
                    onClick: () => navigate(`/contests/${contestId}/clarifications`),
                    show: contestData.status === 'live'
                  },
                  { 
                    id: 'discussions', 
                    icon: <MessageSquare className="w-3.5 h-3.5" />, 
                    label: 'Discussions',
                    onClick: () => navigate(`/contests/${contestId}/discussion`),
                    show: contestData.status === 'past'
                  },
                  { 
                    id: 'editorial', 
                    icon: <BookOpen className="w-3.5 h-3.5" />, 
                    label: 'Editorial',
                    onClick: () => navigate(`/contests/${contestId}/editorial`),
                    show: contestData.status === 'past'
                  }
                ].map((item) => {
                  if (item.show !== undefined && !item.show) return null;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700'
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
            {contestData.status === 'live' && timeRemaining > 0 && (
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-lg p-3">
                <div className="text-xs mb-1">Contest ends in</div>
                <div className="text-sm font-bold font-mono mb-1">{formatTime(timeRemaining)}</div>
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
                    <div className="text-sm font-bold text-blue-700">{userStats.solved}</div>
                    <div className="text-xs text-gray-600">Solved</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-blue-700">{userStats.attempted}</div>
                    <div className="text-xs text-gray-600">Attempted</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-blue-700">{userStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-1 bg-gray-50 rounded">
                    <div className="text-sm font-bold text-blue-700">{userStats.accuracy}</div>
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
                    className="w-full bg-blue-800 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
                  >
                    Register for Contest
                  </button>
                )}

                {contestData.status === 'past' && (
                  hasAnyVirtualContest ? (
                    <button 
                      className="w-full bg-purple-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                      onClick={handleGoToVirtualContest}
                    >
                      <Play className="w-3 h-3" />
                      Go to Virtual Contest
                    </button>
                  ) : (
                    <button 
                      className="w-full bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      onClick={handleStartVirtualContest}
                    >
                      <Play className="w-3 h-3" />
                      Start Virtual Contest
                    </button>
                  )
                )}

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
                      <th className="text-left p-2 font-medium text-gray-900 w-8"></th>
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
                      problems.map((problem, index) => {
                        const pIdx = problem.problem_id || problem.index || problem.code || String.fromCharCode(65 + index);
                        const isExpanded = expandedProblemIndex === pIdx;
                        const sampleCases = (problem.test_cases || []).filter(tc => tc.sample);
                        return (
                          <React.Fragment key={problem.id || index}>
                            <tr
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <td className="p-2">
                                <button
                                  onClick={() => setExpandedProblemIndex(isExpanded ? null : pIdx)}
                                  className="text-blue-700 hover:text-blue-900 transition-colors"
                                  title={isExpanded ? 'Collapse' : 'View question'}
                                >
                                  {isExpanded
                                    ? <ChevronDown className="w-3.5 h-3.5" />
                                    : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                              <td className="p-2">
                                {getProblemStatusIcon(problem)}
                              </td>
                              <td className="p-2">
                                <span className="font-semibold text-blue-700">{pIdx}</span>
                              </td>
                              <td className="p-2">
                                <div
                                  className="font-medium text-gray-900 cursor-pointer hover:text-blue-700 transition-colors"
                                  onClick={() => setExpandedProblemIndex(isExpanded ? null : pIdx)}
                                >
                                  {problem.title}
                                </div>
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
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="px-4 pb-4 pt-0 bg-blue-50">
                                  <div className="border border-blue-200 rounded-lg bg-white p-4 space-y-4">
                                    {/* Problem header */}
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-blue-900 text-white rounded font-bold text-xs">{pIdx}</span>
                                        {problem.title}
                                      </h3>
                                      <button
                                        onClick={() => handleProblemClick(problem)}
                                        className="text-xs bg-blue-800 text-white px-3 py-1.5 rounded hover:bg-blue-900 transition-colors font-medium flex items-center gap-1"
                                      >
                                        <Play className="w-3 h-3" />
                                        Solve
                                      </button>
                                    </div>

                                    {/* Limits */}
                                    <div className="flex gap-3">
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                        Time: {problem.time_limit_seconds || problem.time_limit || 1}s
                                      </span>
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                        Memory: {problem.memory_limit_mb || problem.memory_limit || 256}MB
                                      </span>
                                      {(problem.points || 0) > 0 && (
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-900 rounded">
                                          {problem.points} pts
                                        </span>
                                      )}
                                    </div>

                                    {/* Statement */}
                                    {problem.statement ? (
                                      <div>
                                        <h4 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Problem Statement</h4>
                                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200 max-h-80 overflow-y-auto">
                                          {problem.statement}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500 italic">No statement available.</div>
                                    )}

                                    {/* Sample Test Cases */}
                                    {sampleCases.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                          Sample Test Cases ({sampleCases.length})
                                        </h4>
                                        <div className="space-y-2">
                                          {sampleCases.map((tc, tcIdx) => (
                                            <div key={tcIdx} className="border border-gray-200 rounded overflow-hidden">
                                              <div className="px-3 py-1 bg-gray-100 text-xs font-semibold text-gray-600">
                                                Example {tcIdx + 1}
                                              </div>
                                              <div className="grid grid-cols-2 divide-x divide-gray-200">
                                                <div className="p-3">
                                                  <div className="text-xs font-semibold text-gray-600 mb-1">Input</div>
                                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">{tc.input || '(empty)'}</pre>
                                                </div>
                                                <div className="p-3">
                                                  <div className="text-xs font-semibold text-gray-600 mb-1">Output</div>
                                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">{tc.output || '(empty)'}</pre>
                                                </div>
                                              </div>
                                              {tc.explanation && (
                                                <div className="px-3 pb-3">
                                                  <div className="text-xs font-semibold text-gray-600 mb-1">Explanation</div>
                                                  <p className="text-xs text-gray-700">{tc.explanation}</p>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Tags */}
                                    {problem.tags && problem.tags.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Tags</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {problem.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{tag}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-4 text-center">
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
                    className="bg-blue-800 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-900 transition-colors flex items-center gap-1"
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
                    placeholder="Enter announcement text..."
                    className="w-full p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                      className="px-2 py-1 bg-blue-800 text-white rounded text-xs font-medium hover:bg-blue-900 transition-colors"
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
                        <span className="text-xs text-gray-500">by {announcement.author || 'Admin'}</span>
                      </div>
                      <p className="text-gray-700 text-xs">{announcement.text}</p>
                      {announcement.problem_index && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            Problem {announcement.problem_index}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center">
                    <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-gray-500 text-xs">No announcements yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contest Info */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Contest Information
                </h2>
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-700">
                  <p className="mb-1">
                    <span className="font-medium">Platform: </span>
                    {contestData.platform || 'Custom Platform'}
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">Participants: </span>
                    {contestData.participants || 0}
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">Your Role: </span>
                    {contestData.is_creator ? 'Creator' : 'Participant'}
                  </p>
                  <p>
                    <span className="font-medium">Access: </span>
                    {contestData.access?.can_access ? 'Full Access' : 'Limited Access'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestInside;