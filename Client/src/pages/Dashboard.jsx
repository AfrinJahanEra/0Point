import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { Plus, Edit2, TrendingUp, Globe } from 'lucide-react';
import { SiCodechef } from 'react-icons/si'; // Import CodeChef icon from react-icons
import RatingChart from '../components/RatingChart';
import toast from 'react-hot-toast';
import CfTagDonutChart from '../components/CfTagDonutChart';
import { PieChart as PieIcon } from 'lucide-react';
//import SubmissionHeatmap from '../components/SubmissionHeatmap';

const Dashboard = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [platformForm, setPlatformForm] = useState({
    platform: 'codeforces',
    handle: ''
  });
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [cfTagStats, setCfTagStats] = useState({});
  const [cfTagLoading, setCfTagLoading] = useState(true);

  // const [calendarData, setCalendarData] = useState({});
  // const [calendarLoading, setCalendarLoading] = useState(true);

  // Platform logo paths - only for platforms without react-icons
  const platformLogos = {
    codeforces: '/src/assets/codeforces-social-preview.png',
    atcoder: '/src/assets/atcoder.png',
    leetcode: '/src/assets/LeetCode_logo.png'
  };

  // Fallback logos if image fails to load
  const platformInitials = {
    codeforces: 'CF',
    codechef: 'CC',
    atcoder: 'A',
    leetcode: 'LC'
  };

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
    try {
      const resp = await api.get('/account/tag-stats/');  // ← update endpoint if changed
      setCfTagStats(resp.data.tag_stats || {});
    } catch (err) {
      console.error('Failed to load CF tag stats:', err);
    } finally {
      setCfTagLoading(false);
    }
    // try {
    //   const calResp = await api.get('/account/calendar/');
    //   setCalendarData(calResp.data.calendar || {});
    // } catch (err) {
    //   console.error('Failed to load calendar:', err);
    // } finally {
    //   setCalendarLoading(false);
    // }
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

  // Platform Icon component with react-icons for CodeChef and images for others
  const PlatformIcon = ({ platform, className = "w-5 h-5" }) => {
    const [imgError, setImgError] = useState(false);

    // Use react-icons for CodeChef
    if (platform === 'codechef') {
      return <SiCodechef className={`${className} text-[#5B4638]`} />;
    }

    // For other platforms, use images with fallback
    if (imgError || !platformLogos[platform]) {
      return (
        <div className={`${className} flex items-center justify-center rounded bg-blue-100 text-blue-800 font-bold text-xs`}>
          {platformInitials[platform] || platform.charAt(0).toUpperCase()}
        </div>
      );
    }

    return (
      <img
        src={platformLogos[platform]}
        alt={platform}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  };

  const platformNames = {
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    leetcode: 'LeetCode'
  };

  // All platforms use the same blue color scheme as Codeforces
  const platformColors = {
    codeforces: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800'
    },
    codechef: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800'
    },
    atcoder: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800'
    },
    leetcode: {
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800'
    }
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
      <div className="max-w-[1920px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - User Profile */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
              {/* User Avatar */}
              <div className="text-center mb-5">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                {userProfile?.department && (
                  <p className="text-xs text-gray-600 mt-1">{userProfile.department}</p>
                )}
                {userProfile?.year && (
                  <p className="text-xs text-gray-600">{userProfile.year}</p>
                )}
              </div>

              {/* User Stats - More compact */}
              <div className="space-y-3 border-t border-gray-200 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Total Score</span>
                  <span className="text-lg font-bold text-blue-600">{userProfile?.total_score || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Global Rank</span>
                  <span className="text-lg font-bold text-purple-600">#{userProfile?.global_rank || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Problems Solved</span>
                  <span className="text-lg font-bold text-green-600">{userProfile?.problems_solved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Contests</span>
                  <span className="text-lg font-bold text-orange-600">{userProfile?.contests_count || 0}</span>
                </div>
              </div>

              {/* Edit Profile Button */}
              <button
                onClick={() => navigate('/profile')}
                className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Edit2 size={14} />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-800 mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {/* Social Coding Profiles Section */}
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Social Coding Profiles</h2>
                    </div>
                    <button
                      onClick={() => setShowAddPlatform(!showAddPlatform)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs"
                    >
                      <Plus size={14} />
                      Add Profile
                    </button>
                  </div>

                  {/* Add Platform Form - More compact */}
                  {showAddPlatform && (
                    <form onSubmit={handleAddPlatform} className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select
                          value={platformForm.platform}
                          onChange={(e) => setPlatformForm({ ...platformForm, platform: e.target.value })}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
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
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={savingPlatform}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          {savingPlatform ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Platform Profiles Grid - More compact */}
                  {userProfile?.platform_profiles && userProfile.platform_profiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {userProfile.platform_profiles.map((profile) => {
                        const platformColor = platformColors[profile.platform] || platformColors.codeforces;

                        return (
                          <div
                            key={profile.platform}
                            className={`border ${platformColor.border} rounded-lg p-3 hover:shadow-sm transition-shadow ${platformColor.bg}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md bg-white border ${platformColor.border} flex items-center justify-center`}>
                                  <PlatformIcon platform={profile.platform} className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{platformNames[profile.platform]}</h3>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-gray-700">{profile.handle}</p>
                                    {profile.badge && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${platformColor.badge}`}>
                                        {profile.badge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Platform Stats - More compact */}
                            <div className="grid gap-1.5 text-xs">
                              {profile.platform === 'leetcode' ? (
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="bg-white rounded p-1.5 border">
                                    <p className="text-gray-600 text-xs">Contest Rating</p>
                                    <p className={`font-bold text-sm ${platformColor.text}`}>{profile.current_rating}</p>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border">
                                    <p className="text-gray-600 text-xs">Contests</p>
                                    <p className="font-bold text-sm text-orange-600">{profile.contests_count}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div className="bg-white rounded p-1.5 border">
                                    <p className="text-gray-600 text-xs">Current</p>
                                    <p className={`font-bold text-sm ${platformColor.text}`}>{profile.current_rating}</p>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border">
                                    <p className="text-gray-600 text-xs">Max</p>
                                    <p className="font-bold text-sm text-green-600">{profile.max_rating}</p>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border">
                                    <p className="text-gray-600 text-xs">Contests</p>
                                    <p className="font-bold text-sm text-orange-600">{profile.contests_count}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      <p>No platform profiles yet. Add one to get started!</p>
                    </div>
                  )}
                </div>

                {/* Rating Progress Chart - Placed BEFORE Contest History */}
                {userProfile?.platform_profiles && userProfile.platform_profiles.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Rating Progress</h2>
                    </div>
                    <RatingChart platformProfiles={userProfile.platform_profiles} />
                  </div>
                )}


                {/* In return JSX → after RatingChart section (or wherever you want)*/}
                <div className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieIcon className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Codeforces Solved Problems by Tag
                    </h2>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    {cfTagLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Codeforces tag distribution...</p>
                      </div>
                    ) : (
                      <CfTagDonutChart
                        tagStats={cfTagStats}
                        username={user?.name || "user"}  // or fetch handle from profile if you want
                      />
                    )}
                  </div>
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