import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const CommentItem = ({ comment, onReply, onDelete, replyingTo, setReplyingTo, replyText, setReplyText, user, blogAuthor, depth = 0 }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDelete = user && (user.id === comment.author.id || user.id === blogAuthor.id);

  // Codeforces-style rating colors
  const getRatingColor = (rating) => {
    if (!rating || rating < 0) return 'text-gray-600';
    if (rating < 1200) return 'text-gray-700';
    if (rating < 1400) return 'text-green-600';
    if (rating < 1600) return 'text-cyan-600';
    if (rating < 1900) return 'text-blue-600';
    if (rating < 2100) return 'text-purple-600';
    if (rating < 2400) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBg = (rating) => {
    if (!rating || rating < 0) return 'bg-gray-100';
    if (rating < 1200) return 'bg-gray-200';
    if (rating < 1400) return 'bg-green-100';
    if (rating < 1600) return 'bg-cyan-100';
    if (rating < 1900) return 'bg-blue-100';
    if (rating < 2100) return 'bg-purple-100';
    if (rating < 2400) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''}`}>
      <div className="flex gap-3 py-2">
        <div className="flex-shrink-0">
          <div className={`w-6 h-6 ${getRatingBg(comment.author.rating)} rounded-sm flex items-center justify-center text-xs font-bold ${getRatingColor(comment.author.rating)}`}>
            {comment.author.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className={`font-semibold ${getRatingColor(comment.author.rating)} hover:underline cursor-pointer`}>
              {comment.author.name}
            </span>
            {comment.author.rating && (
              <span className={`text-xs px-1 py-0.5 rounded ${getRatingBg(comment.author.rating)} ${getRatingColor(comment.author.rating)} font-mono`}>
                {comment.author.rating}
              </span>
            )}
            <span className="text-gray-500">•</span>
            <span className="text-gray-500 text-xs">{formatDate(comment.created_at)}</span>
            {comment.author.badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                comment.author.badge === 'admin' ? 'bg-red-100 text-red-800' :
                comment.author.badge === 'moderator' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {comment.author.badge}
              </span>
            )}
          </div>
          <div className="text-gray-800 text-sm leading-relaxed mb-2">
            {comment.content}
          </div>
          <div className="flex items-center gap-4 text-xs">
            {user && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && user && (
            <div className="mt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.author.name}...`}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReply(replyText, comment.id)}
                  disabled={!replyText.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-1">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onDelete={onDelete}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  user={user}
                  blogAuthor={blogAuthor}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BlogDetail = () => {
  const { id } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0, score: 0, user_vote: null });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchBlog();
    fetchVotes();
    fetchComments();
  }, [id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchBlog = async () => {
    try {
      const response = await api.get(`/blog/${id}/`);
      setBlog(response.data);
    } catch (error) {
      console.error('Error fetching blog:', error);
      if (error.response?.status === 404) {
        toast.error('Blog not found');
      } else {
        toast.error('Failed to load blog');
      }
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const fetchVotes = async () => {
    try {
      const response = await api.get(`/blog/${id}/votes/`);
      setVotes(response.data);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/blog/${id}/comments/`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    fetchBlog();
    fetchVotes();
    fetchComments();
  }, [id]);

  const handleVote = async (voteType) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    try {
      await api.post(`/blog/${id}/vote/`, { vote_type: voteType });
      await fetchVotes(); // Refresh vote counts
      toast.success(`Blog ${voteType}d!`);
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleComment = async (content, parentCommentId = null) => {
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const commentData = {
        content: content.trim(),
        ...(parentCommentId && { parent_comment_id: parentCommentId })
      };

      await api.post(`/blog/${id}/comments/create/`, commentData);
      await fetchComments(); // Refresh comments
      setNewComment('');
      setReplyText('');
      setReplyingTo(null);
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/blog/comments/${commentId}/delete/`);
      await fetchComments(); // Refresh comments
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Codeforces-style rating colors
  const getRatingColor = (rating) => {
    if (!rating || rating < 0) return 'text-gray-600';
    if (rating < 1200) return 'text-gray-700';
    if (rating < 1400) return 'text-green-600';
    if (rating < 1600) return 'text-cyan-600';
    if (rating < 1900) return 'text-blue-600';
    if (rating < 2100) return 'text-purple-600';
    if (rating < 2400) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBg = (rating) => {
    if (!rating || rating < 0) return 'bg-gray-100';
    if (rating < 1200) return 'bg-gray-200';
    if (rating < 1400) return 'bg-green-100';
    if (rating < 1600) return 'bg-cyan-100';
    if (rating < 1900) return 'bg-blue-100';
    if (rating < 2100) return 'bg-purple-100';
    if (rating < 2400) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.replace(/[#*`]/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const customComponents = {
    spoiler: ({ summary, children }) => (
      <details className="my-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <summary className="cursor-pointer text-lg font-semibold text-blue-700 hover:text-blue-900 list-none">
          <span className="inline-block mr-2">▶</span>
          {summary || 'Solution / Spoiler'}
        </summary>
        <div className="mt-3 pl-8 border-l-4 border-blue-400">{children}</div>
      </details>
    ),

    // Enhanced headings with anchor links (Codeforces style)
    h1: ({ children }) => {
      const id = children ? String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      return (
        <h1 id={id} className="text-3xl font-bold mt-10 mb-6 text-blue-900 border-b-2 border-blue-300 pb-3 group">
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 mr-3 text-blue-600">§</a>
          {children}
        </h1>
      );
    },
    h2: ({ children }) => {
      const id = children ? String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      return (
        <h2 id={id} className="text-2xl font-bold mt-8 mb-4 text-gray-800 group flex items-center">
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 mr-2 text-blue-600 text-lg">§</a>
          {children}
        </h2>
      );
    },
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mt-7 mb-3 text-gray-700 flex items-center group">
        <span className="opacity-0 group-hover:opacity-100 mr-2 text-blue-500 text-sm">›</span>
        {children}
      </h3>
    ),
    ol: ({ depth, ...props }) => {
      const isTopLevel = depth === 0;
      return (
        <ol
          className={`
            my-5 space-y-3
            ${isTopLevel
              ? 'list-decimal ml-9 text-lg marker:font-bold marker:text-blue-800'
              : 'list-decimal ml-8 text-base marker:font-medium marker:text-blue-600'
            }
          `}
          {...props}
        />
      );
    },
    
    // Unordered list component for -, *, + bullets
    ul: ({ depth, ...props }) => {
      const isTopLevel = depth === 0;
      return (
        <ul
          className={`
            my-5 space-y-3
            ${isTopLevel
              ? 'list-disc ml-9 text-lg marker:text-blue-600'
              : 'list-disc ml-8 text-base marker:text-blue-500'
            }
          `}
          {...props}
        />
      );
    },
    
    li: ({ ordered, children, ...props }) => (
      <li
        className="leading-relaxed text-gray-800 pl-2 hover:text-gray-900 transition-colors"
        {...props}
      >
        <span className="drop-cap:inline">{children}</span>
      </li>
    ),
    
    // Blockquote component for > syntax (simple grey style)
    blockquote: ({ children }) => (
      <blockquote className="my-6 pl-5 border-l-4 border-gray-400 bg-gray-100 py-3 pr-4 rounded-r">
        <div className="text-gray-800">
          {children}
        </div>
      </blockquote>
    ),
    
    // Image component supporting base64 and regular URLs
    img: ({ src, alt, ...props }) => {
      // Check if it's a base64 image
      const isBase64 = src && (src.startsWith('data:image/') || src.startsWith('base64,'));
      
      return (
        <div className="my-6 flex flex-col items-center">
          <img
            src={src}
            alt={alt || 'Image'}
            className="max-w-full h-auto rounded-lg shadow-md border border-gray-300"
            {...props}
          />
          {alt && (
            <p className="mt-2 text-sm text-gray-600 text-center italic">
              {alt}
            </p>
          )}
          {isBase64 && (
            <p className="mt-1 text-xs text-gray-500 text-center">
              (Base64 Image)
            </p>
          )}
        </div>
      );
    },

    p: ({ children }) => (
      <p className="mb-4 text-gray-700 leading-relaxed">
        {children}
      </p>
    ),

    pre: ({ children }) => (
      <pre className="bg-gray-100 p-4 rounded text-sm font-mono overflow-x-auto my-4">
        {children}
      </pre>
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-4">
              <button
                onClick={() => navigate('/blog')}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blogs
              </button>
            </div>

            <article className="bg-white border border-gray-200 rounded p-4">
              <header className="mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{blog.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className={`font-medium ${getRatingColor(blog.author.rating)}`}>
                        {blog.author.name}
                      </span>
                      <span>•</span>
                      <span>{formatDate(blog.published_at)}</span>
                      {blog.updated_at !== blog.published_at && (
                        <>
                          <span>•</span>
                          <span>Updated {formatDate(blog.updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleVote('upvote')}
                      className={`p-1 rounded hover:bg-gray-100 ${votes.user_vote === 'upvote' ? 'text-green-600' : 'text-gray-400'}`}
                      title="Upvote"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 001.414 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
                      {votes.score}
                    </span>
                    <button
                      onClick={() => handleVote('downvote')}
                      className={`p-1 rounded hover:bg-gray-100 ${votes.user_vote === 'downvote' ? 'text-red-600' : 'text-gray-400'}`}
                      title="Downvote"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 010-1.414l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">{blog.views} views</span>
                  <span className="text-gray-600">{comments.length} comments</span>
                </div>
              </header>

              <div className="prose prose-sm max-w-none border-t border-gray-100 pt-6">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkBreaks]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                  components={customComponents}
                >
                  {blog.content}
                </ReactMarkdown>
              </div>
            </article>

            {/* Comments Section - Codeforces Style */}
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{comments.length} comments</h2>
              </div>

              {/* New Comment Form */}
              {user ? (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleComment(newComment)}
                      disabled={!newComment.trim()}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-gray-50 rounded text-center text-sm">
                  <p className="text-gray-600">Please <a href="/login" className="text-blue-600 hover:text-blue-800">login</a> to comment.</p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-2">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={handleComment}
                    onDelete={handleDeleteComment}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    user={user}
                    blogAuthor={blog.author}
                    depth={0}
                  />
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No comments yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;