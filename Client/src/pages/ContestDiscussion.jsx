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
  Reply,
  MoreVertical,
  Hash,
  User,
  Filter,
  Eye,
  Lock,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ContestDiscussion = () => {
  const { contestId } = useParams();
  
  const [discussions, setDiscussions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    problem: ''
  });
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState(['A', 'B', 'C', 'D']);
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState({});

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  // Fetch discussions
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
      
      // Fetch comments for each discussion
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
      
      if (data.contest?.problems) {
        const contestProblems = data.contest.problems || [];
        if (Array.isArray(contestProblems) && contestProblems.length > 0) {
          setProblems(contestProblems);
        }
      }
      
    } catch (error) {
      console.error('Error fetching discussions:', error);
      setDiscussions([]);
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
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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

    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleSavePost = async (postId) => {
    try {
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

      if (response.ok) {
        const data = await response.json();
        
        setDiscussions(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              saved: data.saved
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error saving post:', error);
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
            problem_index: newPost.problem === 'General' ? '' : newPost.problem
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        setDiscussions(prev => [data.discussion, ...prev]);
        setNewPost({ title: '', content: '', problem: '' });
        setShowNewPostForm(false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      handleCancelReply(postId);
    } else {
      setExpandedPost(postId);
      handleCancelReply(postId);
      
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
          }
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      }
    }
  };

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

      if (response.ok) {
        // Refresh comments
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
        }

        // Reset input and reply state
        setCommentInputs(prev => ({
          ...prev,
          [postId]: ''
        }));
        handleCancelReply(postId);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

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
      case 'A': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'B': return 'bg-green-50 text-green-700 border-green-200';
      case 'C': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'D': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'General': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDiscussions();
  };

  if (loading && !discussions.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-xs">Loading discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <h1 className="text-sm font-bold">Discussion</h1>
              <span className="text-xs bg-blue-800 text-blue-100 px-1.5 py-0.5 rounded">
                CONTEST
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Problem Filter */}
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-500" />
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white w-32"
              >
                <option value="all">All Problems</option>
                <option value="problem_general">General</option>
                {problems.map(problem => (
                  <option key={problem} value={`problem_${problem.toLowerCase()}`}>
                    Problem {problem}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white w-28"
              >
                <option value="recent">Recent</option>
                <option value="popular">Popular</option>
              </select>
            </div>

            {/* New Post Button */}
            <button
              onClick={() => setShowNewPostForm(true)}
              className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New Post
            </button>
          </div>
        </div>

        {/* New Post Form */}
        {showNewPostForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-xs">New Post</h3>
              <button
                onClick={() => setShowNewPostForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Title"
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <textarea
                placeholder="Content"
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newPost.problem}
                  onChange={(e) => setNewPost({...newPost, problem: e.target.value})}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white flex-1"
                >
                  <option value="">Select Problem</option>
                  <option value="General">General</option>
                  {problems.map(problem => (
                    <option key={problem} value={problem}>Problem {problem}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreatePost}
                  className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discussions List */}
        {discussions.length > 0 ? (
          <div className="space-y-2">
            {discussions.map(post => (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200">
                {/* Post Header */}
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getProblemColor(post.problem)}`}>
                      {post.problem}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-xs truncate">
                        {post.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      <span>{post.author?.name?.split(' ')[0] || 'User'}</span>
                    </div>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>

                {/* Post Content Preview */}
                <div className="p-2">
                  <p className="text-gray-600 text-xs line-clamp-2">
                    {post.content.substring(0, 100)}
                    {post.content.length > 100 && '...'}
                  </p>
                </div>

                {/* Post Actions */}
                <div className="p-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    {/* Left Actions */}
                    <div className="flex items-center gap-3">
                      {/* Voting */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote(post.id, 'upvoted')}
                          className={`p-0.5 rounded ${post.voteStatus === 'upvoted' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-gray-700 min-w-[16px] text-center">
                          {(post.upvotes || 0) - (post.downvotes || 0)}
                        </span>
                        <button
                          onClick={() => handleVote(post.id, 'downvoted')}
                          className={`p-0.5 rounded ${post.voteStatus === 'downvoted' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Comments */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className={`flex items-center gap-1 text-xs ${expandedPost === post.id ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{post.comment_count || 0}</span>
                      </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSavePost(post.id)}
                        className={`text-xs ${post.saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                        title={post.saved ? 'Saved' : 'Save'}
                      >
                        <Bookmark className="w-3 h-3" fill={post.saved ? 'currentColor' : 'none'} />
                      </button>
                      <button className="text-gray-400 hover:text-red-600" title="Report">
                        <Flag className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {expandedPost === post.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      {/* Comment Input */}
                      <div className="mb-2">
                        <div className="flex items-start gap-1">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-medium text-blue-800">Y</span>
                          </div>
                          <textarea
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({
                              ...prev,
                              [post.id]: e.target.value
                            }))}
                            placeholder={replyingTo[post.id] ? "Write reply..." : "Write comment..."}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            rows="2"
                          />
                        </div>
                        <div className="flex justify-end gap-1 mt-1">
                          {replyingTo[post.id] && (
                            <button
                              onClick={() => handleCancelReply(post.id)}
                              className="px-1.5 py-0.5 border border-gray-300 text-gray-700 rounded text-[10px] hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleSubmitComment(post.id, replyingTo[post.id] || null)}
                            className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                          >
                            {replyingTo[post.id] ? 'Reply' : 'Comment'}
                          </button>
                        </div>
                      </div>

                      {/* Comments List */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {post.comments.slice(0, 5).map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded p-1.5">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-[10px] font-medium text-blue-800">
                                      {comment.author?.name?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-medium text-gray-700">
                                    {comment.author?.name?.split(' ')[0] || 'User'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleReply(post.id, comment.id)}
                                  className="text-gray-400 hover:text-blue-600"
                                  title="Reply"
                                >
                                  <Reply className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <p className="text-gray-600 text-xs">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                          {post.comments.length > 5 && (
                            <div className="text-center">
                              <button className="text-blue-600 text-xs hover:text-blue-800">
                                Show {post.comments.length - 5} more comments
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-gray-500 text-xs">
                          No comments yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-gray-600 text-xs">No discussions found</p>
          </div>
        )}

        {/* Stats */}
        {discussions.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            Showing {discussions.length} discussions
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestDiscussion;