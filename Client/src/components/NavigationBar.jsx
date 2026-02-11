// Client/src/components/NavigationBar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const currentPath = location.pathname;
  const [userProfile, setUserProfile] = useState(null);

  const getActiveTab = () => {
    if (currentPath === '/submissions') return 'submissions';
    if (currentPath === '/blog' || currentPath.startsWith('/blog/')) return 'blog';
    if (currentPath === '/contest-history') return 'contests';
    if (currentPath === '/create-blog') return 'blog';
    if (currentPath === '/dashboard') return 'dashboard';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Fetch user profile to get platform ranks
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const response = await api.get('/account/profile/');
          setUserProfile(response.data);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleTabChange = (tab) => {
    switch (tab) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'submissions':
        navigate('/submissions');
        break;
      case 'blog':
        navigate('/blog');
        break;
      case 'contests':               // ← new
        navigate('/contest-history');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const userName = user?.name || 'User';
  
  // Get the best rank from all platforms (prioritize Codeforces)
  const getUserRankDisplay = () => {
    if (!userProfile?.platform_profiles || userProfile.platform_profiles.length === 0) {
      return null;
    }
    
    // Prioritize Codeforces rank
    const cfProfile = userProfile.platform_profiles.find(p => p.platform === 'codeforces');
    if (cfProfile?.rank) {
      return cfProfile.rank;
    }
    
    // Then try CodeChef badge
    const ccProfile = userProfile.platform_profiles.find(p => p.platform === 'codechef');
    if (ccProfile?.badge) {
      return ccProfile.badge;
    }
    
    // Then any other rank
    const profileWithRank = userProfile.platform_profiles.find(p => p.rank);
    if (profileWithRank?.rank) {
      return profileWithRank.rank;
    }
    
    return null;
  };

  const rankDisplay = getUserRankDisplay();

  return (
    <div className="mb-4 px-10">
      <div className="flex space-x-10">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'dashboard'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {userName}
          {rankDisplay && (
            <span className="ml-2 text-gray-400">| {rankDisplay}</span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('submissions')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'submissions'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Submissions
        </button>

        <button
          onClick={() => handleTabChange('blog')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'blog'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Blogs
        </button>

        {/* New: Contests tab */}
        <button
          onClick={() => handleTabChange('contests')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'contests'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Contests
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;