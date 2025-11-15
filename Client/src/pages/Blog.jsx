import React from 'react';
import { Link } from 'react-router-dom';

const Blog = () => {
  // Mock blog posts data
  const blogPosts = [
    {
      id: 1,
      title: 'Getting Started with Competitive Programming',
      excerpt: 'Learn the fundamentals of competitive programming and how to excel in contests.',
      date: 'May 15, 2023',
      author: 'Admin'
    },
    {
      id: 2,
      title: 'Mastering Dynamic Programming',
      excerpt: 'A comprehensive guide to understanding and applying dynamic programming techniques.',
      date: 'June 2, 2023',
      author: 'Tech Lead'
    },
    {
      id: 3,
      title: 'Graph Algorithms Every Programmer Should Know',
      excerpt: 'Essential graph algorithms and their practical applications in problem-solving.',
      date: 'June 20, 2023',
      author: 'Senior Mentor'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <span className="mr-2">←</span> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Blog</h1>
          <p className="text-gray-600 mt-2">Tips, tutorials, and insights for competitive programmers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{post.date}</span>
                  <span>By {post.author}</span>
                </div>
                <button className="mt-4 text-blue-600 font-medium hover:text-blue-800 transition-colors duration-300">
                  Read More →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300">
            Load More Articles
          </button>
        </div>
      </div>
    </div>
  );
};

export default Blog;