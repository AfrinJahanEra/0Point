// Blog.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Blog = () => {
  const { user } = useApp();
  const [blogs, setBlogs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published');

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserDrafts();
    }
  }, [user]);

  const fetchBlogs = async () => {
    try {
      console.log('Fetching published blogs...');
      const response = await api.get('/blog/published/');
      console.log('Published blogs response:', response.data);
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      console.error('Error response:', error.response);
      toast.error(`Failed to load blogs: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDrafts = async () => {
    try {
      console.log('Fetching user drafts...');
      const response = await api.get('/blog/drafts/');
      console.log('User drafts response:', response.data);
      setDrafts(response.data);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      console.error('Error response:', error.response);
      // Don't show error toast for drafts if user is not logged in
      if (error.response?.status !== 401) {
        toast.error(`Failed to load drafts: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Draft';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getExcerpt = (content) => {
    // Simple excerpt from markdown content
    const text = content.replace(/[#*`]/g, '').split('\n')[0];
    return text.length > 120 ? text.substring(0, 120) + '...' : text;
  };

  const getReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/[#*`]/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="mb-4 flex justify-between items-center">
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    activeTab === 'published'
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Published Blogs ({blogs.length})
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('drafts')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      activeTab === 'drafts'
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Drafts ({drafts.length})
                  </button>
                )}
              </div>
              
              {/* Write Blog Button */}
              <Link
                to="/create-blog"
                className="px-3 py-1.5 text-sm bg-blue-800 text-white rounded hover:bg-blue-900 transition-colors duration-300 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Write
              </Link>
            </div>

            {/* Blog List */}
            <div className="space-y-2">
              {(activeTab === 'published' ? blogs : drafts).map((blog) => (
                <article key={blog.id} className="bg-white border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors">
                  {/* Title and Draft Badge */}
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                      <Link to={`/blog/${blog.id}`}>{blog.title}</Link>
                    </h2>
                    {blog.is_draft && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded ml-2 flex-shrink-0">
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                    {getExcerpt(blog.content)}
                  </p>

                  {/* Metadata Row - Like/Dislike icons, Read Time, Date, Tags */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {/* Left: Like/Dislike, Read Time, Date */}
                    <div className="flex items-center gap-2">
                      {/* Thumbs Up */}
                      <div className="flex items-center gap-0.5">
                        <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        <span className="text-gray-600 font-medium">
                          {blog.upvotes || 0}
                        </span>
                      </div>

                      {/* Thumbs Down */}
                      <div className="flex items-center gap-0.5">
                        <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                        <span className="text-gray-600 font-medium">
                          {blog.downvotes || 0}
                        </span>
                      </div>

                      <span>•</span>
                      <span>{getReadTime(blog.content)}</span>
                      <span>•</span>
                      <span>{formatDate(blog.published_at || blog.updated_at)}</span>
                    </div>

                    {/* Right: Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex gap-1">
                        {blog.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))}
                        {blog.tags.length > 2 && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                            +{blog.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {/* Empty State */}
              {(activeTab === 'published' ? blogs : drafts).length === 0 && (
                <div className="text-center py-8">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeTab === 'published' ? 'No published blogs yet' : 'No drafts yet'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'published'
                      ? 'Be the first to publish a blog post!'
                      : 'Start writing your first blog post.'
                    }
                  </p>
                  <div className="mt-4">
                    <Link
                      to="/create-blog"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Write a Blog
                    </Link>
                  </div>
                </div>
              )}
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