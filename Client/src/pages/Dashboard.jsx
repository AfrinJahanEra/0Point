import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { Plus, Edit2, TrendingUp, Globe } from 'lucide-react';
import RatingChart from '../components/RatingChart';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [contestHistory, setContestHistory] = useState([]);
  const [contestPage, setContestPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContests, setTotalContests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [platformForm, setPlatformForm] = useState({
    platform: 'codeforces',
    handle: ''
  });
  const [savingPlatform, setSavingPlatform] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile (api service automatically adds token)
      const profileResponse = await api.get('/account/profile/');
      setUserProfile(profileResponse.data);

      // Fetch first page of contest history
      fetchContestPage(1);
    } catch (err) {
      console.error('Error fetching user data:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('User profile not found.');
      } else {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContestPage = async (page = 1) => {
    try {
      const resp = await api.get(`/account/contest-history/?page=${page}&page_size=${pageSize}`);
      setContestHistory(resp.data.contests || []);
      setContestPage(resp.data.page || page);
      setTotalPages(resp.data.total_pages || 1);
      setTotalContests(resp.data.total_contests || 0);
    } catch (err) {
      console.error('Error fetching contest page:', err);
    }
  };

  const handleAddPlatform = async (e) => {
    e.preventDefault();
    
    if (!platformForm.handle.trim()) {
      toast.error('Please enter a handle');
      return;
    }

    setSavingPlatform(true);
    try {
      await api.post('/account/platform/add/', {
        platform: platformForm.platform,
        handle: platformForm.handle
      });
      
      toast.success('Platform profile added successfully!');
      setPlatformForm({ platform: 'codeforces', handle: '' });
      setShowAddPlatform(false);
      
      // Refresh user data
      fetchUserData();
    } catch (err) {
      console.error('Error adding platform:', err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to add platform');
      }
    } finally {
      setSavingPlatform(false);
    }
  };

  const platformIcons = {
    codeforces: '🟦',
    codechef: '🟪',
    atcoder: '⭕',
    leetcode: '🟨'
  };

  const platformNames = {
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    leetcode: 'LeetCode'
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Please log in to view your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - User Profile */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              {/* User Avatar */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                {userProfile?.department && (
                  <p className="text-sm text-gray-600 mt-1">{userProfile.department}</p>
                )}
                {userProfile?.year && (
                  <p className="text-sm text-gray-600">{userProfile.year}</p>
                )}
              </div>

              {/* User Stats */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Total Score</span>
                  <span className="text-2xl font-bold text-blue-600">{userProfile?.total_score || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Global Rank</span>
                  <span className="text-2xl font-bold text-purple-600">#{userProfile?.global_rank || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Problems Solved</span>
                  <span className="text-2xl font-bold text-green-600">{userProfile?.problems_solved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Contests</span>
                  <span className="text-2xl font-bold text-orange-600">{userProfile?.contests_count || 0}</span>
                </div>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => navigate('/profile')}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {/* Social Coding Profiles Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Social Coding Profiles</h2>
                    </div>
                    <button
                      onClick={() => setShowAddPlatform(!showAddPlatform)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Plus size={16} />
                      Add Profile
                    </button>
                  </div>

                  {/* Add Platform Form */}
                  {showAddPlatform && (
                    <form onSubmit={handleAddPlatform} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                          value={platformForm.platform}
                          onChange={(e) => setPlatformForm({ ...platformForm, platform: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="codeforces">Codeforces</option>
                          <option value="codechef">CodeChef</option>
                          <option value="atcoder">AtCoder</option>
                          <option value="leetcode">LeetCode</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Enter your handle"
                          value={platformForm.handle}
                          onChange={(e) => setPlatformForm({ ...platformForm, handle: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={savingPlatform}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {savingPlatform ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Platform Profiles Grid */}
                  {userProfile?.platform_profiles && userProfile.platform_profiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userProfile.platform_profiles.map((profile) => (
                        <div key={profile.platform} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{platformIcons[profile.platform]}</span>
                              <div>
                                <h3 className="font-semibold text-gray-900">{platformNames[profile.platform]}</h3>
                                <p className="text-sm text-gray-600">{profile.handle}</p>
                              </div>
                            </div>
                            {profile.badge && (
                              <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                {profile.badge}
                              </span>
                            )}
                          </div>

                          {/* Platform Stats */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-gray-600 text-xs">Current</p>
                              <p className="font-bold text-blue-600">{profile.current_rating}</p>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-gray-600 text-xs">Max</p>
                              <p className="font-bold text-green-600">{profile.max_rating}</p>
                            </div>
                            <div className="bg-orange-50 rounded p-2">
                              <p className="text-gray-600 text-xs">Contests</p>
                              <p className="font-bold text-orange-600">{profile.contests_count}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No platform profiles yet. Add one to get started!</p>
                    </div>
                  )}
                </div>

                {/* Rating Progress Chart */}
                {userProfile?.platform_profiles && userProfile.platform_profiles.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Rating Progress</h2>
                    </div>
                    <RatingChart platformProfiles={userProfile.platform_profiles} />
                  </div>
                )}

                {/* Contest History Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Contest History</h2>

                  {contestHistory && contestHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Contest</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Date</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Rank</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Score</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Performance</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-900">Platform</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {contestHistory.map((contest, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-semibold text-gray-900">{contest.title}</p>
                                  <p className="text-xs text-gray-600">{contest.type}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {contest.date ? new Date(contest.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-blue-600">#{contest.rank || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-gray-900">{Number(contest.score || 0).toFixed(1)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                  {contest.performance}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-600 capitalize">{contest.platform}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-gray-600 text-sm">Showing page {contestPage} of {totalPages} — {totalContests} contests</div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                            onClick={() => { if (contestPage > 1) { fetchContestPage(contestPage - 1); } }}
                            disabled={contestPage <= 1}
                          >Prev</button>
                          <button
                            className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                            onClick={() => { if (contestPage < totalPages) { fetchContestPage(contestPage + 1); } }}
                            disabled={contestPage >= totalPages}
                          >Next</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No contest history yet. Participate in contests to see them here!</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;