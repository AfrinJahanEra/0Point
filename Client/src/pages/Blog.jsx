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
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  const getReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/[#*`]/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
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
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="mb-6 flex justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'drafts'
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    My Drafts ({drafts.length})
                  </button>
                )}
              </div>
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

            <div className="space-y-3">
              {(activeTab === 'published' ? blogs : drafts).map((blog) => (
                <article key={blog.id} className="bg-white border border-gray-200 rounded p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    {/* Voting Score - Codeforces Style */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <button className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors" title="Upvote">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </button>
                      <span className={`text-sm font-bold min-w-[2rem] text-center ${
                        (blog.score || 0) > 0 ? 'text-green-600' :
                        (blog.score || 0) < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {blog.score || 0}
                      </span>
                      <button className="w-5 h-5 text-gray-400 hover:text-red-600 transition-colors" title="Downvote">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V4" />
                        </svg>
                      </button>
                    </div>

                    {/* Blog Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          <Link to={`/blog/${blog.id}`}>{blog.title}</Link>
                        </h2>
                        {blog.is_draft && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded ml-2 flex-shrink-0">
                            Draft
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {getExcerpt(blog.content)}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-blue-100 rounded-sm flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">
                                {blog.author.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-blue-600 hover:underline cursor-pointer">
                              {blog.author.name}
                            </span>
                          </span>
                          <span>•</span>
                          <span>{getReadTime(blog.content)}</span>
                          <span>•</span>
                          <span>{formatDate(blog.published_at || blog.updated_at)}</span>
                        </div>

                        {blog.tags && blog.tags.length > 0 && (
                          <div className="flex gap-1">
                            {blog.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {(activeTab === 'published' ? blogs : drafts).length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="mt-6">
                    <Link
                      to="/create-blog"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
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