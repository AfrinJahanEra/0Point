import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Code2, 
  Trophy, 
  Users, 
  BookOpen, 
  ChevronRight, 
  Star, 
  CheckCircle,
  Play,
  Award,
  TrendingUp,
  Clock,
  Calendar,
  Shield,
  Zap,
  Target,
  Globe,
  Notebook,
  Cpu,
  Database,
  Sparkles,
  Rocket,
  Medal,
  ArrowRight,
  GitBranch,
  BarChart3,
  Crown
} from 'lucide-react';

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('contests');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Mock data for contests
  const upcomingContests = [
    {
      id: 1,
      title: "IUT Winter Coding Challenge",
      platform: "IUT Platform",
      date: "Dec 15, 2023",
      duration: "3 hours",
      participants: "500+",
      difficulty: "Medium",
      type: "Team",
      status: "upcoming"
    },
    {
      id: 2,
      title: "Algorithm Masters 2024",
      platform: "IUT Platform",
      date: "Dec 18, 2023",
      duration: "2.5 hours",
      participants: "300+",
      difficulty: "Hard",
      type: "Individual",
      status: "upcoming"
    },
    {
      id: 3,
      title: "Data Structures Sprint",
      platform: "IUT Platform",
      date: "Dec 22, 2023",
      duration: "2 hours",
      participants: "400+",
      difficulty: "Easy",
      type: "Individual",
      status: "upcoming"
    }
  ];

  const topCoders = [
    { rank: 1, name: "Ahmed Mahmud", score: 2450, avatar: "AM", department: "CSE" },
    { rank: 2, name: "Sadia Rahman", score: 2310, avatar: "SR", department: "SWE" },
    { rank: 3, name: "Tahmid Rahman", score: 2250, avatar: "TR", department: "CSE" },
    { rank: 4, name: "Fariha Ahmed", score: 2180, avatar: "FA", department: "CSE" },
    { rank: 5, name: "Nafis Shams", score: 2100, avatar: "NS", department: "SWE" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-hidden">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all duration-300">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                  0Point
                </span>
                <span className="text-xs text-slate-500 -mt-1">by Islamic University of Technology</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {[
                { name: 'Contests', icon: <Trophy className="w-4 h-4" /> },
                { name: 'Practice', icon: <Code2 className="w-4 h-4" /> },
                { name: 'Learn', icon: <BookOpen className="w-4 h-4" /> },
                { name: 'Leaderboard', icon: <Medal className="w-4 h-4" /> },
                { name: 'Community', icon: <Users className="w-4 h-4" /> }
              ].map((item) => (
                <button
                  key={item.name}
                  className="flex items-center space-x-2 text-slate-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 group"
                >
                  {item.icon}
                  <span>{item.name}</span>
                  <div className="w-0 group-hover:w-4 h-0.5 bg-blue-600 rounded transition-all duration-300"></div>
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-slate-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200">
                Sign In
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center space-x-2">
                <Rocket className="w-4 h-4" />
                <span>Get Started</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/30">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">Live platform with 2,000+ active coders</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                  <span className="bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Code. Compete.
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Conquer.
                  </span>
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
                  Join IUT's premier coding platform where students master competitive programming, 
                  crack technical interviews, and launch careers at top tech companies worldwide.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4">
                {[
                  { number: '500+', label: 'Problems' },
                  { number: '50+', label: 'Contests' },
                  { number: '2K+', label: 'Coders' },
                  { number: '100+', label: 'Success Stories' }
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                      {stat.number}
                    </div>
                    <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/register" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-3 group">
                  <span>Start Coding Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <button className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-2xl font-semibold hover:border-blue-500 hover:text-blue-600 transition-all duration-300 flex items-center justify-center space-x-3">
                  <Play className="w-5 h-5" />
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center space-x-4 pt-6">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-500">Free forever for IUT students and faculty</span>
              </div>
            </div>

            {/* Right Content - Interactive Preview */}
            <div className="relative">
              {/* Main Platform Preview */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-500/10 p-8 space-y-6 transform hover:scale-105 transition-all duration-500">
                {/* Code Editor Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-sm font-medium text-slate-500">problem.cpp</div>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm text-slate-200 space-y-2">
                    <div className="text-cyan-400">#include &lt;bits/stdc++.h&gt;</div>
                    <div className="text-purple-400">using namespace std;</div>
                    <div className="text-emerald-400">int main() {'{'}</div>
                    <div className="text-slate-400 ml-4">// Your solution here</div>
                    <div className="text-emerald-400">{'}'}</div>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-blue-50/50 rounded-2xl border border-blue-200/50">
                    <div className="text-2xl font-bold text-blue-600">2450</div>
                    <div className="text-xs text-blue-500 font-medium">Your Rating</div>
                  </div>
                  <div className="text-center p-4 bg-green-50/50 rounded-2xl border border-green-200/50">
                    <div className="text-2xl font-bold text-green-600">87%</div>
                    <div className="text-xs text-green-500 font-medium">Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50/50 rounded-2xl border border-purple-200/50">
                    <div className="text-2xl font-bold text-purple-600">#15</div>
                    <div className="text-xs text-purple-500 font-medium">IUT Rank</div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-500/10 p-4 animate-float">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Daily Challenge</div>
                    <div className="text-xs text-slate-500">Solve to earn points</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-500/10 p-4 animate-float-delayed">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Live Ranking</div>
                    <div className="text-xs text-slate-500">Track progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive tools and resources designed specifically for IUT students to master competitive programming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: "Structured Learning",
                description: "Step-by-step curriculum from basics to advanced topics",
                features: ["Topic-wise Practice", "Video Solutions", "Progress Tracking"],
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Peer Community",
                description: "Learn and compete with IUT peers",
                features: ["Live Discussions", "Code Reviews", "Mentor Support"],
                gradient: "from-cyan-500 to-blue-500"
              },
              {
                icon: <Award className="w-8 h-8" />,
                title: "Regular Contests",
                description: "Weekly coding contests with real-time ranking",
                features: ["IUT Leaderboard", "Performance Analytics", "Certificates"],
                gradient: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-3xl border border-slate-200/80 p-8 hover:shadow-2xl hover:shadow-slate-500/10 hover:border-blue-200/50 transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{feature.title}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center space-x-3 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Contests Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/50 via-slate-900 to-slate-900"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Upcoming Coding Contests
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Compete with peers, climb the leaderboard, and showcase your skills
            </p>
          </div>

          {/* Contests Tabs */}
          <div className="flex justify-center space-x-2 mb-12">
            {['contests', 'practice', 'learn'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-2xl font-semibold text-sm capitalize transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-white text-slate-900 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Contests Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {upcomingContests.map((contest) => (
              <div 
                key={contest.id}
                className="group bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 p-8 hover:bg-white/15 hover:border-white/30 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{contest.title}</div>
                      <div className="text-sm text-slate-300">{contest.platform}</div>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Date & Time</span>
                    <span className="font-medium">{contest.date} • {contest.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Difficulty</span>
                    <span className={`font-medium ${
                      contest.difficulty === 'Easy' ? 'text-green-400' :
                      contest.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {contest.difficulty}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Participants</span>
                    <span className="font-medium">{contest.participants}</span>
                  </div>
                </div>

                <button className="w-full bg-white text-slate-900 py-3.5 rounded-2xl font-semibold hover:bg-slate-100 transition-all duration-300 group-hover:scale-105 flex items-center justify-center space-x-2 shadow-lg shadow-white/10">
                  <Play className="w-4 h-4" />
                  <span>Register Now</span>
                </button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white hover:text-slate-900 transition-all duration-300 transform hover:scale-105">
              View All Contests
            </button>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  IUT Coding Leaderboard
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Track your progress and compete with the best coders from IUT. 
                  Climb the ranks and earn your spot among the coding elite.
                </p>
              </div>

              <div className="space-y-6">
                {topCoders.slice(0, 3).map((coder, index) => (
                  <div 
                    key={coder.rank}
                    className="flex items-center space-x-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-200/80 hover:border-blue-200/50 hover:bg-blue-50/30 transition-all duration-300 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      coder.rank === 1 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25' :
                      coder.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/25' :
                      'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                    }`}>
                      {coder.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{coder.name}</div>
                      <div className="text-sm text-slate-500">{coder.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-lg">{coder.score}</div>
                      <div className="text-xs text-slate-500">Rating</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center space-x-3">
                <Medal className="w-5 h-5" />
                <span>View Full Leaderboard</span>
              </button>
            </div>

            {/* Right Content - Stats */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: <Cpu className="w-8 h-8" />, value: '500+', label: 'Problems Solved', color: 'blue' },
                { icon: <GitBranch className="w-8 h-8" />, value: '50+', label: 'Contests Joined', color: 'cyan' },
                { icon: <BarChart3 className="w-8 h-8" />, value: '87%', label: 'Accuracy Rate', color: 'green' },
                { icon: <Crown className="w-8 h-8" />, value: '#15', label: 'Average Rank', color: 'purple' }
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="bg-slate-50/50 rounded-3xl border border-slate-200/80 p-8 text-center hover:shadow-lg hover:shadow-slate-500/10 hover:border-blue-200/50 transition-all duration-300 group hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${
                    stat.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                    stat.color === 'cyan' ? 'from-cyan-500 to-blue-500' :
                    stat.color === 'green' ? 'from-green-500 to-emerald-500' : 'from-purple-500 to-pink-500'
                  } rounded-2xl flex items-center justify-center text-white mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-slate-900/50 to-slate-900"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 space-y-8">
          <h2 className="text-4xl lg:text-6xl font-bold">
            Ready to Start Your
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> Coding Journey</span>?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of IUT students who are mastering competitive programming 
            and launching careers at top tech companies worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link to="/register" className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-white/10 flex items-center space-x-3">
              <Rocket className="w-5 h-5" />
              <span>Start Coding for Free</span>
            </Link>
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-slate-900 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3">
              <Play className="w-5 h-5" />
              <span>Watch Platform Tour</span>
            </button>
          </div>

          <p className="text-sm text-slate-400 pt-4">
            No credit card required • Free forever for IUT students and faculty
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">IUTCode</span>
              </div>
              <p className="text-sm leading-relaxed">
                IUT's premier platform for competitive programming and interview preparation.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: 'Platform',
                links: ['Contests', 'Practice', 'Problems', 'Leaderboard', 'Learn']
              },
              {
                title: 'Support',
                links: ['Help Center', 'Community', 'Contact', 'Report Issue', 'Feedback']
              },
              {
                title: 'IUT',
                links: ['About', 'Faculty', 'Partnerships', 'Careers', 'Privacy']
              }
            ].map((column, index) => (
              <div key={index} className="space-y-4">
                <h3 className="text-white font-semibold text-sm">{column.title}</h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-sm">
              © 2024 IUTCode. All rights reserved. | Built with ❤️ for IUT students
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;