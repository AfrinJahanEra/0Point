// Client/src/components/NavigationBar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const currentPath = location.pathname;

  const getActiveTab = () => {
    if (currentPath === '/submissions') return 'submissions';
    if (currentPath === '/blog' || currentPath.startsWith('/blog/')) return 'blog';
    if (currentPath === '/contest-history') return 'contests';
    if (currentPath === '/create-blog') return 'blog';
    if (currentPath === '/dashboard') return 'dashboard';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

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