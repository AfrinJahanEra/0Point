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
    if (currentPath === '/blog') return 'blog';
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
      </div>
    </div>
  );
};

export default NavigationBar;