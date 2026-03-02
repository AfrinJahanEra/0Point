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
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [showFullContent, setShowFullContent] = useState({});

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 5,
    hours: 12,
    minutes: 30,
    seconds: 45
  });

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
  }, []);

  // Fetch blogs
  useEffect(() => {
    fetchLatestBlogs();
    fetchLeaderboard();
  }, []);

  const fetchLatestBlogs = async () => {
    try {
      setLoadingBlogs(true);
      // Use the published endpoint from your backend
      const response = await api.get('/blog/published/');
      // Get only the 3 most recent blogs for the home page
      setBlogs(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load latest blogs');
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      // Using the minimal leaderboard endpoint we created
      const response = await api.get('/leaderboard/minimal/');
      // Get only top 5 for the home page
      setLeaderboardData(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const contests = [
    {
      id: 1,
      title: "IUT Winter Coding Challenge",
      platform: "IUT Platform",
      date: "Dec 15, 2023 • 18:00",
      duration: "3 hours",
      participants: "500+",
      difficulty: "Medium",
      type: "Team",
      status: "upcoming",
      registered: true
    },
    {
      id: 2,
      title: "Algorithm Masters 2024",
      platform: "IUT Platform",
      date: "Dec 18, 2023 • 20:00",
      duration: "2.5 hours",
      participants: "300+",
      difficulty: "Hard",
      type: "Individual",
      status: "upcoming",
      registered: false
    },
    {
      id: 3,
      title: "Data Structures Sprint",
      platform: "IUT Platform",
      date: "Dec 22, 2023 • 16:00",
      duration: "2 hours",
      participants: "400+",
      difficulty: "Easy",
      type: "Individual",
      status: "upcoming",
      registered: true
    }
  ];

  const pastContests = [
    {
      id: 4,
      title: "Fall Coding Championship",
      platform: "Codeforces",
      date: "Nov 10, 2023",
      participants: "1200+",
      difficulty: "Hard",
      status: "completed"
    },
    {
      id: 5,
      title: "Beginner's Contest #12",
      platform: "AtCoder",
      date: "Nov 5, 2023",
      participants: "800+",
      difficulty: "Easy",
      status: "completed"
    }
  ];

  const announcements = [
    {
      id: 1,
      title: "New Practice Problems Added",
      content: "We've added 50 new practice problems covering dynamic programming and graph theory.",
      date: "2 hours ago",
      priority: "high"
    },
    {
      id: 2,
      title: "System Maintenance Notice",
      content: "Scheduled maintenance on Sunday, Dec 10th from 2AM-4AM. Some services may be temporarily unavailable.",
      date: "1 day ago",
      priority: "medium"
    },
    {
      id: 3,
      title: "Winter Coding Challenge Registration Open",
      content: "Register now for the upcoming Winter Coding Challenge with exciting prizes.",
      date: "2 days ago",
      priority: "high"
    }
  ];

  // Functions for like/dislike and comments
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
    
    // Initialize comments array if not exists
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

  const handleRegister = (contestId) => {
    setRegisteredContests(prev => new Set([...prev, contestId]));
  };

  const handleVisualizationClick = (type) => {
    setActiveVisualization(type);
    // In a real app, this would trigger actual visualizations
    console.log(`Visualization clicked: ${type}`);
    
    // Simulate visualization loading
    setTimeout(() => {
      // Reset after showing "visualization"
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
                {contests.map((contest) => (
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
                          <h3 className="font-medium text-gray-900 text-xs">
                            {contest.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {contest.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {contest.participants}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Single Button Column */}
                      <div className="flex flex-col items-end gap-1">
                        <button 
                          className={`px-2 py-1 rounded font-medium text-xs transition-all duration-200 flex items-center gap-1 ${
                            registeredContests.has(contest.id) || contest.registered
                              ? 'bg-blue-800 text-white cursor-not-allowed'
                              : 'bg-blue-800 text-white hover:bg-blue-900'
                          }`}
                          onClick={() => !registeredContests.has(contest.id) && !contest.registered && handleRegister(contest.id)}
                          disabled={registeredContests.has(contest.id) || contest.registered}
                        >
                          {registeredContests.has(contest.id) || contest.registered ? (
                            <>
                              <Play className="w-2.5 h-2.5" />
                              Participate
                            </>
                          ) : (
                            <>
                              <Eye className="w-2.5 h-2.5" />
                              Register
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contest Countdown */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1.5">IUT Winter Coding Challenge</div>
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
                  <button className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200">
                    Register Now
                  </button>
                </div>
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
                  {pastContests.map((contest) => (
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
                              <span>{contest.platform}</span>
                              <span>{contest.date}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Single Button */}
                        <div className="flex items-center gap-1">
                          <button className="px-2 py-1 rounded font-medium text-xs transition-all duration-200 bg-blue-800 text-white hover:bg-blue-900">
                            Practice
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
            {/* Recent Blog Post - Added like/dislike and comments */}
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
                        {/* Profile Avatar with user initials */}
                        <div 
                          className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer"
                          onClick={() => navigate(`/profile/${post.author?.name}`)}
                        >
                          {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        
                        {/* Username and Date */}
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
                          {/* Add Comment */}
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

                          {/* Comments List */}
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
            {/* All Announcements */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">All Announcements</h2>
                  </div>
                  <Link 
                    to="/blog" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
                  >
                    View All
                    <ChevronRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

                <div className="space-y-2">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id}
                      className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h3 className="text-xs font-semibold text-gray-900 mb-1">{announcement.title}</h3>
                      <p className="text-xs text-gray-600 mb-1.5">{announcement.content}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{announcement.date}</span>
                        <button className="text-xs text-blue-800 hover:text-blue-900 transition-colors duration-200 font-bold">
                          Read More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Problem Sets (Table Format) */}
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
