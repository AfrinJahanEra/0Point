import React from 'react';
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