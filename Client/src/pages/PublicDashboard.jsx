// src/pages/PublicDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useApp } from '../context/AppContext';
import { TrendingUp, Globe, ArrowLeft, Edit2, PieChart } from 'lucide-react';
import { SiCodechef } from 'react-icons/si';
import RatingChart from '../components/RatingChart';
import CategoryRadarChart from '../components/CategoryRadarChart';
import VerdictDonutChart from '../components/VerdictDonutChart';
import LeetcodeHeatmap from '../components/LeetcodeHeatmap';
import CodechefHeatmap from '../components/CodechefHeatmap';
import AtcoderHeatmap from '../components/AtcoderHeatmap';
import CodeforcesHeatmap from '../components/CodeforcesHeatmap';

const PublicDashboard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();

  // Check if viewing own profile (compare as strings)
  const isOwnProfile = user && (String(user.user_id) === String(userId) || String(user.id) === String(userId));

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryScores, setCategoryScores] = useState({});
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [verdictStats, setVerdictStats] = useState({});
  const [verdictLoading, setVerdictLoading] = useState(true);
  const [selectedHeatmap, setSelectedHeatmap] = useState('leetcode');

  useEffect(() => {
    if (userId) {
      fetchPublicProfile();
    }
  }, [userId]);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/account/public-profile/${userId}/`);
      setProfile(res.data);

      // Optional: fetch public tag & verdict stats (if you expose them)
      try {
        const tagRes = await api.get(`/account/tag-stats/${userId}/`); // if public endpoint exists
        setCategoryScores(tagRes.data.category_scores || {});
      } catch {}

      try {
        const verdictRes = await api.get(`/account/verdict-stats/${userId}/`);
        setVerdictStats(verdictRes.data.verdict_counts || {});
      } catch {}
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user profile');
    } finally {
      setLoading(false);
      setCategoryLoading(false);
      setVerdictLoading(false);
    }
  };

  // Auto-select single platform
  useEffect(() => {
    if (!profile?.platform_profiles?.length) return;

    const platforms = profile.platform_profiles.map(p => p.platform);
    if (platforms.length === 1) {
      setSelectedHeatmap(platforms[0]);
    }
  }, [profile]);

  const hasLeetCode   = profile?.platform_profiles?.some(p => p.platform === 'leetcode') ?? false;
  const hasCodeChef   = profile?.platform_profiles?.some(p => p.platform === 'codechef') ?? false;
  const hasAtCoder    = profile?.platform_profiles?.some(p => p.platform === 'atcoder') ?? false;
  const hasCodeforces = profile?.platform_profiles?.some(p => p.platform === 'codeforces') ?? false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-8">{error || "This user profile doesn't exist or is private."}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft size={20} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - User Profile */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
              <div className="text-center mb-5">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name?.charAt(0)?.toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                {profile.department && (
                  <p className="text-xs text-gray-600 mt-1">{profile.department}</p>
                )}
                {profile.year && (
                  <p className="text-xs text-gray-600">{profile.year}</p>
                )}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Total Score</span>
                  <span className="text-lg font-bold text-blue-600">{profile.total_score || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Global Rank</span>
                  <span className="text-lg font-bold text-purple-600">#{profile.global_rank || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Problems Solved</span>
                  <span className="text-lg font-bold text-green-600">{profile.problems_solved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Contests</span>
                  <span className="text-lg font-bold text-orange-600">{profile.contests_count || 0}</span>
                </div>
              </div>

              {/* Edit Profile Button - Only visible for own profile */}
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 size={14} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {/* Platforms */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Coding Profiles</h2>
              </div>

              {profile.platform_profiles?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.platform_profiles.map((p) => (
                    <div key={p.platform} className="border rounded-lg p-3 bg-gray-50">
                      <h3 className="font-semibold capitalize mb-1 text-sm">{p.platform}</h3>
                      <p className="text-gray-700 text-sm">@{p.handle}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Rating</p>
                          <p className="font-bold">{p.current_rating || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Max</p>
                          <p className="font-bold text-green-600">{p.max_rating || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Contests</p>
                          <p className="font-bold text-orange-600">{p.contests_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6 text-sm">No coding profiles shared.</p>
              )}
            </div>

            {/* Rating Chart */}
            {profile.platform_profiles?.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Rating Progress
                </h2>
                <RatingChart platformProfiles={profile.platform_profiles} />
              </div>
            )}

            {/* Heatmap */}
            {(hasLeetCode || hasCodeChef || hasAtCoder || hasCodeforces) && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Submission Heatmap</h2>
                  {(hasLeetCode + hasCodeChef + hasAtCoder + hasCodeforces > 1) && (
                    <select
                      value={selectedHeatmap}
                      onChange={(e) => setSelectedHeatmap(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm"
                    >
                      {hasLeetCode && <option value="leetcode">LeetCode</option>}
                      {hasCodeChef && <option value="codechef">CodeChef</option>}
                      {hasAtCoder && <option value="atcoder">AtCoder</option>}
                      {hasCodeforces && <option value="codeforces">Codeforces</option>}
                    </select>
                  )}
                </div>

                <div className={selectedHeatmap === 'leetcode' ? 'block' : 'hidden'}>
                  {hasLeetCode && <LeetcodeHeatmap userId={userId} />}
                </div>
                <div className={selectedHeatmap === 'codechef' ? 'block' : 'hidden'}>
                  {hasCodeChef && <CodechefHeatmap userId={userId} />}
                </div>
                <div className={selectedHeatmap === 'atcoder' ? 'block' : 'hidden'}>
                  {hasAtCoder && <AtcoderHeatmap userId={userId} />}
                </div>
                <div className={selectedHeatmap === 'codeforces' ? 'block' : 'hidden'}>
                  {hasCodeforces && <CodeforcesHeatmap userId={userId} />}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-5 min-h-[500px]">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Proficiency by Category
                </h2>
                {categoryLoading ? (
                  <div className="text-center py-8 text-sm">Loading...</div>
                ) : (
                  <CategoryRadarChart categoryScores={categoryScores} username={profile.name} />
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 min-h-[500px]">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Verdict Distribution
                </h2>
                {verdictLoading ? (
                  <div className="text-center py-8 text-sm">Loading...</div>
                ) : (
                  <VerdictDonutChart verdictStats={verdictStats} username={profile.name} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;