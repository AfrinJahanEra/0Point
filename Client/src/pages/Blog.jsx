// Blog.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Blog = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('published');
  const [filter, setFilter] = useState('all'); // all, recent, popular
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBlogs();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserDrafts();
    }
  }, [user]);

  const fetchBlogs = async () => {
    if (!user) { setBlogs([]); setLoading(false); return; }

    const CACHE_KEY    = `blog_user_published_${user.id || user.email || 'me'}`;
    const CACHE_TS_KEY = `${CACHE_KEY}_ts`;
    const MAX_AGE      = 2 * 60 * 1000;

    // 1. Show stale data instantly
    try {
      const cached   = localStorage.getItem(CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);
      const isFresh  = (Date.now() - cachedAt) < MAX_AGE;
      if (cached) {
        setBlogs(JSON.parse(cached));
        setLoading(false);
        if (isFresh) return;
      }
    } catch (_) {}

    // 2. Background refresh
    try {
      const response = await api.get('/blog/user-published/');
      setBlogs(response.data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (_) {}
    } catch (error) {
      console.error('Error fetching blogs:', error);
      if (!localStorage.getItem(CACHE_KEY))
        toast.error(`Failed to load blogs: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const fetchUserDrafts = async () => {
    try {
      const response = await api.get('/blog/drafts/');
      setDrafts(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error(`Failed to load drafts: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Draft';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }).replace(',', '');
  };

  const getExcerpt = (content) => {
    // Get first 10 lines or 200 characters
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const firstLines = lines.slice(0, 10).join(' ');
    const text = firstLines.replace(/[#*`\[\]\(\)]/g, '').trim();
    
    if (text.length > 200) {
      return text.substring(0, 200) + '...';
    }
    return text || 'No content preview available';
  };

  const getReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/[#*`\[\]\(\)]/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    blog.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDrafts = drafts.filter(draft =>
    draft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentBlogs = activeTab === 'published' ? filteredBlogs : filteredDrafts;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Please log in to manage your blogs.</p>
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Go to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && activeTab === 'published') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="space-y-1.5 mb-3">
                    <div className="h-2.5 bg-gray-200 rounded w-full" />
                    <div className="h-2.5 bg-gray-200 rounded w-5/6" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded-full w-14" />
                    <div className="h-5 bg-gray-200 rounded-full w-14" />
                    <div className="ml-auto h-5 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                {[1,2,3].map(j => <div key={j} className="h-2.5 bg-gray-200 rounded" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Header with Tabs and Actions */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  {/* Simple Published/Drafts tabs */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setActiveTab('published')}
                      className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                        activeTab === 'published'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700 border-transparent'
                      }`}
                    >
                      Published ({blogs.length})
                    </button>
                    {user && (
                      <button
                        onClick={() => setActiveTab('drafts')}
                        className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                          activeTab === 'drafts'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 border-transparent'
                        }`}
                      >
                        Drafts ({drafts.length})
                      </button>
                    )}
                  </div>

                  {/* Filters for Published tab */}
                  {activeTab === 'published' && (
                    <div className="flex gap-3">
                      {['all', 'recent', 'popular'].map((filterOption) => (
                        <button
                          key={filterOption}
                          onClick={() => setFilter(filterOption)}
                          className={`text-xs font-medium transition-colors ${
                            filter === filterOption
                              ? 'text-blue-600'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search and Create Entry */}
                <div className="flex items-center gap-3">
                  {showSearch ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search blogs..."
                          className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-48"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <button
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  )}
                  
                  <Link
                    to="/create-blog"
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create Entry
                  </Link>
                </div>
              </div>
            </div>

            {/* Blog List - Compact Cards */}
            <div className="space-y-2">
              {currentBlogs.map((blog) => (
                <article key={blog.id} className="bg-white rounded border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                  {/* Blog Header - Compact */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Author */}
                        {blog.author?.username && (
                          <>
                            {blog.author?.id ? (
                              <Link 
                                to={`/user/${blog.author.id}`}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {blog.author.username}
                              </Link>
                            ) : (
                              <span className="text-xs font-medium text-gray-700">
                                {blog.author.username}
                              </span>
                            )}
                            <span className="text-gray-400 text-xs">•</span>
                          </>
                        )}
                        
                        {/* Date */}
                        <span className="text-xs text-gray-500">
                          {formatDate(blog.published_at || blog.updated_at)}
                        </span>
                        
                        {/* Draft Badge */}
                        {blog.is_draft && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      
                      {/* Blog Title */}
                      <h2 className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-1">
                        <Link to={`/blog/${blog.id}`} className="block">
                          {blog.title}
                        </Link>
                      </h2>
                    </div>
                    
                    {/* Like/Disvote Stats - Compact */}
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-900">
                          {blog.upvotes || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-900">
                          {blog.downvotes || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Excerpt - First 10 lines */}
                  <p className="text-xs text-gray-700 mb-2 line-clamp-3 leading-relaxed">
                    {getExcerpt(blog.content)}
                  </p>

                  {/* Footer - Tags and Metadata */}
                  <div className="flex items-center justify-between">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {blog.tags?.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                          onClick={() => {
                            setSearchQuery(tag);
                            setFilter('all');
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {blog.tags && blog.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-xs text-gray-500">
                          +{blog.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getReadTime(blog.content)}m
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {blog.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </article>
              ))}

              {/* Empty State */}
              {currentBlogs.length === 0 && (
                <div className="bg-white rounded border border-gray-200 p-6 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {searchQuery 
                      ? `No results for "${searchQuery}"` 
                      : activeTab === 'published'
                        ? 'No published blogs'
                        : 'No drafts'
                    }
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    {searchQuery 
                      ? 'Try a different search'
                      : activeTab === 'published'
                        ? 'Share your knowledge with the community!'
                        : 'Start writing your first blog post'
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Clear Search
                      </button>
                    )}
                    <Link
                      to="/create-blog"
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create Entry
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Load More */}
            {currentBlogs.length > 0 && currentBlogs.length % 15 === 0 && (
              <div className="mt-4 text-center">
                <button className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors">
                  Load More
                </button>
              </div>
            )}
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