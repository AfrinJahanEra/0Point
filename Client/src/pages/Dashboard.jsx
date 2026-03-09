// Client/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { PieChart, TrendingUp, Globe, Plus, Edit2 } from 'lucide-react';
import { SiCodechef } from 'react-icons/si';
import RatingChart from '../components/RatingChart';
import toast from 'react-hot-toast';
import CategoryRadarChart from '../components/CategoryRadarChart';
import VerdictDonutChart from '../components/VerdictDonutChart';

import LeetcodeHeatmap from '../components/LeetcodeHeatmap';
import CodechefHeatmap from '../components/CodechefHeatmap';
import AtcoderHeatmap from '../components/AtcoderHeatmap';
import CodeforcesHeatmap from '../components/CodeforcesHeatmap';

const Dashboard = () => {
  // ────────────────────────────────────────────────
  // ALL HOOKS FIRST – MUST BE UNCONDITIONAL
  // ────────────────────────────────────────────────
  const { user } = useApp();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [platformForm, setPlatformForm] = useState({
    platform: 'codeforces',
    handle: ''
  });
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [categoryScores, setCategoryScores] = useState({});
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [verdictStats, setVerdictStats] = useState({});
  const [verdictLoading, setVerdictLoading] = useState(true);
  const [selectedHeatmap, setSelectedHeatmap] = useState('leetcode');

  // Fetch all dashboard data when user is available
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Refresh data when dashboard becomes visible (e.g., after editing profile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchUserData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Auto-select the only connected platform for heatmap
  useEffect(() => {
    if (!userProfile?.platform_profiles) return;

    const connected = [];
    if (userProfile.platform_profiles.some(p => p.platform === 'leetcode')) connected.push('leetcode');
    if (userProfile.platform_profiles.some(p => p.platform === 'codechef')) connected.push('codechef');
    if (userProfile.platform_profiles.some(p => p.platform === 'atcoder')) connected.push('atcoder');
    if (userProfile.platform_profiles.some(p => p.platform === 'codeforces')) connected.push('codeforces');

    if (connected.length === 1 && selectedHeatmap !== connected[0]) {
      setSelectedHeatmap(connected[0]);
    } else if (connected.length > 1 && !connected.includes(selectedHeatmap)) {
      setSelectedHeatmap(connected[0] || 'leetcode');
    }
  }, [userProfile?.platform_profiles]);

  // ────────────────────────────────────────────────
  // Derived values
  // ────────────────────────────────────────────────
  const hasLeetCode   = userProfile?.platform_profiles?.some(p => p.platform === 'leetcode')   ?? false;
  const hasCodeChef   = userProfile?.platform_profiles?.some(p => p.platform === 'codechef')   ?? false;
  const hasAtCoder    = userProfile?.platform_profiles?.some(p => p.platform === 'atcoder')    ?? false;
  const hasCodeforces = userProfile?.platform_profiles?.some(p => p.platform === 'codeforces') ?? false;

  // ────────────────────────────────────────────────
  // Early returns AFTER all hooks
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  // Data fetching function
  // ────────────────────────────────────────────────
  const DASH_CACHE_KEY    = 'user_dashboard_cache';
  const DASH_CACHE_TS_KEY = 'user_dashboard_cache_ts';
  const DASH_MAX_AGE      = 2 * 60 * 1000; // 2 minutes

  const applyDashData = (d) => {
    setUserProfile(d.profile);
    setCategoryScores(d.categoryScores || {});
    setVerdictStats(d.verdictStats || {});
  };

  const fetchUserData = async () => {
    // 1. Show stale data instantly
    try {
      const cached   = localStorage.getItem(DASH_CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(DASH_CACHE_TS_KEY) || '0', 10);
      const isFresh  = (Date.now() - cachedAt) < DASH_MAX_AGE;
      if (cached) {
        applyDashData(JSON.parse(cached));
        setLoading(false); setCategoryLoading(false); setVerdictLoading(false);
        if (isFresh) return;
      }
    } catch (_) {}

    // 2. Background refresh — parallel calls for speed
    try {
      setError(null);
      const [profileResponse, tagResp, verdictResp] = await Promise.all([
        api.get('/account/profile/'),
        api.get('/account/tag-stats/'),
        api.get('/account/verdict-stats/'),
      ]);
      const profile       = profileResponse.data;
      const categoryScores = tagResp.data.category_scores || {};
      const verdictStats  = verdictResp.data.verdict_counts || {};
      setUserProfile(profile);
      setCategoryScores(categoryScores);
      setVerdictStats(verdictStats);
      try {
        localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ profile, categoryScores, verdictStats }));
        localStorage.setItem(DASH_CACHE_TS_KEY, String(Date.now()));
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (!localStorage.getItem(DASH_CACHE_KEY)) {
        if (err.response?.status === 401) setError('Session expired. Please log in again.');
        else if (err.response?.status === 404) setError('User profile not found.');
        else setError(err.response?.data?.error || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setCategoryLoading(false);
      setVerdictLoading(false);
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

  // Platform assets
  const platformLogos = {
    codeforces: '/src/assets/codeforces-social-preview.png',
    atcoder: '/src/assets/atcoder.png',
    leetcode: '/src/assets/LeetCode_logo.png'
  };

  const platformInitials = {
    codeforces: 'CF',
    codechef: 'CC',
    atcoder: 'A',
    leetcode: 'LC'
  };

  const platformNames = {
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    leetcode: 'LeetCode'
  };

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

  // Platform icon component
  const PlatformIcon = ({ platform, className = "w-5 h-5" }) => {
    const [imgError, setImgError] = useState(false);

    if (platform === 'codechef') {
      return <SiCodechef className={`${className} text-[#5B4638]`} />;
    }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - User Profile */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
              <div className="text-center mb-5">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {userProfile?.profile_photo ? (
                    <img 
                      src={userProfile.profile_photo} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                {userProfile?.department && (
                  <p className="text-xs text-gray-600 mt-1">{userProfile.department}</p>
                )}
                {userProfile?.year && (
                  <p className="text-xs text-gray-600">{userProfile.year}</p>
                )}
              </div>

              {/* User Info */}
              <div className="space-y-2 border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900 font-medium truncate max-w-[150px]">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Username</span>
                  <span className="text-gray-900 font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Rating</span>
                  <span className="text-blue-600 font-bold">{userProfile?.rating || 0}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full mt-5 bg-blue-800 hover:bg-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
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
              <div className="space-y-4 py-4">
                <div className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
                  <div className="flex gap-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex-1 h-16 bg-gray-200 rounded-lg" />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-36" />
                  {[1,2,3,4].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded" />)}
                </div>
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
                      className="px-3 py-1.5 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-1.5 text-xs"
                    >
                      <Plus size={14} />
                      Add Profile
                    </button>
                  </div>

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

                {/* Rating Progress Chart */}
                {userProfile?.platform_profiles?.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">Rating Progress</h2>
                    </div>
                    <RatingChart platformProfiles={userProfile.platform_profiles} />
                  </div>
                )}

                {/* Heatmap Section */}
                {(hasLeetCode || hasCodeChef || hasAtCoder || hasCodeforces) && (
                  <div className="bg-white rounded-lg shadow-sm p-5 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Submission Heatmap</h3>

                      {(hasLeetCode + hasCodeChef + hasAtCoder + hasCodeforces > 1) && (
                        <select
                          value={selectedHeatmap}
                          onChange={(e) => setSelectedHeatmap(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {hasLeetCode   && <option value="leetcode">LeetCode</option>}
                          {hasCodeChef   && <option value="codechef">CodeChef</option>}
                          {hasAtCoder    && <option value="atcoder">AtCoder</option>}
                          {hasCodeforces && <option value="codeforces">Codeforces</option>}
                        </select>
                      )}
                    </div>

                    <div className={selectedHeatmap === 'leetcode' ? '' : 'hidden'}>
                      {hasLeetCode && <LeetcodeHeatmap />}
                    </div>
                    <div className={selectedHeatmap === 'codechef' ? '' : 'hidden'}>
                      {hasCodeChef && <CodechefHeatmap />}
                    </div>
                    <div className={selectedHeatmap === 'atcoder' ? '' : 'hidden'}>
                      {hasAtCoder && <AtcoderHeatmap />}
                    </div>
                    <div className={selectedHeatmap === 'codeforces' ? '' : 'hidden'}>
                      {hasCodeforces && <CodeforcesHeatmap />}
                    </div>
                  </div>
                )}

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div className="bg-white rounded-lg shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Problem Solving Proficiency by Category
                      </h2>
                    </div>

                    {categoryLoading ? (
                      <div className="py-8 animate-pulse">
                        <div className="w-40 h-40 bg-gray-200 rounded-full mx-auto" />
                        <div className="flex justify-center gap-2 mt-4">
                          {[1,2,3].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded w-16" />)}
                        </div>
                      </div>
                    ) : (
                      <CategoryRadarChart
                        categoryScores={categoryScores}
                        username={user?.name || "You"}
                      />
                    )}
                  </div>

                  {/* Verdict Donut Chart */}
                  <div className="bg-white rounded-lg shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Submission Verdict Distribution
                      </h2>
                    </div>

                    {verdictLoading ? (
                      <div className="py-8 animate-pulse">
                        <div className="w-40 h-40 bg-gray-200 rounded-full mx-auto" />
                        <div className="flex justify-center gap-2 mt-4">
                          {[1,2,3].map(i => <div key={i} className="h-2.5 bg-gray-200 rounded w-16" />)}
                        </div>
                      </div>
                    ) : (
                      <VerdictDonutChart
                        verdictStats={verdictStats}
                        username={user?.name || "You"}
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