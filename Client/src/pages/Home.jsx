import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Trophy, 
  Users, 
  BookOpen, 
  ChevronRight,
  Play,
  Award,
  Clock,
  Calendar,
  Eye,
  Plus,
  BarChart3,
  Medal,
  Zap,
  TrendingUp,
  Bell,
  MessageSquare,
  Settings,
  Cpu,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useContests } from '../context/ContestContext';

const Home = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [activeVisualization, setActiveVisualization] = useState('');
  const [registeredContests, setRegisteredContests] = useState(new Set());
  
  // Use contest context for cached data
  const { fetchAllContests, contestsCache, isCacheValid } = useContests();
  
  // Blog states for like/dislike and comments
  const [blogLikes, setBlogLikes] = useState({});
  const [blogDislikes, setBlogDislikes] = useState({});
  const [showComments, setShowComments] = useState({});
  const [blogComments, setBlogComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [showFullContent, setShowFullContent] = useState({});
  
  // Upcoming contests state - use from cache
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [loadingContests, setLoadingContests] = useState(false);
  
  // Past contests state - use from cache
  const [pastContests, setPastContests] = useState([]);
  const [loadingPastContests, setLoadingPastContests] = useState(false);
  
  // Live contests state - use from cache
  const [liveContests, setLiveContests] = useState([]);
  const [loadingLiveContests, setLoadingLiveContests] = useState(false);
  
  // Soonest contest state for countdown
  const [soonestContest, setSoonestContest] = useState(null);
  const [loadingSoonest, setLoadingSoonest] = useState(false);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Add with your other useState declarations
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 5,
    hours: 12,
    minutes: 30,
    seconds: 45
  });

  // Fetch registered contests
  const fetchRegisteredContests = async () => {
    try {
      const response = await api.get('/contests/registrations/');
      const registeredIds = response.data.registered_contests || [];
      setRegisteredContests(new Set(registeredIds));
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  // Get platform badge styling - professional blue/gray theme
  const getPlatformBadge = (platform) => {
    const badges = {
      '0point': { label: '0Point', color: 'bg-blue-600 text-white' },
      'cf': { label: 'CF', color: 'bg-gray-600 text-white' },
      'codeforces': { label: 'CF', color: 'bg-gray-600 text-white' },
      'lc': { label: 'LC', color: 'bg-gray-500 text-white' },
      'leetcode': { label: 'LC', color: 'bg-gray-500 text-white' },
      'cc': { label: 'CC', color: 'bg-gray-700 text-white' },
      'codechef': { label: 'CC', color: 'bg-gray-700 text-white' },
      'ac': { label: 'AC', color: 'bg-slate-600 text-white' },
      'atcoder': { label: 'AC', color: 'bg-slate-600 text-white' }
    };
    return badges[platform?.toLowerCase()] || { label: platform, color: 'bg-gray-500 text-white' };
  };

  // Check if contest has started
  const hasContestStarted = (contest) => {
    if (!contest.start_time) return false;
    const startTime = new Date(contest.start_time);
    return startTime <= new Date();
  };

const fetchContributions = async () => {
  try {
    setLoadingContributions(true);
    const response = await api.get('/contributions/ranking/');
    console.log('Raw API response:', response);
    console.log('Response data:', response.data);
    
    // The API returns { count: 1, ranking: [...] }
    // So we need to use response.data.ranking
    setContributions(response.data.ranking || []);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    toast.error('Failed to load contributions');
  } finally {
    setLoadingContributions(false);
  }
};

  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const response = await api.get('/announcements/platform/?limit=5');
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  // Update countdown timer every second
  useEffect(() => {
    if (!soonestContest) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.days === 0 && prev.hours === 0 && prev.minutes === 0 && prev.seconds === 0) {
          clearInterval(timer);
          return prev;
        }
        
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soonestContest]);

  // Fetch all data - contests fetched only ONCE
  useEffect(() => {
    const initializeData = async () => {
      // Fetch contests data ONCE (cached for 5 minutes)
      await fetchAllContests(false);
      
      // Fetch other data
      fetchLatestBlogs();
      fetchLeaderboard();
      fetchPastContests();
      fetchSoonestContest();
      fetchLiveContests();
      fetchContributions();
      fetchAnnouncements();
    };
    
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLatestBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const response = await api.get('/blog/published/');
      setBlogs(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load latest blogs');
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Update upcoming contests from cache when it changes\n  useEffect(() => {\n    if (contestsCache.upcoming && contestsCache.external) {\n      const internalContests = (contestsCache.upcoming || []).map(c => ({\n        ...c,\n        platform: '0point',\n        is_external: false\n      }));\n      \n      // Transform external contests to match internal format\n      const externalContests = (contestsCache.external || [])\n        .filter(c => {\n          const startTime = new Date(c.start_time);\n          return startTime > new Date(); // Only upcoming\n        })\n        .map(c => ({\n          id: `external_${c.platform}_${c.external_id}`,\n          title: c.title,\n          start_time: c.start_time,\n          end_time: c.end_time,\n          duration: c.duration_formatted || c.duration || 'N/A',\n          participants: c.participants || 0,\n          platform: c.platform,\n          is_external: true,\n          external_url: c.url,\n          status: 'upcoming'\n        }));\n      \n      console.log('Processed internal:', internalContests.length);\n      console.log('Processed external:', externalContests.length);\n      \n      // Combine and sort by start_time (soonest first)\n      const allContests = [...internalContests, ...externalContests].sort((a, b) => {\n        const dateA = new Date(a.start_time);\n        const dateB = new Date(b.start_time);\n        return dateA - dateB;\n      });\n      \n      console.log('All contests sorted:', allContests);\n      \n      setUpcomingContests(allContests);\n      setLoadingContests(false);\n    }\n  }, [contestsCache.upcoming, contestsCache.external]);\n\n  // Update live contests from cache\n  useEffect(() => {\n    if (contestsCache.live) {\n      setLiveContests(contestsCache.live || []);\n      setLoadingLiveContests(false);\n    }\n  }, [contestsCache.live]);\n\n  // Update past contests from cache\n  useEffect(() => {\n    if (contestsCache.past) {\n      setPastContests(contestsCache.past || []);\n      setLoadingPastContests(false);\n    }\n  }, [contestsCache.past]);\n\n  // Update registered contests from cache\n  useEffect(() => {\n    if (contestsCache.registrations) {\n      setRegisteredContests(new Set(contestsCache.registrations || []));\n    }\n  }, [contestsCache.registrations]);\n
    } catch (error) {
      console.error('Error fetching past contests:', error);
      toast.error('Failed to load past contests');
      setPastContests([]);
    } finally {
      setLoadingPastContests(false);
    }
  };

  const fetchSoonestContest = async () => {
    try {
      setLoadingSoonest(true);
      const response = await api.get('/contests/soonest/');
      
      if (response.data.has_contest) {
        setSoonestContest(response.data);
        setTimeLeft({
          days: response.data.time_until.days,
          hours: response.data.time_until.hours,
          minutes: response.data.time_until.minutes,
          seconds: response.data.time_until.seconds
        });
      } else {
        setSoonestContest(null);
      }
    } catch (error) {
      console.error('Error fetching soonest contest:', error);
      setSoonestContest(null);
    } finally {
      setLoadingSoonest(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await api.get('/leaderboard/minimal/');
      setLeaderboardData(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Blog functions
  const handleBlogLike = (blogId) => {
    setBlogLikes(prev => ({
      ...prev,
      [blogId]: (prev[blogId] || 0) + 1
    }));
    toast.success('Blog liked!');
  };

  const handleBlogDislike = (blogId) => {
    setBlogDislikes(prev => ({
      ...prev,
      [blogId]: (prev[blogId] || 0) + 1
    }));
    toast.success('Blog disliked!');
  };

  const toggleComments = (blogId) => {
    setShowComments(prev => ({
      ...prev,
      [blogId]: !prev[blogId]
    }));
    
    if (!blogComments[blogId]) {
      setBlogComments(prev => ({
        ...prev,
        [blogId]: []
      }));
    }
  };

  const toggleContent = (blogId) => {
    setShowFullContent(prev => ({
      ...prev,
      [blogId]: !prev[blogId]
    }));
  };

  const handleAddComment = (blogId) => {
    const comment = newComment[blogId];
    if (!comment || !comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    const newCommentObj = {
      id: Date.now(),
      author: "Current User",
      content: comment,
      date: new Date().toLocaleDateString(),
      likes: 0,
      dislikes: 0
    };

    setBlogComments(prev => ({
      ...prev,
      [blogId]: [...(prev[blogId] || []), newCommentObj]
    }));

    setNewComment(prev => ({
      ...prev,
      [blogId]: ''
    }));

    toast.success('Comment added!');
  };

  const handleCommentLike = (blogId, commentId) => {
    setBlogComments(prev => ({
      ...prev,
      [blogId]: prev[blogId].map(comment => 
        comment.id === commentId 
          ? { ...comment, likes: (comment.likes || 0) + 1 }
          : comment
      )
    }));
  };

  const handleCommentDislike = (blogId, commentId) => {
    setBlogComments(prev => ({
      ...prev,
      [blogId]: prev[blogId].map(comment => 
        comment.id === commentId 
          ? { ...comment, dislikes: (comment.dislikes || 0) + 1 }
          : comment
      )
    }));
  };

  const handleRegister = async (contestId) => {
    try {
      await api.post(`/contests/${contestId}/register/`, {});
      
      setRegisteredContests(prev => new Set([...prev, contestId]));
      
      setUpcomingContests(prev => 
        prev.map(contest => 
          contest.id === contestId 
            ? { ...contest, is_registered: true } 
            : contest
        )
      );
      
      setLiveContests(prev => 
        prev.map(contest => 
          contest.id === contestId 
            ? { ...contest, is_registered: true } 
            : contest
        )
      );
      
      // Update soonest contest if it matches
      if (soonestContest && soonestContest.contest_id === contestId) {
        setSoonestContest(prev => ({ ...prev, is_registered: true }));
      }
      
      toast.success('Successfully registered for contest!');
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const handleContestEntry = async (contest, type = 'upcoming') => {
    const { id, status } = contest;

    if (status === 'draft') {
      navigate(`/contests/${id}/edit`);
      return;
    }

    if (status === 'upcoming' || status === 'live' || status === 'past') {
      try {
        const res = await api.get(`/contests/${id}/problems/`);
        
        if ((res.data.problems || []).length === 0 && status !== 'past') {
          toast.error('No problems available yet.');
          return;
        }
        
        navigate(`/contests/${id}`);
        
      } catch (err) {
        if (err.response?.status === 403 && err.response.data?.can_register) {
          const shouldRegister = window.confirm(`You need to register for this ${status} contest. Register now?`);
          if (shouldRegister) {
            const registered = await handleRegister(id);
            if (registered) {
              try {
                await api.get(`/contests/${id}/problems/`);
                navigate(`/contests/${id}`);
              } catch {
                navigate(`/contests/${id}/register`);
              }
            }
          }
        } else {
          toast.error(err.response?.data?.message || 'Cannot access contest.');
        }
      }
    }
  };

  const handleVisualizationClick = (type) => {
    setActiveVisualization(type);
    console.log(`Visualization clicked: ${type}`);
    
    setTimeout(() => {
      setActiveVisualization('');
    }, 2000);
  };

  // Markdown components for rendering
  const customComponents = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-800 leading-relaxed mb-3">{children}</p>
    ),
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 text-sm text-gray-900 rounded font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto" {...props}>
          {children}
        </code>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc ml-6 mb-3 space-y-1 text-sm">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 mb-3 space-y-1 text-sm">{children}</ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-400 pl-4 py-2 my-3 bg-gray-50 text-sm text-gray-800">
        {children}
      </blockquote>
    ),
  };

  const renderVisualization = () => {
    if (!activeVisualization) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 capitalize text-sm">
            {activeVisualization} Visualization
          </h3>
          <span className="text-xs text-gray-500">Demo Preview</span>
        </div>
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Cpu className="w-10 h-10 text-blue-500 animate-pulse" />
          </div>
          <p className="text-gray-600 mb-2 text-sm">
            {activeVisualization === 'progress' && "Loading your coding progress chart..."}
            {activeVisualization === 'comparison' && "Generating comparison analytics..."}
            {activeVisualization === 'performance' && "Building performance metrics..."}
            {activeVisualization === 'distribution' && "Calculating problem distribution..."}
          </p>
          <div className="text-xs text-gray-500">
            Visualization would appear here in full implementation
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Contest Section */}
          <div className="lg:col-span-3 space-y-4">

            {/* Upcoming Contests */}
            <div className="bg-white">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Upcoming Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {['all', 'registered'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                          activeTab === tab 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contests List */}
              <div className="p-3 space-y-2">
                {loadingContests ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Loading contests...</p>
                  </div>
                ) : upcomingContests.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No upcoming contests</p>
                  </div>
                ) : (
                  upcomingContests
                    .filter(contest => {
                      if (activeTab === 'registered') {
                        // For internal contests, check registration
                        if (!contest.is_external) {
                          return registeredContests.has(contest.id) || contest.is_registered;
                        }
                        // External contests can't be registered on our platform
                        return false;
                      }
                      return true;
                    })
                    .slice(0, 5)
                    .map((contest) => {
                      const isRegistered = !contest.is_external && (registeredContests.has(contest.id) || contest.is_registered);
                      const contestStarted = hasContestStarted(contest);
                      const platformBadge = getPlatformBadge(contest.platform);
                    
                    return (
                      <div 
                        key={contest.id}
                        className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platformBadge.color}`}>
                                  {platformBadge.label}
                                </span>
                                <h3 className="font-medium text-gray-900 text-xs truncate max-w-[150px]">
                                  {contest.title}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {contest.duration}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />
                                  {contest.participants || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex items-center gap-1">
                            {contest.is_external ? (
                              // External contest - Visit button
                              <a
                                href={contest.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-1"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                Visit
                              </a>
                            ) : isRegistered ? (
                              // Registered - Show status based on whether contest started
                              contestStarted ? (
                                <button
                                  onClick={() => handleContestEntry(contest, 'upcoming')}
                                  className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                                >
                                  <Play className="w-2.5 h-2.5" />
                                  Enter
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded font-medium text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  Registered
                                </span>
                              )
                            ) : (
                              // Not registered - Show Register button
                              <button
                                onClick={() => handleRegister(contest.id)}
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-blue-800 text-white hover:bg-blue-900 flex items-center gap-1"
                              >
                                Register
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Show message when no registered contests in Registered tab */}
                {activeTab === 'registered' && upcomingContests.filter(c => !c.is_external && (registeredContests.has(c.id) || c.is_registered)).length === 0 && !loadingContests && (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No registered contests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contest Countdown - Only 0Point Contests */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                {loadingSoonest ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Loading countdown...</p>
                  </div>
                ) : soonestContest ? (
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1.5">{soonestContest.title}</div>
                    <div className="flex justify-center gap-1 mb-2">
                      <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                        <div className="text-xs font-bold text-gray-900">{timeLeft.days.toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Days</div>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                        <div className="text-xs font-bold text-gray-900">{timeLeft.hours.toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Hours</div>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                        <div className="text-xs font-bold text-gray-900">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Minutes</div>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                        <div className="text-xs font-bold text-gray-900">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Seconds</div>
                      </div>
                    </div>
                    {/* Show appropriate button based on registration and contest status */}
                    {registeredContests.has(soonestContest.contest_id) || soonestContest.is_registered ? (
                      // User is registered
                      timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 ? (
                        // Contest has started - can enter
                        <button 
                          onClick={() => navigate(`/contests/${soonestContest.contest_id}`)}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors duration-200"
                        >
                          Enter Contest
                        </button>
                      ) : (
                        // Contest not started - show registered status
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-medium">
                          <Clock className="w-3 h-3" />
                          Registered
                        </span>
                      )
                    ) : (
                      // Not registered - show register button
                      <button 
                        onClick={() => handleRegister(soonestContest.contest_id)}
                        className="text-xs bg-blue-800 text-white px-3 py-1.5 rounded hover:bg-blue-900 transition-colors duration-200"
                      >
                        Register Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No upcoming contests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Past Contests */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Recent Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

                <div className="space-y-2">
                  {loadingPastContests ? (
                    <div className="py-4 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Loading past contests...</p>
                    </div>
                  ) : pastContests.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No past contests</p>
                    </div>
                  ) : (
                    pastContests.slice(0, 3).map((contest) => (
                      <div 
                        key={contest.id}
                        className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-xs">
                                {contest.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                <span>{contest.platform || 'IUT Platform'}</span>
                                <span>{contest.participants || 0} participants</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Single Button */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleContestEntry(contest, 'past')}
                              className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-gray-800 text-white hover:bg-gray-900 flex items-center gap-1"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Leaderboard</h2>
                  </div>
                  <Link 
                    to="/leaderboard" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>

              <div className="px-7">
                {loadingLeaderboard ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Loading...</p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No data available</p>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-900 pb-2">Rank</th>
                        <th className="text-left font-semibold text-gray-900 pb-2">Name</th>
                        <th className="text-right font-semibold text-gray-900 pb-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((user) => (
                        <tr key={user.rank} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-medium text-gray-900">
                              {user.rank}
                            </div>
                          </td>
                          <td className="py-2">
                            <Link 
                              to={`/profile/${user.username}`}
                              className="text-blue-900 font-bold hover:text-blue-800 hover:underline"
                            >
                              {user.username}
                            </Link>
                          </td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {user.total_points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>


          </div>

          {/* Middle Column - Main Content (Wider) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Recent Blog Post */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Featured Blog Post</h2>
                  </div>
                  <Link 
                    to="/blog" 
                    className="text-blue-800 hover:text-blue-900 transition-colors duration-200 flex items-center gap-1 text-xs font-medium"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
                
                {loadingBlogs ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-xs text-gray-600">Loading latest blogs...</p>
                  </div>
                ) : blogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">No blogs yet</p>
                  </div>
                ) : (
                  blogs.map((post) => (
                    <div key={post.id} className="mb-2 p-3 border-b border-gray-100 last:border-b-0">
                      {/* Profile Avatar and Username Section */}
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer"
                          onClick={() => navigate(`/profile/${post.author?.name}`)}
                        >
                          {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        
                        <div className="flex flex-col">
                          <Link 
                            to={`/profile/${post.author?.name}`}
                            className="text-xs font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {post.author?.name || 'Unknown User'}
                          </Link>
                          <span className="text-xs text-gray-500">
                            {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown date'}, {post.published_at ? new Date(post.published_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-xs font-semibold text-gray-900 mb-1.5">{post.title}</h3>
                      
                      <div className={`prose prose-sm max-w-none text-xs ${!showFullContent[post.id] ? 'line-clamp-4' : ''}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkBreaks]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                          components={customComponents}
                        >
                          {post.content}
                        </ReactMarkdown>
                      </div>
                      
                      {post.content && post.content.length > 300 && (
                        <button
                          onClick={() => toggleContent(post.id)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          {showFullContent[post.id] ? (
                            <>
                              <span>Show Less</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>Read More</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Like/Dislike Buttons */}
                      <div className="flex items-center gap-4 mt-3 mb-3">
                        <button 
                          onClick={() => handleBlogLike(post.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          Like {blogLikes[post.id] || 0}
                        </button>
                        <button 
                          onClick={() => handleBlogDislike(post.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                          </svg>
                          Dislike {blogDislikes[post.id] || 0}
                        </button>
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          Comments {blogComments[post.id]?.length || 0}
                        </button>
                      </div>

                      {/* Comments Section */}
                      {showComments[post.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="mb-3">
                            <textarea
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment({...newComment, [post.id]: e.target.value})}
                              placeholder="Write a comment..."
                              className="w-full p-2 border border-gray-300 rounded text-xs resize-y"
                              rows="2"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="mt-2 px-3 py-1 bg-blue-800 text-white text-xs rounded hover:bg-blue-900 transition-colors"
                            >
                              Post Comment
                            </button>
                          </div>

                          <div className="space-y-3">
                            {blogComments[post.id]?.map((comment) => (
                              <div key={comment.id} className="bg-gray-50 p-2 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-900">{comment.author}</span>
                                  <span className="text-xs text-gray-500">{comment.date}</span>
                                </div>
                                <p className="text-xs text-gray-700 mb-2">{comment.content}</p>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleCommentLike(post.id, comment.id)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600"
                                  >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                    {comment.likes || 0}
                                  </button>
                                  <button
                                    onClick={() => handleCommentDislike(post.id, comment.id)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600"
                                  >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                    </svg>
                                    {comment.dislikes || 0}
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(!blogComments[post.id] || blogComments[post.id].length === 0) && (
                              <p className="text-xs text-gray-500 text-center py-2">No comments yet. Be the first to comment!</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end items-center mt-2">
                        <Link 
                          to={`/blog/${post.id}`}
                          className="text-xs text-blue-800 hover:text-blue-900 transition-colors duration-200 font-bold"
                        >
                          Read More
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Visualization Demo */}
            {renderVisualization()}
          </div>

          {/* Right Sidebar - Additional Content */}
          <div className="lg:col-span-3 space-y-4">

            {/* Live Contests */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Running Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

                <div className="space-y-2">
                  {loadingLiveContests ? (
                    <div className="py-4 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Loading running contests...</p>
                    </div>
                  ) : liveContests.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No running contests</p>
                    </div>
                  ) : (
                    liveContests.slice(0, 3).map((contest) => (
                      <div 
                        key={contest.id}
                        className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-xs">
                                {contest.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                <span>{contest.platform || 'IUT Platform'}</span>
                                <span>{contest.participants || 0} participants</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Single Button */}
                          <div className="flex items-center gap-1">
                            {registeredContests.has(contest.id) || contest.is_registered ? (
                              <button
                                onClick={() => handleContestEntry(contest, 'live')}
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                              >
                                <Play className="w-2.5 h-2.5" />
                                Join
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(contest.id)}
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-1"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                Register
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* All Announcements */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Announcements</h2>
                  </div>
                  <Link 
                    to="/announcements" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

                <div className="space-y-2 p-2">
                  {loadingAnnouncements ? (
                    <div className="py-4 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Loading announcements...</p>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No announcements</p>
                    </div>
                  ) : (
                    announcements.map((announcement) => (
                      <div 
                        key={announcement.id}
                        className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-start gap-2">
                          {announcement.is_pinned && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                              Pinned
                            </span>
                          )}
                          {announcement.is_important && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">
                              Important
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900 mt-1 mb-1">
                          {announcement.topic || 'Announcement'}
                        </h3>
                        <div className="text-xs text-gray-600 mb-2 line-clamp-2 prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkBreaks]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                          >
                            {announcement.text?.slice(0, 150) + (announcement.text?.length > 150 ? '...' : '')}
                          </ReactMarkdown>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">
                            {announcement.author} - {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
{/* Contributions */}
<div className="bg-white rounded-lg">
  <div className="p-3 border-b border-gray-200">
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50">
      <div className="flex items-center gap-1.5">
        <Medal className="w-3.5 h-3.5 text-gray-700" />
        <h2 className="text-xs font-semibold text-gray-900">Top Contributors</h2>
      </div>
    </div>
  </div>

  <div className="p-3">
    {loadingContributions ? (
      <div className="py-4 text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-xs text-gray-500 mt-2">Loading contributors...</p>
      </div>
    ) : contributions.length === 0 ? (
      <div className="py-4 text-center">
        <p className="text-xs text-gray-500">No contributions yet</p>
      </div>
    ) : (
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left font-semibold text-gray-900 pb-2 w-12">Rank</th>
            <th className="text-left font-semibold text-gray-900 pb-2">Username</th>
            <th className="text-right font-semibold text-gray-900 pb-2 w-16">Points</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((contributor) => (
            <tr key={contributor.rank} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${contributor.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                    contributor.rank === 2 ? 'bg-gray-200 text-gray-700' : 
                    contributor.rank === 3 ? 'bg-orange-100 text-orange-700' : 
                    'bg-gray-100 text-gray-600'}
                `}>
                  {contributor.rank}
                </div>
              </td>
              <td className="py-2">
                <Link 
                  to={`/profile/${contributor.username}`}
                  className="text-blue-900 font-bold hover:text-blue-800 hover:underline"
                >
                  {contributor.name}
                </Link>
              </td>
              <td className="py-2 text-right font-medium text-gray-900">
                {contributor.total_contributions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</div>

            {/* Recommended Problem Sets */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Recommended Problem Sets</h2>
                  </div>
                  <Link 
                    to="/practice" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-900 pb-2">Problem</th>
                        <th className="text-center font-semibold text-gray-900 pb-2">Difficulty</th>
                        <th className="text-center font-semibold text-gray-900 pb-2">Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 1, title: "Two Sum", difficulty: "Easy", topic: "Arrays" },
                        { id: 2, title: "Binary Tree Traversal", difficulty: "Medium", topic: "Trees" },
                        { id: 3, title: "Dynamic Range Sum", difficulty: "Hard", topic: "Segment Trees" },
                        { id: 5, title: "String Matching", difficulty: "Easy", topic: "Strings" },
                        { id: 6, title: "Dynamic Programming Basics", difficulty: "Medium", topic: "DP" },
                        { id: 8, title: "Linked List Operations", difficulty: "Easy", topic: "LinkedList" },
                        { id: 9, title: "Backtracking Patterns", difficulty: "Medium", topic: "Recursion" },
                        { id: 11, title: "Sliding Window Technique", difficulty: "Medium", topic: "Arrays" },
                        { id: 12, title: "Heap Operations", difficulty: "Medium", topic: "Data Structures" },
                        { id: 13, title: "Bit Manipulation", difficulty: "Easy", topic: "Bits" },
                        { id: 14, title: "Greedy Algorithms", difficulty: "Medium", topic: "Algorithms" }
                      ].map((problem) => (
                        <tr key={problem.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2">
                            <Link to={`/problem/${problem.id}`} className="text-blue-900 font-bold hover:text-blue-800 hover:underline">
                              {problem.title}
                            </Link>
                          </td>
                          <td className="py-2 text-center text-gray-700">
                            {problem.difficulty}
                          </td>
                          <td className="py-2 text-center text-gray-600">
                            {problem.topic}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;