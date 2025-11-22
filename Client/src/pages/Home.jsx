import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const Home = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [activeVisualization, setActiveVisualization] = useState('');
  const [registeredContests, setRegisteredContests] = useState(new Set());

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 5,
    hours: 12,
    minutes: 30,
    seconds: 45
  });

  // Update countdown timer every second
  React.useEffect(() => {
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

  const topCoders = [
    { rank: 1, name: "Ahmed Mahmud", score: 2450, department: "CSE", change: "+25" },
    { rank: 2, name: "Sadia Rahman", score: 2310, department: "SWE", change: "+18" },
    { rank: 3, name: "Tahmid Rahman", score: 2250, department: "CSE", change: "+12" },
    { rank: 4, name: "Fariha Ahmed", score: 2180, department: "CSE", change: "-5" },
    { rank: 5, name: "Nafis Shams", score: 2100, department: "SWE", change: "+8" }
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

  const recommendedProblems = [
    {
      id: 1,
      title: "Two Sum",
      difficulty: "Easy",
      acceptance: "75%",
      topic: "Arrays"
    },
    {
      id: 2,
      title: "Binary Tree Traversal",
      difficulty: "Medium",
      acceptance: "68%",
      topic: "Trees"
    },
    {
      id: 3,
      title: "Dynamic Range Sum",
      difficulty: "Hard",
      acceptance: "42%",
      topic: "Segment Trees"
    }
  ];

  const blogPosts = [
    {
      id: 1,
      title: "Mastering Dynamic Programming Techniques",
      excerpt: "Learn advanced DP patterns and optimizations used in competitive programming contests.",
      date: "Nov 15, 2023",
      readTime: "8 min read"
    }
  ];

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
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Contest Section */}
          <div class="lg:col-span-3 space-y-4">
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
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left font-semibold text-gray-900 pb-2">Rank</th>
                      <th className="text-left font-semibold text-gray-900 pb-2">Name</th>
                      <th className="text-right font-semibold text-gray-900 pb-2">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCoders.map((coder) => (
                      <tr key={coder.rank} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-medium text-gray-900">
                            {coder.rank}
                          </div>
                        </td>
                        <td className="py-2">
                          <Link to={`/user/${coder.name.replace(/\s+/g, '-').toLowerCase()}`} className="text-blue-900 font-bold hover:text-blue-800 hover:underline">
                            {coder.name}
                          </Link>
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          {coder.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Middle Column - Main Content (Wider) */}
          <div class="lg:col-span-6 space-y-4">
            {/* Full Contest Announcement */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Contest Announcement</h2>
                  </div>
                </div>
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">AtCoder Beginner Contest 433</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Get ready for an exciting coding challenge! We're thrilled to announce the upcoming AtCoder Beginner Contest 433, specially designed for programmers at all skill levels to showcase their problem-solving abilities.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      Start Time: Sat, Nov 22, 2025 • 9:00 PM GMT+6
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Duration: 100 minutes of intense coding
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    <p><strong>Contest URL:</strong> <a href="https://atcoder.jp/contests/abc433" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://atcoder.jp/contests/abc433</a></p>
                    <p><strong>Problem Setter:</strong> sounansya</p>
                    <p><strong>Testers:</strong> MMNMM, kyopro_friends</p>
                    <p><strong>Rated range:</strong> Beginners to ~1999 rating</p>
                    <p><strong>Point values:</strong> 100 - 200 - 300 - 400 - 450 - 500 - 600</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-200">
                      AtCoder Contest
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <a href="https://atcoder.jp/contests/abc433" target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200">
                      Register Now
                    </a>
                    <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=20251122T2100&p1=248" target="_blank" rel="noopener noreferrer" className="text-xs border border-gray-300 text-gray-700 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors duration-200">
                      View Time Zone
                    </a>
                  </div>
                </div>
              </div>
            </div>

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
                {blogPosts.map((post) => (
                  <div key={post.id} className="mb-2">
                    <h3 className="text-xs font-semibold text-gray-900 mb-1.5">{post.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {post.excerpt} Dynamic programming is a powerful technique used in competitive programming to solve optimization problems 
                      by breaking them down into simpler subproblems. In this comprehensive guide, we'll explore the fundamental concepts, 
                      common patterns, and advanced optimization strategies that can help you master DP problems in contests.
                      <br /><br />
                      We'll start with the basics of memoization and tabulation, then move on to more complex patterns like bitmask DP, 
                      digit DP, and tree DP. You'll learn how to identify DP problems, formulate recurrence relations, and optimize 
                      your solutions for better time and space complexity. We'll also cover common pitfalls and how to avoid them, 
                      along with practice problems from various competitive programming platforms.
                      <br /><br />
                      By the end of this article, you'll have a solid understanding of dynamic programming techniques that will 
                      significantly improve your problem-solving skills in competitive programming contests.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{post.date} • {post.readTime}</span>
                      <button className="text-xs text-blue-800 hover:text-blue-900 transition-colors duration-200 font-bold">
                        Read More
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Practice of the Day */}
            <div className="bg-white rounded-lg">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-gray-700" />
                    <h2 className="text-xs font-semibold text-gray-900">Practice of the Day</h2>
                  </div>
                </div>
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1.5">Binary Search Tree Validation</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as follows:
                    - The left subtree of a node contains only nodes with keys less than the node's key.
                    - The right subtree of a node contains only nodes with keys greater than the node's key.
                    - Both the left and right subtrees must also be binary search trees.
                  </p>
                  <div className="flex justify-end mb-2">
                    <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-200">
                      Binary Trees
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>1250 solved • 580 attempts</span>
                    <span>+20 points</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200 flex items-center gap-1">
                    <Play className="w-2.5 h-2.5" />
                    Solve Now
                  </button>
                  <button className="text-xs border border-gray-300 text-gray-700 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors duration-200">
                    View Solutions
                  </button>
                </div>
              </div>
            </div>

            {/* Visualization Demo */}
            {renderVisualization()}

            {/* Problem of the Day - LeetCode Style */}
            <div className="group bg-white rounded-lg p-3 text-gray-900 border border-gray-200 hover:bg-blue-800 hover:text-white transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold mb-1.5 text-xs">Problem of the Day</h2>
                  <p className="text-gray-600 mb-2 text-xs group-hover:text-white transition-colors duration-200">Solve this problem to maintain your streak!</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full hover:bg-blue-700 hover:text-white transition-colors duration-200">Medium</span>
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full hover:bg-blue-700 hover:text-white transition-colors duration-200">Arrays</span>
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-full hover:bg-blue-700 hover:text-white transition-colors duration-200">+15 pts</span>
                  </div>
                </div>
                <button className="bg-blue-800 text-white px-3 py-1.5 rounded font-semibold hover:bg-white hover:text-blue-800 transition-colors duration-200 flex items-center gap-1 text-xs">
                  <Play className="w-2.5 h-2.5" />
                  Solve Now
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Additional Content */}
          <div class="lg:col-span-3 space-y-4">
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
                        { id: 4, title: "Graph Connectivity", difficulty: "Medium", topic: "Graphs" },
                        { id: 5, title: "String Matching", difficulty: "Easy", topic: "Strings" },
                        { id: 6, title: "Dynamic Programming Basics", difficulty: "Medium", topic: "DP" },
                        { id: 7, title: "Binary Search Advanced", difficulty: "Hard", topic: "Searching" },
                        { id: 8, title: "Linked List Operations", difficulty: "Easy", topic: "LinkedList" },
                        { id: 9, title: "Backtracking Patterns", difficulty: "Medium", topic: "Recursion" },
                        { id: 10, title: "Graph Algorithms", difficulty: "Hard", topic: "Graphs" },
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