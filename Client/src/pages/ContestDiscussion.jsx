// ContestDiscussion.jsx - UPDATED WITH API INTEGRATION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Search,
  Plus,
  Send,
  Flag,
  Share2
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/'; // Adjust to your backend URL

const ContestDiscussion = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    problem: '', // Frontend uses 'problem' field
    tags: []
  });
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState(['A', 'B', 'C', 'D']);

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  // Fetch discussions from backend
  const fetchDiscussions = async () => {
    try {
      setLoading(true);
    //   const TOKEN = localStorage.getItem('access_token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`  // Always use hardcoded token
        };

      // Build query parameters
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
      setDiscussions(data.discussions || []);
      setFilteredDiscussions(data.discussions || []);
      
      // Update contest info
      if (data.contest) {
        setContest(data.contest);
        setProblems(data.contest.problems || ['A', 'B', 'C', 'D']);
      }
      
    } catch (error) {
      console.error('Error fetching discussions:', error);
      // Fallback to mock data if API fails
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
  }, [activeFilter, searchQuery, sortBy]);

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

  const handleVote = async (postId, voteType) => {
    try {

      // Map frontend vote_status to backend vote_type
      const voteMapping = {
        'upvoted': 'upvote',
        'downvoted': 'downvote'
      };
      
      // Determine what to send based on current vote
      let voteToSend = voteType;
      const currentDiscussion = discussions.find(d => d.id === postId);
      
      if (currentDiscussion.voteStatus === voteType) {
        // Remove vote if already voted the same way
        voteToSend = 'remove';
      } else if (currentDiscussion.voteStatus) {
        // Change vote
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
            vote_type: voteMapping[voteToSend] || voteToSend
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Vote failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state
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
      alert('Failed to vote. Please try again.');
    }
  };

  const handleSavePost = async (postId) => {
    try {

      const currentDiscussion = discussions.find(d => d.id === postId);
      const action = currentDiscussion.saved ? 'unsave' : 'save';

      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/discussions/${postId}/save/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({ action })
        }
      );

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state
      setDiscussions(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            saved: data.saved
          };
        }
        return post;
      }));

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
      
      // Add new post to discussions
      setDiscussions(prev => [data.discussion, ...prev]);
      setNewPost({ title: '', content: '', problem: '', tags: [] });
      setShowNewPostForm(false);
      
      alert('Post created successfully!');

    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message || 'Failed to create post. Please try again.');
    }
  };

  const handleViewPost = (postId) => {
    navigate(`/contests/${contestId}/discussion/${postId}`);
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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
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
                ×
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
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                onClick={() => handleViewPost(post.id)}
              >
                <div className="p-6">
                  {/* Author Info - Top Left */}
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`}
                      alt={post.author?.name}
                      className="w-10 h-10 rounded-full"
                    />
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

                  <div className="text-gray-600 text-xs mb-6 line-clamp-3">
                    {post.content.split('\n')[0]}
                    {post.content.split('\n').length > 1 && '...'}
                  </div>

                  {/* Actions - Bottom Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {/* Left Side - Upvote/Downvote and Comments */}
                    <div className="flex items-center gap-6">
                      {/* Voting */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(post.id, 'upvoted');
                          }}
                          className={`p-1.5 rounded ${post.voteStatus === 'upvoted' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <span className="font-medium text-gray-900 min-w-[20px] text-center mx-1">
                          {post.upvotes - post.downvotes}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(post.id, 'downvoted');
                          }}
                          className={`p-1.5 rounded ${post.voteStatus === 'downvoted' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Comments */}
                      <div className="flex items-center gap-2 text-gray-500">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs">{post.comments || 0}</span>
                      </div>
                    </div>

                    {/* Right Side - Save, Report, Share */}
                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSavePost(post.id);
                        }}
                        className={`flex items-center gap-1 text-xs ${post.saved ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>{post.saved ? 'Saved' : 'Save'}</span>
                      </button>
                      
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600">
                        <Flag className="w-4 h-4" />
                        <span>Report</span>
                      </button>
                      
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
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