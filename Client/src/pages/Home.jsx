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
  Settings
} from 'lucide-react';

const Home = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');

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

  const topCoders = [
    { rank: 1, name: "Ahmed Mahmud", score: 2450, department: "CSE", change: "+25" },
    { rank: 2, name: "Sadia Rahman", score: 2310, department: "SWE", change: "+18" },
    { rank: 3, name: "Tahmid Rahman", score: 2250, department: "CSE", change: "+12" },
    { rank: 4, name: "Fariha Ahmed", score: 2180, department: "CSE", change: "-5" },
    { rank: 5, name: "Nafis Shams", score: 2100, department: "SWE", change: "+8" }
  ];

  const resources = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Tutorials",
      description: "Step-by-step guides for algorithms",
      problems: "150+"
    },
    {
      icon: <Code2 className="w-5 h-5" />,
      title: "Practice Problems",
      description: "Sharpen your coding skills",
      problems: "500+"
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Contest Archive",
      description: "Past contest problems",
      problems: "200+"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Community Solutions",
      description: "Learn from peers",
      problems: "1K+"
    }
  ];

  const stats = [
    { value: "1,250", label: "Active Users", change: "+12%", icon: <Users className="w-4 h-4" /> },
    { value: "48", label: "Contests", change: "+5", icon: <Trophy className="w-4 h-4" /> },
    { value: "3,450", label: "Problems", change: "+127", icon: <Code2 className="w-4 h-4" /> },
    { value: "12,580", label: "Submissions", change: "+856", icon: <BarChart3 className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* User Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
                  AM
                </div>
                <h3 className="font-semibold text-gray-900">Ahmed Mahmud</h3>
                <p className="text-sm text-gray-600">CSE, 4th Year</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Rating</span>
                  <span className="font-semibold text-gray-900">2450</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Global Rank</span>
                  <span className="font-semibold text-gray-900">#15</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Problems Solved</span>
                  <span className="font-semibold text-gray-900">347</span>
                </div>
              </div>

              <button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300">
                View Full Profile
              </button>
            </div>

            {/* Platform Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                Platform Stats
              </h3>
              <div className="space-y-3">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                        {stat.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{stat.label}</div>
                        <div className="text-xs text-gray-500">{stat.change}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Contest
                </button>
                <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                  <Code2 className="w-4 h-4" />
                  Start Practice
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Welcome Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Welcome back, Ahmed</h1>
                  <p className="text-gray-600 mt-1">Continue your coding journey with today's challenges</p>
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <div className="text-sm text-gray-600">Current Streak</div>
                  <div className="font-semibold text-gray-900">7 days</div>
                </div>
              </div>
            </div>

            {/* Contests Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming Contests</h2>
                  </div>
                  <Link 
                    to="/contests" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-sm"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['all', 'registered', 'ongoing'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                          activeTab === tab 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['upcoming', 'past'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTimeFilter(filter)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                          timeFilter === filter 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contests List */}
              <div className="p-6 space-y-4">
                {contests.map((contest) => (
                  <div 
                    key={contest.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {contest.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {contest.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {contest.participants}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              contest.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                              contest.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {contest.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {contest.registered && (
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                            Registered
                          </span>
                        )}
                        <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                          contest.registered 
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                          {contest.registered ? (
                            <>
                              <Play className="w-4 h-4" />
                              Participate
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              View
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Resources */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Learning Resources</h2>
                  </div>
                  <Link 
                    to="/learn" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-sm"
                  >
                    Explore All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map((resource, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                          {resource.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {resource.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{resource.problems}</div>
                          <div className="text-xs text-gray-500">Available</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Leaderboard */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Medal className="w-5 h-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">IUT Leaderboard</h2>
                  </div>
                  <Link 
                    to="/leaderboard" 
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-sm"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {topCoders.map((coder) => (
                  <div 
                    key={coder.rank}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm ${
                      coder.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                      coder.rank === 2 ? 'bg-gray-200 text-gray-800' :
                      coder.rank === 3 ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {coder.rank}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{coder.name}</div>
                      <div className="text-xs text-gray-600 truncate">{coder.department}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{coder.score}</div>
                      <div className={`text-xs ${
                        coder.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {coder.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Challenge */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Daily Challenge</h3>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
                Solve today's featured problem and earn bonus points
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-medium text-gray-900 mb-1">Two Sum Variation</div>
                <div className="text-xs text-gray-600">Medium • Arrays • Hash Tables</div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span>+15 points</span>
                  <span>45 min</span>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Solve Challenge
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {[
                  { action: 'Solved', problem: 'Reverse Linked List', points: '+10', time: '2h ago' },
                  { action: 'Participated', problem: 'Weekly Contest #44', points: '+25', time: '1d ago' },
                  { action: 'Earned', problem: '7-day Streak', points: '+50', time: '2d ago' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{activity.action}</span>
                      <span className="text-gray-600"> {activity.problem}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-medium">{activity.points}</div>
                      <div className="text-xs text-gray-500">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;