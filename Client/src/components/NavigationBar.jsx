import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine which tab is active based on the current path
  const getActiveTab = () => {
    if (currentPath === '/submissions') return 'submissions';
    if (currentPath === '/blog') return 'blog';
    if (currentPath === '/problems') return 'problems';
    return 'overview'; // default to overview
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tab) => {
    switch (tab) {
      case 'overview':
        navigate('/dashboard');
        break;
      case 'submissions':
        navigate('/submissions');
        break;
      case 'blog':
        navigate('/blog');
        break;
      case 'problems':
        navigate('/problems');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="mb-4 px-10">
      <div className="flex space-x-10">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'overview'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
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
        <button
          onClick={() => handleTabChange('problems')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'problems'
              ? 'text-blue-800 border-b-2 border-blue-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Problems
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;