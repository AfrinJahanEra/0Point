import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Trophy, Filter, ChevronRight, Search, Play, Eye } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useContests } from '../hooks/useContests';
import { Link, useNavigate } from 'react-router-dom';

const Contests = () => {
  const { contests, loading } = useContests();
  const [activeTab, setActiveTab] = useState('all');
  const [activePlatform, setActivePlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContests, setFilteredContests] = useState([]);

  // Mock data - replace with actual API data from your backend
  const mockContests = [
    {
      id: '1',
      title: "IUT Winter Coding Challenge",
      description: "Annual winter coding competition",
      start_time: "2023-12-15T18:00:00Z",
      duration_minutes: 180,
      type: "individual",
      platform: "IUT",
      created_by: "user123",
      is_live_now: false,
      status: "upcoming",
      participants: "500+"
    },
    {
      id: '2',
      title: "Codeforces Round #789 (Div. 2)",
      description: "Regular Codeforces contest",
      start_time: "2023-12-12T20:00:00Z",
      duration_minutes: 120,
      type: "individual",
      platform: "cf",
      created_by: "codeforces",
      is_live_now: false,
      status: "upcoming",
      participants: "3000+"
    },
    {
      id: '3',
      title: "December Cook-Off 2023",
      description: "CodeChef monthly contest",
      start_time: "2023-12-20T22:00:00Z",
      duration_minutes: 150,
      type: "individual",
      platform: "codechef",
      created_by: "codechef",
      is_live_now: true,
      status: "live",
      participants: "2000+"
    },
    {
      id: '4',
      title: "IUT November Contest",
      description: "Monthly IUT coding contest",
      start_time: "2023-11-20T18:00:00Z",
      duration_minutes: 180,
      type: "individual",
      platform: "IUT",
      created_by: "user123",
      is_live_now: false,
      status: "completed",
      participants: "350+"
    }
  ];

  // Filter contests based on active filters and search
  useEffect(() => {
    let filtered = mockContests; // Replace with actual contests data when available

    // Status filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(contest => contest.status === activeTab);
    }

    // Platform filter
    if (activePlatform !== 'all') {
      filtered = filtered.filter(contest => contest.platform === activePlatform);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contest => 
        contest.title.toLowerCase().includes(query) ||
        contest.description.toLowerCase().includes(query)
      );
    }

    setFilteredContests(filtered);
  }, [activeTab, activePlatform, searchQuery]);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'IUT': return '';
      case 'cf': return '';
      case 'codechef': return '';
      case 'atcoder': return '';
      case 'hackerrank': return '';
      case 'leetcode': return '';
      default: return '';
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'IUT': return 'IUT Platform';
      case 'cf': return 'Codeforces';
      case 'codechef': return 'CodeChef';
      case 'atcoder': return 'AtCoder';
      case 'hackerrank': return 'HackerRank';
      case 'leetcode': return 'LeetCode';
      default: return platform;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold border";
    
    switch (status) {
      case 'live':
        return `${baseClasses} bg-red-50 text-red-800 border-red-200`;
      case 'upcoming':
        return `${baseClasses} bg-blue-50 text-blue-800 border-blue-200`;
      case 'completed':
        return `${baseClasses} bg-green-50 text-green-800 border-green-200`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-800 border-gray-200`;
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading contests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Header Section */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Contests</h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Participate in coding contests and improve your skills
                  </p>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All Contests' },
                  { key: 'live', label: 'Live Now' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'completed', label: 'Completed' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      activeTab === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contest Grid */}
            <div className="grid gap-4">
              {filteredContests.length > 0 ? (
                filteredContests.map((contest) => (
                  <div
                    key={contest.id}
                    className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Platform Icon */}
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {getPlatformIcon(contest.platform)}
                          </div>
                          
                          {/* Contest Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {contest.title}
                              </h3>
                              <span className={getStatusBadge(contest.status)}>
                                {contest.status === 'live' ? 'Live' : 
                                 contest.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 mb-2">
                              {getPlatformName(contest.platform)} • {contest.type === 'individual' ? 'Individual' : 'Team'}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(contest.start_time)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuration(contest.duration_minutes)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{contest.participants}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          {contest.status === 'upcoming' && (
                            <button className="bg-blue-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors duration-200 flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
                              <span>Register</span>
                            </button>
                          )}
                          {contest.status === 'live' && (
                            <button className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1">
                              <Play className="w-3 h-3" />
                              <span>Join Now</span>
                            </button>
                          )}
                          {contest.status === 'completed' && (
                            <button className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200">
                              View Results
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No contests found</h3>
                  <p className="text-gray-600 text-sm">
                    Try adjusting your filters to find more contests.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar with Filters */}
          <div className="lg:col-span-3 space-y-4">
            {/* Platform Filter */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Filter className="w-4 h-4 text-gray-700" />
                  <h2 className="text-sm font-semibold text-gray-900">Filter by Platform</h2>
                </div>
                
                <div className="space-y-1">
                  {[
                    { key: 'all', label: 'All Platforms', icon: '' },
                    { key: 'IUT', label: 'IUT Platform', icon: '' },
                    { key: 'cf', label: 'Codeforces', icon: '' },
                    { key: 'codechef', label: 'CodeChef', icon: '' },
                    { key: 'atcoder', label: 'AtCoder', icon: '' },
                    { key: 'hackerrank', label: 'HackerRank', icon: '' },
                    { key: 'leetcode', label: 'LeetCode', icon: '' }
                  ].map((platform) => (
                    <button
                      key={platform.key}
                      onClick={() => setActivePlatform(platform.key)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                        activePlatform === platform.key
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{platform.icon}</span>
                      <span>{platform.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Contest Stats</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Live Contests</span>
                    <span className="font-semibold text-red-600">
                      {filteredContests.filter(c => c.status === 'live').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upcoming</span>
                    <span className="font-semibold text-blue-600">
                      {filteredContests.filter(c => c.status === 'upcoming').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold text-green-600">
                      {filteredContests.filter(c => c.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Contest CTA */}
            <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-lg p-4 text-white">
              <h3 className="font-semibold text-sm mb-2">Host Your Contest</h3>
              <p className="text-xs opacity-90 mb-3">
                Create and manage your own coding contests for the community.
              </p>
              <button className="w-full bg-white text-blue-800 py-2 rounded text-xs font-semibold hover:bg-gray-100 transition-colors duration-200">
                Create Contest
              </button>
            </div>

            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contests;