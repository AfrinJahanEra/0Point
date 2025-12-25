// ContestDiscussion.jsx - UPDATED WITH FIXED COMMENTS SYSTEM
// Add these imports from CreateContest.jsx
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Search,
  Plus,
  Send,
  Flag,
  Share2,
  X,
  ThumbsUp,
  ThumbsDown,
  Reply,
  MoreVertical
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ContestDiscussion = () => {
  const { contestId } = useParams();
  
  const [contest, setContest] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    problem: '',
    tags: []
  });
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState(['A', 'B', 'C', 'D']);
  const [expandedPost, setExpandedPost] = useState(null);
  
  // FIX: Separate comment input for each post
  const [commentInputs, setCommentInputs] = useState({}); // {postId: string}
  // FIX: Separate reply state for each post
  const [replyingTo, setReplyingTo] = useState({}); // {postId: commentId}

    const customComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-3 text-gray-700 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-6 list-disc space-y-2 text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-6 list-decimal space-y-2 text-gray-700">
      {children}
    </ol>
  ),
  code: ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <div className="my-4 rounded-md overflow-hidden">
        <div className="bg-gray-800 text-gray-300 text-xs px-4 py-2 font-mono">
          {match[1]}
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    ) : (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        {children}
    </table>
    </div>
  ),
  tr: ({ children }) => (
    <tr className="divide-x divide-gray-200">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 bg-gray-100 text-left text-sm font-semibold text-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  spoiler: ({ children, summary }) => (
    <details className="my-4 bg-gray-50 border border-gray-300 rounded-lg">
      <summary className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:bg-gray-100">
        {summary || 'Solution / Spoiler'}
      </summary>
      <div className="px-4 py-3 border-t border-gray-300 bg-white">
        {children}
      </div>
    </details>
  )
};


  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  // Fetch discussions from backend WITH COMMENTS
  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      };

      const params = new URLSearchParams({
        sort: sortBy,
        page: 1,
        per_page: 20
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (activeFilter !== 'all') {
        const problemLetter = activeFilter.split('_')[1]?.toUpperCase();
        if (problemLetter) {
          params.append('problem', problemLetter);
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/discussions/?${params}`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // FIX: Fetch comments for each discussion
      const discussionsWithComments = await Promise.all(
        (data.discussions || []).map(async (discussion) => {
          try {
            const commentsResponse = await fetch(
              `${API_BASE_URL}/contests/${contestId}/discussions/${discussion.id}/comments/`,
              { headers }
            );
            
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              return {
                ...discussion,
                comments: commentsData.comments || [],
                comment_count: commentsData.total_comments || commentsData.comments?.length || 0
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch comments for discussion ${discussion.id}:`, error);
          }
          
          return {
            ...discussion,
            comments: [],
            comment_count: discussion.comment_count || 0
          };
        })
      );
      
      setDiscussions(discussionsWithComments);
      setFilteredDiscussions(discussionsWithComments);
      
      if (data.contest) {
        setContest(data.contest);
        
        const contestProblems = data.contest.problems || [];
        
        if (Array.isArray(contestProblems) && contestProblems.length > 0) {
          setProblems(contestProblems);
        } else if (Array.isArray(contestProblems) && contestProblems[0] && contestProblems[0].index) {
          const problemIndices = contestProblems.map(p => p.index).filter(Boolean);
          setProblems(problemIndices.length > 0 ? problemIndices : ['A', 'B', 'C', 'D']);
        } else {
          setProblems(['A', 'B', 'C', 'D']);
        }
      }
      
    } catch (error) {
      console.error('Error fetching discussions:', error);
      setDiscussions([]);
      setFilteredDiscussions([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDiscussions();
  }, [contestId]);

  // Filter discussions when search/filter/sort changes
  useEffect(() => {
    fetchDiscussions();
  }, [activeFilter, sortBy]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // FIXED VOTING LOGIC
  const handleVote = async (postId, voteType) => {
    try {
      const currentDiscussion = discussions.find(d => d.id === postId);
      if (!currentDiscussion) return;

      let voteToSend;
      
      if (currentDiscussion.voteStatus === voteType) {
        voteToSend = 'remove';
      } else {
        voteToSend = voteType;
      }

      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/vote/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            vote_type: voteToSend
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Vote failed: ${response.status}`);
      }

      const data = await response.json();
      
      setDiscussions(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            upvotes: data.upvotes,
            downvotes: data.downvotes,
            voteStatus: data.vote_status
          };
        }
        return post;
      }));

      setFilteredDiscussions(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            upvotes: data.upvotes,
            downvotes: data.downvotes,
            voteStatus: data.vote_status
          };
        }
        return post;
      }));

    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

// In ContestDiscussion.jsx - Update the handleSavePost function
const handleSavePost = async (postId) => {
  try {
    const currentDiscussion = discussions.find(d => d.id === postId);
    if (!currentDiscussion) return;

    // Use 'toggle' action by default
    const action = 'toggle';
    
    const response = await fetch(
      `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/save/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          action: action
        })
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await response.json();
        console.warn('Save action warning:', errorData.error);
        
        // Still toggle the UI state even if backend says already saved/unsaved
        setDiscussions(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              saved: !post.saved // Toggle the saved state
            };
          }
          return post;
        }));
        
        setFilteredDiscussions(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              saved: !post.saved // Toggle the saved state
            };
          }
          return post;
        }));
        return;
      }
      throw new Error(`Save failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Update local state based on response
    setDiscussions(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          saved: data.saved
        };
      }
      return post;
    }));

    setFilteredDiscussions(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          saved: data.saved
        };
      }
      return post;
    }));

    // Optional: Show a brief success message
    if (data.saved) {
      console.log('Post saved successfully');
    } else {
      console.log('Post unsaved successfully');
    }

  } catch (error) {
    console.error('Error saving post:', error);
    alert('Failed to save post. Please try again.');
  }
};

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/discussions/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            title: newPost.title,
            content: newPost.content,
            problem_index: newPost.problem === 'General' ? '' : newPost.problem,
            tags: newPost.tags
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create post: ${response.status}`);
      }

      const data = await response.json();
      
      setDiscussions(prev => [data.discussion, ...prev]);
      setFilteredDiscussions(prev => [data.discussion, ...prev]);
      setNewPost({ title: '', content: '', problem: '', tags: [] });
      setShowNewPostForm(false);
      
      alert('Post created successfully!');

    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to create post. Please try again.');
    }
  };

  // FIXED: Nested comments renderer
  const renderComments = (comments, depth = 0, postId) => {
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          No comments yet.
        </div>
      );
    }
    
    return comments.map((comment) => {
      const commentId = comment.id;
      const authorName = comment.author?.name || 'Unknown User';
      const authorInitial = authorName.charAt(0).toUpperCase();
      const hasReplies = comment.replies && comment.replies.length > 0;
      
      return (
        <div key={commentId} className="mb-4">
          <div className={`flex ${depth > 0 ? 'ml-6' : ''}`}>
            {/* Visual connector for nested comments */}
            {depth > 0 && (
              <div className="w-6 flex-shrink-0 flex flex-col items-center">
                <div className="w-0.5 h-8 bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full border border-gray-300 bg-white"></div>
                <div className="flex-1 w-0.5 bg-gray-300"></div>
              </div>
            )}
            
            <div className={`flex-1 ${depth > 0 ? 'ml-2' : ''}`}>
              {/* Comment Card */}
              <div className={`bg-gray-50 rounded-lg p-4 ${depth > 0 ? 'border-l-4 border-blue-300' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {authorInitial}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {authorName}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(comment.created_at || comment.createdAt)}
                      </span>
                      {comment.is_edited && (
                        <span className="text-xs text-gray-400 ml-2">(edited)</span>
                      )}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-gray-700 text-sm mb-3 prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                    components={customComponents}
                  >
                    {comment.content || 'No content'}
                  </ReactMarkdown>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReply(postId, commentId);
                    }}
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                  <button className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {comment.upvotes || 0}
                  </button>
                  <button className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" />
                    {comment.downvotes || 0}
                  </button>
                  {hasReplies && (
                    <span className="text-xs text-gray-500">
                      {comment.replies_count || comment.replies?.length || 0} replies
                    </span>
                  )}
                </div>
              </div>
              
              {/* Reply input for this specific comment */}
              {replyingTo[postId] === commentId && (
                <div className="mt-3 ml-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-2 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-800">Y</span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentInputs[postId] || ''}
                        onChange={(e) => setCommentInputs(prev => ({
                          ...prev,
                          [postId]: e.target.value
                        }))}
                        placeholder="Write your reply..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows="2"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => handleCancelReply(postId)}
                          className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitComment(postId, commentId)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Recursively render replies */}
              {hasReplies && (
                <div className="mt-4">
                  {renderComments(comment.replies, depth + 1, postId)}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  // Update toggleComments function
  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      handleCancelReply(postId);
    } else {
      setExpandedPost(postId);
      handleCancelReply(postId);
      
      // Only fetch if comments are empty
      const post = discussions.find(p => p.id === postId);
      if (!post.comments || post.comments.length === 0) {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          };

          const commentsResponse = await fetch(
            `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/comments/`,
            { headers }
          );

          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            
            setDiscussions(prev => prev.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: commentsData.comments || [],
                  comment_count: commentsData.total_comments || commentsData.comments?.length || 0
                };
              }
              return post;
            }));
            
            setFilteredDiscussions(prev => prev.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: commentsData.comments || [],
                  comment_count: commentsData.total_comments || commentsData.comments?.length || 0
                };
              }
              return post;
            }));
          }
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      }
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (postId, parentCommentId = null) => {
    const commentText = commentInputs[postId] || '';
    
    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/comments/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            content: commentText,
            parent_comment_id: parentCommentId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to post comment: ${response.status}`);
      }

      const data = await response.json();
      
      // Refresh comments after posting
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        };

        const commentsResponse = await fetch(
          `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/comments/`,
          { headers }
        );

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          
          setDiscussions(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: commentsData.comments || [],
                comment_count: commentsData.total_comments || commentsData.comments?.length || 0
              };
            }
            return post;
          }));

          setFilteredDiscussions(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: commentsData.comments || [],
                comment_count: commentsData.total_comments || commentsData.comments?.length || 0
              };
            }
            return post;
          }));
        }
      } catch (fetchError) {
        console.error('Error refreshing comments:', fetchError);
      }

      // Reset input and reply state for this post
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }));
      handleCancelReply(postId);
      
      alert('Comment posted successfully!');

    } catch (error) {
      console.error('Error posting comment:', error);
      alert(error.message || 'Failed to post comment. Please try again.');
    }
  };

  // Reply to a comment
  const handleReply = (postId, commentId) => {
    setReplyingTo(prev => ({
      ...prev,
      [postId]: commentId
    }));
    setCommentInputs(prev => ({
      ...prev,
      [postId]: ''
    }));
  };

  // Cancel reply
  const handleCancelReply = (postId) => {
    setReplyingTo(prev => ({
      ...prev,
      [postId]: null
    }));
    setCommentInputs(prev => ({
      ...prev,
      [postId]: ''
    }));
  };

  const getProblemColor = (problem) => {
    switch(problem) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-green-100 text-green-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-purple-100 text-purple-800';
      case 'General': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDiscussions();
  };

  if (loading && !discussions.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading discussions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Header with Search and New Post */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e); // Only search on Enter
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNewPostForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Post
            </button>
          </form>

          {/* Filters and Sort */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Posts
              </button>
              {problems.map(problem => (
                <button
                  key={problem}
                  onClick={() => setActiveFilter(`problem_${problem.toLowerCase()}`)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeFilter === `problem_${problem.toLowerCase()}` 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Problem {problem}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-700">Sort by:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1 text-xs rounded-lg ${
                    sortBy === 'recent' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Most Recent
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-1 text-xs rounded-lg ${
                    sortBy === 'popular' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Most Popular
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* New Post Form */}
        {showNewPostForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Create New Post</h3>
              <button
                onClick={() => setShowNewPostForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Post title..."
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <textarea
                placeholder="Write your post content... (Markdown supported)"
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={newPost.problem}
                  onChange={(e) => setNewPost({...newPost, problem: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Problem (Optional)</option>
                  <option value="General">General</option>
                  {problems.map(problem => (
                    <option key={problem} value={problem}>Problem {problem}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={newPost.tags.join(', ')}
                  onChange={(e) => setNewPost({...newPost, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewPostForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post Discussion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discussions List */}
        <div className="space-y-4">
          {filteredDiscussions.length > 0 ? (
            filteredDiscussions.map(post => (
              <div 
                key={post.id} 
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                <div className="p-6">
                  {/* Author Info - Top Left */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {post.author?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {post.author?.name || 'Unknown User'}
                        <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded ml-2">
                          {post.author?.role || 'Participant'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Problem Tag */}
                  <div className="mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getProblemColor(post.problem)}`}>
                      Problem {post.problem}
                    </span>
                  </div>

                  {/* Post Title and Preview */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {post.title}
                  </h3>

                  <div className="text-gray-600 text-xs mb-6 prose prose-sm max-w-none">
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
    components={customComponents}
  >
    {post.content.length > 150 
      ? post.content.substring(0, 150) + '...' 
      : post.content
    }
  </ReactMarkdown>
</div>

                  {/* Actions - Bottom Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {/* Left Side - Upvote/Downvote and Comments */}
                    <div className="flex items-center gap-6">
                      {/* Voting */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(post.id, 'upvoted');
                          }}
                          className={`p-1.5 rounded ${
                            post.voteStatus === 'upvoted' 
                              ? 'text-green-600 bg-green-50 border border-green-200' 
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <span className="font-medium text-gray-900 min-w-[20px] text-center mx-1">
                          {(post.upvotes || 0) - (post.downvotes || 0)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(post.id, 'downvoted');
                          }}
                          className={`p-1.5 rounded ${
                            post.voteStatus === 'downvoted' 
                              ? 'text-red-600 bg-red-50 border border-red-200' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Comments Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComments(post.id);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          expandedPost === post.id
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs">{post.comment_count || 0}</span>
                        <span className="text-xs">Comments</span>
                      </button>
                    </div>

                    {/* Right Side - Save, Report, Share */}
                    <div className="flex items-center gap-4">
{/* In the JSX where you render the save button */}
<button
  onClick={(e) => {
    e.stopPropagation();
    handleSavePost(post.id);
  }}
  className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
    post.saved 
      ? 'text-blue-600 hover:text-blue-700' 
      : 'text-gray-500 hover:text-blue-600'
  }`}
>
  {post.saved ? (
    // When saved - use Bookmark with fill
    <Bookmark className="w-4 h-4" strokeWidth={1.5} fill="currentColor" />
  ) : (
    // When not saved - use outline Bookmark
    <Bookmark className="w-4 h-4" strokeWidth={1.5} />
  )}
  <span>{post.saved ? 'Saved' : 'Save'}</span>
</button>
                      
                      <button 
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Flag className="w-4 h-4" />
                        <span>Report</span>
                      </button>
                      
                      <button 
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section - Expandable */}
                  {expandedPost === post.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">
                        Comments ({post.comment_count || 0})
                      </h4>
                      
                      {/* Comment Input */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">Y</span>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))}
                              placeholder={replyingTo[post.id] ? "Write your reply..." : "Write a comment..."}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              rows="3"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          {replyingTo[post.id] && (
                            <button
                              onClick={() => handleCancelReply(post.id)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              Cancel Reply
                            </button>
                          )}
                          <button
                            onClick={() => handleSubmitComment(post.id, replyingTo[post.id] || null)}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            {replyingTo[post.id] ? 'Reply' : 'Comment'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Comments List */}
                      <div className="space-y-4">
                        {post.comments && post.comments.length > 0 ? (
                          renderComments(post.comments, 0, post.id)
                        ) : (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No comments yet. Be the first to comment!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No discussions found</p>
              {contest && (
                <p className="text-sm text-gray-500 mt-2">
                  Be the first to start a discussion for "{contest.title}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestDiscussion;