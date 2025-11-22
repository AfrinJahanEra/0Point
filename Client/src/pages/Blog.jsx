import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Blog = () => {
  // Mock blog posts data
  const blogPosts = [
    {
      id: 1,
      title: 'Getting Started with Competitive Programming',
      excerpt: 'Learn the fundamentals of competitive programming and how to excel in contests.',
      date: 'May 15, 2023',
      author: 'Admin',
      readTime: '5 min read'
    },
    {
      id: 2,
      title: 'Mastering Dynamic Programming',
      excerpt: 'A comprehensive guide to understanding and applying dynamic programming techniques.',
      date: 'June 2, 2023',
      author: 'Tech Lead',
      readTime: '12 min read'
    },
    {
      id: 3,
      title: 'Graph Algorithms Every Programmer Should Know',
      excerpt: 'Essential graph algorithms and their practical applications in problem-solving.',
      date: 'June 20, 2023',
      author: 'Senior Mentor',
      readTime: '8 min read'
    },
    {
      id: 4,
      title: 'Tips for Improving Your Problem-Solving Skills',
      excerpt: 'Practical advice on how to approach complex problems and develop efficient solutions.',
      date: 'July 5, 2023',
      author: 'Community Moderator',
      readTime: '6 min read'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="mb-6 flex justify-end">
              <Link
                to="/create-blog"
                className="px-3 py-1.5 text-sm bg-blue-800 text-white rounded hover:bg-blue-900 transition-colors duration-300 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Write a Blog
              </Link>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;