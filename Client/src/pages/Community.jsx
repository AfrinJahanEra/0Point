import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Community = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBlogs, setExpandedBlogs] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const blogsPerPage = 5;

  useEffect(() => {
    fetchAllPublishedBlogs();
  }, []);

  const fetchAllPublishedBlogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/blog/published/');
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load community blogs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRatingColor = (rating) => {
    if (!rating || rating < 0) return 'text-gray-600';
    if (rating < 1200) return 'text-gray-700';
    if (rating < 1400) return 'text-green-600';
    if (rating < 1600) return 'text-cyan-600';
    if (rating < 1900) return 'text-blue-600';
    if (rating < 2100) return 'text-purple-600';
    if (rating < 2400) return 'text-orange-500';
    return 'text-red-600';
  };

  const getRatingBg = (rating) => {
    if (!rating || rating < 0) return 'bg-gray-200';
    if (rating < 1200) return 'bg-gray-200';
    if (rating < 1400) return 'bg-green-100';
    if (rating < 1600) return 'bg-cyan-100';
    if (rating < 1900) return 'bg-blue-100';
    if (rating < 2100) return 'bg-purple-100';
    if (rating < 2400) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const toggleExpand = (blogId) => {
    setExpandedBlogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blogId)) {
        newSet.delete(blogId);
      } else {
        newSet.add(blogId);
      }
      return newSet;
    });
  };

  // Markdown components for rendering
  const customComponents = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-800 leading-relaxed mb-3">{children}</p>
    ),
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 text-sm text-gray-900 rounded font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto" {...props}>
          {children}
        </code>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc ml-6 mb-3 space-y-1 text-sm">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 mb-3 space-y-1 text-sm">{children}</ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-400 pl-4 py-2 my-3 bg-gray-50 text-sm text-gray-800">
        {children}
      </blockquote>
    ),
  };

  // Filter blogs based on search
  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    blog.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading community blogs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Community Blogs</h1>
                
                {/* Search Bar */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search blogs, tags, or authors..."
                      className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {user && (
                    <Link
                      to="/create-blog"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Write Blog
                    </Link>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                Showing {indexOfFirstBlog + 1}-{Math.min(indexOfLastBlog, filteredBlogs.length)} of {filteredBlogs.length} blogs
              </p>
            </div>

            {/* Blog List */}
            <div className="space-y-4">
              {currentBlogs.map((blog) => {
                const isExpanded = expandedBlogs.has(blog.id);
                
                return (
                  <article key={blog.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    {/* Blog Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {/* Author Avatar */}
                          <div className={`w-8 h-8 ${getRatingBg(blog.author?.rating)} rounded-full flex items-center justify-center text-sm font-bold ${getRatingColor(blog.author?.rating)}`}>
                            {blog.author?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          
                          {/* Author Info */}
                          <div>
                            <Link 
                              to={`/profile/${blog.author?.name}`}
                              className={`text-sm font-medium hover:underline ${getRatingColor(blog.author?.rating)}`}
                            >
                              {blog.author?.name || 'Unknown Author'}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {formatDate(blog.published_at)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Vote Stats */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{blog.upvotes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{blog.downvotes || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Blog Title */}
                      <Link to={`/blog/${blog.id}`}>
                        <h2 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors mb-2">
                          {blog.title}
                        </h2>
                      </Link>
                      
                      {/* Tags */}
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-900 rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSearchQuery(tag);
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Blog Content */}
                    <div className="p-4">
                      <div className={`prose prose-sm max-w-none ${!isExpanded ? 'line-clamp-4' : ''}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkBreaks]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                          components={customComponents}
                        >
                          {blog.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpand(blog.id);
                        }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show Less</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Read More</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between rounded-b-lg">
                      <Link
                        to={`/blog/${blog.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        View Full Blog
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      
                      {blog.co_authors && blog.co_authors.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {blog.co_authors.length} co-author{blog.co_authors.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Empty State */}
            {currentBlogs.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? `No blogs found for "${searchQuery}"` : 'No blogs yet'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {searchQuery 
                    ? 'Try a different search term or clear your search'
                    : 'Be the first to share your knowledge with the community!'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 text-sm font-medium rounded ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={pageNumber} className="px-2 text-gray-500">...</span>;
                  }
                  return null;
                })}
                
                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
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

export default Community;