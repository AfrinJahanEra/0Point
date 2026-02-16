import React, { useState } from 'react';
import { 
  Trophy, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Medal,
  Star,
  Award,
  Crown,
  Target,
  Zap,
  Flame,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Leaderboard = () => {

  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  // Sort and filter data
  const sortedData = [...leaderboardData]
    .filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.institution.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterBy === 'all' || 
                           (filterBy === 'me' && user.isCurrentUser);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'rank') return factor * (a.rank - b.rank);
      if (sortBy === 'points') return factor * (b.totalPoints - a.totalPoints);
      if (sortBy === 'rating') return factor * (b.rating - a.rating);
      return 0;
    });

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200';
    if (rank <= 10) return 'bg-blue-50 text-blue-800 border border-blue-200';
    if (rank <= 50) return 'bg-green-50 text-green-800 border border-green-200';
    return 'bg-gray-50 text-gray-800 border border-gray-200';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-3 h-3 text-yellow-600" />;
    if (rank === 2) return <Medal className="w-3 h-3 text-gray-600" />;
    if (rank === 3) return <Medal className="w-3 h-3 text-amber-600" />;
    if (rank <= 10) return <Star className="w-3 h-3 text-blue-600" />;
    if (rank <= 50) return <Award className="w-3 h-3 text-green-600" />;
    return null;
  };

  const getRatingChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-3 h-3 inline ml-1" /> : 
      <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5" />
              <div>
                <h1 className="text-sm font-bold">Global Leaderboard</h1>
                <p className="text-xs text-purple-200 mt-0.5">Top performers across all contests</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-purple-800/30 px-2 py-1.5 rounded">
              <Flame className="w-3 h-3" />
              <div>
                <div className="text-[10px] text-purple-200">Active Users</div>
                <div className="text-xs font-bold">1,247</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3 max-w-7xl mx-auto">
        {/* Stats & Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username or institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-gray-500" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                >
                  <option value="all">All Users</option>
                  <option value="me">Only Me</option>
                </select>
              </div>

              {/* Sort Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleSort('rank')}
                  className={`px-2 py-1 border rounded text-xs flex items-center gap-0.5 ${
                    sortBy === 'rank' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Rank
                  <SortIcon field="rank" />
                </button>
                <button
                  onClick={() => handleSort('points')}
                  className={`px-2 py-1 border rounded text-xs flex items-center gap-0.5 ${
                    sortBy === 'points' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Points
                  <SortIcon field="points" />
                </button>
                <button
                  onClick={() => handleSort('rating')}
                  className={`px-2 py-1 border rounded text-xs flex items-center gap-0.5 ${
                    sortBy === 'rating' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Rating
                  <SortIcon field="rating" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs w-16">Rank</th>
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs min-w-[180px]">User</th>
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs w-24">Total Points</th>
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs w-20">Rating</th>
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs w-20">Solved</th>
                  <th className="text-left p-2 font-semibold text-gray-700 text-xs w-20">Streak</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((user) => (
                  <tr 
                    key={user.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      user.isCurrentUser ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-2">
                      <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full ${getRankBadge(user.rank)}`}>
                        {getRankIcon(user.rank)}
                        <span className="font-bold text-xs">{user.rank}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          user.rank === 1 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                          user.rank === 2 ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                          user.rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                          'bg-gradient-to-br from-purple-600 to-purple-700'
                        }`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-gray-900 text-xs truncate">
                              {user.username}
                              {user.isCurrentUser && (
                                <span className="ml-1 px-1 py-0.5 bg-blue-600 text-white text-[10px] rounded">You</span>
                              )}
                            </h3>
                            {user.streak > 10 && (
                              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-red-50 text-red-700 rounded text-[10px]">
                                <Flame className="w-2.5 h-2.5" />
                                {user.streak}
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs truncate">{user.institution}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-purple-600" />
                        <span className="font-bold text-sm text-gray-900">{user.totalPoints.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900 text-xs">{user.rating}</span>
                        {user.ratingChange !== 0 && (
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                            user.ratingChange > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getRatingChangeIcon(user.ratingChange)}
                            {user.ratingChange > 0 ? '+' : ''}{user.ratingChange}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-green-600" />
                        <span className="font-bold text-gray-900 text-xs">{user.problemsSolved}</span>
                        <span className="text-gray-500 text-[10px]">problems</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs ${
                        user.streak > 10 
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border border-red-200' 
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        <Flame className={`w-2.5 h-2.5 ${user.streak > 10 ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className="font-bold">{user.streak}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {sortedData.length === 0 && (
            <div className="p-6 text-center">
              <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No users found</h3>
              <p className="text-gray-500 text-xs">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Footer Stats */}
          {sortedData.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="text-xs text-gray-600">
                  Showing <span className="font-semibold">{sortedData.length}</span> of{' '}
                  <span className="font-semibold">{leaderboardData.length}</span> users
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-600">Top 3</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-gray-600">Top 10</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-600">Current User</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Average Rating</p>
                <p className="text-lg font-bold text-gray-900">1,845</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Problems Solved</p>
                <p className="text-lg font-bold text-gray-900">18,457</p>
              </div>
              <Target className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Streaks</p>
                <p className="text-lg font-bold text-gray-900">892</p>
              </div>
              <Flame className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
