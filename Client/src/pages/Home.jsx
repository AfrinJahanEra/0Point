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
import { X } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Home = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [activeVisualization, setActiveVisualization] = useState('');
  const [registeredContests, setRegisteredContests] = useState(new Set());
  
  // Blog states for like/dislike and comments
  const [blogLikes, setBlogLikes] = useState({});
  const [blogDislikes, setBlogDislikes] = useState({});
  const [showComments, setShowComments] = useState({});
  const [blogComments, setBlogComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [blogs, setBlogs] = useState([]);
  const [showFullContent, setShowFullContent] = useState({});
  
  // Upcoming contests state - use from cache
  const [upcomingContests, setUpcomingContests] = useState([]);
  
  // Past contests state - use from cache
  const [pastContests, setPastContests] = useState([]);
  
  // Live contests state - use from cache
  const [liveContests, setLiveContests] = useState([]);
  
  // Soonest contest state for countdown
  const [soonestContest, setSoonestContest] = useState(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Contributions state
  const [contributions, setContributions] = useState([]);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [announcementLikes, setAnnouncementLikes] = useState({});
  const [announcementDislikes, setAnnouncementDislikes] = useState({});
  const [showAnnouncementFullContent, setShowAnnouncementFullContent] = useState({});

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // Single loading state for dashboard
  const [loading, setLoading] = useState(true);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
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

  // Apply dashboard API response data to all state variables
  const applyDashboardData = (data) => {
    setUpcomingContests(data.upcoming_contests || []);
    setLiveContests(data.live_contests || []);
    setPastContests(data.past_contests || []);
    setBlogs(data.blogs || []);
    setAnnouncements(data.announcements || []);
    setLeaderboardData(data.leaderboard || []);
    setContributions(data.contributions || []);
    setRegisteredContests(new Set(data.registered_contest_ids || []));
    if (data.soonest_contest) {
      setSoonestContest(data.soonest_contest);
      setTimeLeft({
        days:    data.soonest_contest.time_until?.days    || 0,
        hours:   data.soonest_contest.time_until?.hours   || 0,
        minutes: data.soonest_contest.time_until?.minutes || 0,
        seconds: data.soonest_contest.time_until?.seconds || 0,
      });
    } else {
      setSoonestContest(null);
    }
  };

  // Single unified fetch for all dashboard data - FASTER LOADING
  // Uses stale-while-revalidate: show cached data instantly, then refresh.
  const CACHE_KEY    = 'home_dashboard_cache';
  const CACHE_TS_KEY = 'home_dashboard_cache_ts';
  const CACHE_MAX_AGE = 2 * 60 * 1000; // 2 minutes client-side cache

  const fetchDashboardData = async () => {
    // --- 1. Show stale data immediately (zero-latency first paint) ---
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);
      const isFresh = (Date.now() - cachedAt) < CACHE_MAX_AGE;

      if (cached) {
        const cachedData = JSON.parse(cached);
        applyDashboardData(cachedData);
        setLoading(false);      // Remove all spinners instantly
        if (isFresh) return;    // Fresh enough — skip network call
      }
    } catch (_) { /* ignore parse errors */ }

    // --- 2. Background refresh from server ---
    try {
      const response = await api.get('/home/dashboard/');
      const data = response.data;
      applyDashboardData(data);
      // Persist to localStorage for next visit
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (_) { /* ignore quota errors */ }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don’t show toast if we already have cached data showing
      if (!localStorage.getItem(CACHE_KEY)) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };


  // Fetch AI recommendations (only for logged-in users)
  const fetchRecommendations = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Skip if not logged in
    
    try {
      setRecommendationsLoading(true);
      const response = await api.get('/account/recommend-problems/');
      if (response.data.success && response.data.recommendations) {
        setRecommendations(response.data.recommendations.slice(0, 5)); // Top 5 only
      }
    } catch (error) {
      console.error('Recommendations fetch error:', error);
      // Silently fail - recommendations are optional enhancement
    } finally {
      setRecommendationsLoading(false);
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

  // Fetch all dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
    fetchRecommendations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Announcement handlers
  const handleAnnouncementLike = (announcementId) => {
    setAnnouncementLikes(prev => ({
      ...prev,
      [announcementId]: (prev[announcementId] || 0) + 1
    }));
    toast.success('Announcement liked!');
  };

  const handleAnnouncementDislike = (announcementId) => {
    setAnnouncementDislikes(prev => ({
      ...prev,
      [announcementId]: (prev[announcementId] || 0) + 1
    }));
    toast.success('Announcement disliked!');
  };

  const toggleAnnouncementContent = (announcementId) => {
    setShowAnnouncementFullContent(prev => ({
      ...prev,
      [announcementId]: !prev[announcementId]
    }));
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
                    <h2 className="text-xs font-semibold text-gray-900">Upcoming Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
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
                            : 'text-gray-600 hover:text-blue-700'
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
                {loading ? (
                  <div className="space-y-2 py-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
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
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">

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
                                <span>{contest.duration}</span>
                                <span>{contest.participants || 0} participants</span>
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
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-gray-500 text-white hover:bg-gray-600"
                              >
                                Visit
                              </a>
                            ) : isRegistered ? (
                              // Registered - Show status based on whether contest started
                              contestStarted ? (
                                <button
                                  onClick={() => handleContestEntry(contest, 'upcoming')}
                                  className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Enter
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded font-medium text-xs bg-blue-100 text-blue-700">
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
                {activeTab === 'registered' && upcomingContests.filter(c => !c.is_external && (registeredContests.has(c.id) || c.is_registered)).length === 0 && !loading && (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500">No registered contests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contest Countdown - Only 0Point Contests */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                {loading ? (
                  <div className="py-4 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-2" />
                    <div className="flex justify-center gap-3 mt-2">
                      {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 bg-gray-200 rounded-lg" />)}
                    </div>
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
                        <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-medium">
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
                    <h2 className="text-xs font-semibold text-gray-900">Recent Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <div className="space-y-2 py-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                            <div className="h-2 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : pastContests.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No past contests</p>
                    </div>
                  ) : (
                    pastContests.slice(0, 3).map((contest) => (
                      <div 
                        key={contest.id}
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">
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
                              className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-gray-800 text-white hover:bg-gray-900"
                            >
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
                    <h2 className="text-xs font-semibold text-gray-900">Leaderboard</h2>
                  </div>
                  <Link 
                    to="/leaderboard" 
                    className="text-gray-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                  </Link>
                </div>
              </div>

              <div className="px-7">
                {loading ? (
                  <div className="space-y-2 py-2 animate-pulse">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <div className="w-5 h-4 bg-gray-200 rounded" />
                        <div className="w-6 h-6 bg-gray-200 rounded-full" />
                        <div className="flex-1 h-2.5 bg-gray-200 rounded" />
                        <div className="w-10 h-2.5 bg-gray-200 rounded" />
                      </div>
                    ))}
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
                        <tr key={user.rank} className="border-b border-gray-100 hover:bg-blue-50">
                          <td className="py-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-medium text-gray-900">
                              {user.rank}
                            </div>
                          </td>
                          <td className="py-2">
                            <Link 
                              to={`/user/${user.user_id}`}
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
            {/* Featured Announcement */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-semibold text-gray-900">Featured Announcement</h2>
                  </div>
                </div>
                
                {loading ? (
                  <div className="p-6 space-y-3 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-2 bg-gray-200 rounded w-full" />
                    <div className="h-2 bg-gray-200 rounded w-4/5" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-gray-600">No announcements yet</p>
                  </div>
                ) : (
                  <div className="mb-2 p-3 border-b border-gray-100 last:border-b-0">
                    {/* Profile Avatar and Author Section */}
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${announcements[0]?.author_id ? 'cursor-pointer' : ''}`}
                        onClick={() => announcements[0]?.author_id && navigate(`/user/${announcements[0].author_id}`)}
                      >
                        {announcements[0]?.author ? announcements[0].author.charAt(0).toUpperCase() : 'A'}
                      </div>
                      
                      <div className="flex flex-col">
                        {announcements[0]?.author_id ? (
                          <Link 
                            to={`/user/${announcements[0].author_id}`}
                            className="text-xs font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {announcements[0]?.author || 'Admin'}
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-gray-900">
                            {announcements[0]?.author || 'Admin'}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {announcements[0]?.created_at ? new Date(announcements[0].created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Unknown date'}, {announcements[0]?.created_at ? new Date(announcements[0].created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 ml-auto">
                        {announcements[0]?.is_pinned && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                            Pinned
                          </span>
                        )}
                        {announcements[0]?.is_important && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">
                            Important
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-xs font-semibold text-gray-900 mb-1.5">{announcements[0]?.topic || 'Announcement'}</h3>
                    
                    <div className="prose prose-sm max-w-none text-xs line-clamp-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkBreaks]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                      >
                        {announcements[0]?.text}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="flex justify-end items-center mt-2">
                      <button 
                        onClick={() => setSelectedAnnouncement(announcements[0])}
                        className="text-xs text-blue-800 hover:text-blue-900 transition-colors duration-200 font-bold"
                      >
                        Read More
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Featured Blog Posts - Show 3 */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-semibold text-gray-900">Featured Blog Post</h2>
                  </div>
                  <Link 
                    to="/community"
                    className="text-blue-800 hover:text-blue-900 transition-colors duration-200 flex items-center gap-1 text-xs font-medium"
                  >
                    View All
                  </Link>
                </div>
                
                {loading ? (
                  <div className="p-4 space-y-3 animate-pulse">
                    {[1,2,3].map(i => (
                      <div key={i} className="space-y-1.5 border border-gray-100 rounded-lg p-3">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-2 bg-gray-200 rounded w-full" />
                        <div className="h-2 bg-gray-200 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : blogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-gray-600">No blogs yet</p>
                  </div>
                ) : (
                  blogs.slice(0, 3).map((post) => (
                    <div key={post.id} className="mb-2 p-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors duration-200">
                      {/* Profile Avatar and Username Section */}
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${post.author?.id ? 'cursor-pointer' : ''}`}
                          onClick={() => post.author?.id && navigate(`/user/${post.author.id}`)}
                        >
                          {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        
                        <div className="flex flex-col">
                          {post.author?.id ? (
                            <Link 
                              to={`/user/${post.author.id}`}
                              className="text-xs font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {post.author?.name || 'Unknown User'}
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {post.author?.name || 'Unknown User'}
                            </span>
                          )}
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
                      
                      <div className="prose prose-sm max-w-none text-xs line-clamp-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkBreaks]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                          components={customComponents}
                        >
                          {post.content}
                        </ReactMarkdown>
                      </div>
                      
                      <div className="flex justify-end items-center mt-2">
                        <Link 
                          to={`/community?blog=${post.id}`}
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
            <div className="bg-white rounded-lg border-l-4 border-red-500">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-red-100 bg-red-50">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">LIVE</span>
                    </span>
                    <h2 className="text-xs font-semibold text-gray-900">Running Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <div className="space-y-2 py-2">
                      {[1,2].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                            <div className="h-2 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : liveContests.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No running contests</p>
                    </div>
                  ) : (
                    liveContests.slice(0, 3).map((contest) => (
                      <div 
                        key={contest.id}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors duration-200 border-l-2 border-red-300 hover:border-red-400"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 flex-1">
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
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-red-600 text-white hover:bg-red-700"
                              >
                                Join
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(contest.id)}
                                className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-blue-800 text-white hover:bg-blue-900"
                              >
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
                    <h2 className="text-xs font-semibold text-gray-900">Announcements</h2>
                  </div>
                </div>

                <div className="space-y-2 p-2">
                  {loading ? (
                    <div className="space-y-2 p-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="animate-pulse p-3 rounded-lg border border-gray-100">
                          <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-1.5" />
                          <div className="h-2 bg-gray-200 rounded w-full mb-1" />
                          <div className="h-2 bg-gray-200 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-gray-500">No announcements</p>
                    </div>
                  ) : (
                    announcements.map((announcement) => (
                      <div 
                        key={announcement.id}
                        onClick={() => setSelectedAnnouncement(announcement)}
                        className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
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
        <h2 className="text-xs font-semibold text-gray-900">Top Contributors</h2>
      </div>
    </div>
  </div>

  <div className="p-3">
    {loading ? (
      <div className="space-y-2 py-2">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-2 p-2">
            <div className="w-4 h-2.5 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="flex-1 h-2.5 bg-gray-200 rounded" />
            <div className="w-8 h-2.5 bg-gray-200 rounded" />
          </div>
        ))}
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
            <tr key={contributor.rank} className="border-b border-gray-100 hover:bg-blue-50">
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
                  to={`/user/${contributor.user_id}`}
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
                    <h2 className="text-xs font-semibold text-gray-900">Recommended Problem Sets</h2>
                  </div>
                  <Link 
                    to="/practice" 
                    className="text-gray-600 hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  {recommendationsLoading ? (
                    <div className="space-y-2 py-2 animate-pulse">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100">
                          <div className="flex-1 h-2.5 bg-gray-200 rounded" />
                          <div className="w-14 h-2.5 bg-gray-200 rounded" />
                          <div className="w-14 h-2.5 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left font-semibold text-gray-900 pb-2">Problem</th>
                          <th className="text-center font-semibold text-gray-900 pb-2">Difficulty</th>
                          <th className="text-center font-semibold text-gray-900 pb-2">Topic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendations.map((problem, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-blue-50">
                            <td className="py-2">
                              <a 
                                href={problem.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-900 font-bold hover:text-blue-800 hover:underline"
                              >
                                {problem.title}
                              </a>
                              <span className="ml-1.5 text-[10px] text-gray-400">{problem.platform}</span>
                            </td>
                            <td className="py-2 text-center text-gray-700">
                              {problem.difficulty}
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {Array.isArray(problem.tags) ? problem.tags[0] : problem.tags || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-4 text-center text-gray-500 text-xs">
                      <p>Sign in to get AI-powered recommendations</p>
                      <Link to="/practice" className="text-blue-600 hover:underline mt-1 inline-block">
                        Explore practice problems
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Popup Modal */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedAnnouncement.topic || 'Announcement'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center gap-2 mb-3">
                {selectedAnnouncement.is_pinned && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Pinned
                  </span>
                )}
                {selectedAnnouncement.is_important && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    Important
                  </span>
                )}
              </div>
              
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkBreaks]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                >
                  {selectedAnnouncement.text}
                </ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Posted by {selectedAnnouncement.author} on {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;