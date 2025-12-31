// ContestClarification.jsx - UPDATED WITH CLARIFICATION BACKEND INTEGRATION
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
  MoreVertical,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Users,
  Filter,
  Shield
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ContestClarification = () => {
  const { contestId } = useParams();
  
  const [contest, setContest] = useState(null);
  const [clarifications, setClarifications] = useState([]);
  const [filteredClarifications, setFilteredClarifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    content: '',
    problem: '',
    tags: []
  });
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState(['A', 'B', 'C', 'D']);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  // Clarification specific states
  const [replyInputs, setReplyInputs] = useState({}); // {clarificationId: string}
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showOnlyMyQuestions, setShowOnlyMyQuestions] = useState(false);
  const [organizerView, setOrganizerView] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState({}); // For reply cancellation tracking

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  // Fetch clarifications from backend
  const fetchClarifications = async () => {
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
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (showOnlyMyQuestions) {
        params.append('show_my_questions', 'true');
      }

      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/?${params}`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setClarifications(data.clarifications || []);
      setFilteredClarifications(data.clarifications || []);
      
      if (data.contest) {
        setContest(data.contest);
        setIsOrganizer(data.contest.user_is_organizer || false);
        
        const contestProblems = data.contest.problems || [];
        
        if (Array.isArray(contestProblems) && contestProblems.length > 0) {
          setProblems(contestProblems);
        } else {
          setProblems(['A', 'B', 'C', 'D']);
        }
      }
      
    } catch (error) {
      console.error('Error fetching clarifications:', error);
      setClarifications([]);
      setFilteredClarifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch organizer view if user is organizer
  const fetchOrganizerView = async () => {
    if (!isOrganizer) return;
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      };

      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/organizer/`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.stats?.pending || 0);
      }
    } catch (error) {
      console.error('Error fetching organizer view:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchClarifications();
    fetchOrganizerView();
  }, [contestId]);

  // Refresh when filters/sort change
  useEffect(() => {
    fetchClarifications();
  }, [activeFilter, statusFilter, sortBy, showOnlyMyQuestions]);

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

  const handleCreateQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            title: newQuestion.title,
            content: newQuestion.content,
            problem_index: newQuestion.problem === 'General' ? '' : newQuestion.problem,
            tags: newQuestion.tags
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create question: ${response.status}`);
      }

      const data = await response.json();
      
      setClarifications(prev => [data.clarification, ...prev]);
      setFilteredClarifications(prev => [data.clarification, ...prev]);
      setNewQuestion({ title: '', content: '', problem: '', tags: [] });
      setShowNewQuestionForm(false);
      
      alert('Question submitted successfully! It is now pending approval.');

    } catch (error) {
      console.error('Error creating question:', error);
      alert(error.message || 'Failed to submit question. Please try again.');
    }
  };

  const handleUpdateStatus = async (clarificationId, status, reason = '') => {
    if (!isOrganizer) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/${clarificationId}/status/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            status: status,
            reason: reason
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state
      setClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          return {
            ...item,
            status: data.clarification.status,
            is_published: data.clarification.is_published,
            is_answered: data.clarification.is_answered
          };
        }
        return item;
      }));
      
      setFilteredClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          return {
            ...item,
            status: data.clarification.status,
            is_published: data.clarification.is_published,
            is_answered: data.clarification.is_answered
          };
        }
        return item;
      }));

      fetchOrganizerView(); // Refresh pending count
      
      alert(`Clarification ${status} successfully!`);

    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.message || 'Failed to update status. Please try again.');
    }
  };

  const handleSubmitReply = async (clarificationId) => {
    const replyText = replyInputs[clarificationId] || '';
    
    if (!replyText.trim()) {
      alert('Please enter a reply');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/${clarificationId}/reply/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            content: replyText
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to post reply: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state with new reply
      setClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          const updatedReplies = [...(item.replies || []), data.reply];
          return {
            ...item,
            replies: updatedReplies,
            is_answered: true,
            status: 'answered',
            replies_count: updatedReplies.length
          };
        }
        return item;
      }));
      
      setFilteredClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          const updatedReplies = [...(item.replies || []), data.reply];
          return {
            ...item,
            replies: updatedReplies,
            is_answered: true,
            status: 'answered',
            replies_count: updatedReplies.length
          };
        }
        return item;
      }));

      // Clear input
      setReplyInputs(prev => ({
        ...prev,
        [clarificationId]: ''
      }));
      
      setReplyingTo(prev => ({
        ...prev,
        [clarificationId]: false
      }));
      
      alert('Reply posted successfully!');

    } catch (error) {
      console.error('Error posting reply:', error);
      alert(error.message || 'Failed to post reply. Please try again.');
    }
  };

  const handleWatchToggle = async (clarificationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/${clarificationId}/watch/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            action: 'toggle'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update watch: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state
      setClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          return {
            ...item,
            is_watching: data.watching
          };
        }
        return item;
      }));
      
      setFilteredClarifications(prev => prev.map(item => {
        if (item.id === clarificationId) {
          return {
            ...item,
            is_watching: data.watching
          };
        }
        return item;
      }));

    } catch (error) {
      console.error('Error toggling watch:', error);
      alert('Failed to update watch status. Please try again.');
    }
  };

// In your frontend handleVote function:
const handleVote = async (clarificationId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/contests/${contestId}/clarifications/${clarificationId}/vote/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to vote: ${response.status}`);
    }

    const data = await response.json();
    
    // Update local state - TOGGLE the user_voted state
    setClarifications(prev => prev.map(item => {
      if (item.id === clarificationId) {
        return {
          ...item,
          upvotes: data.upvotes,
          user_voted: data.user_voted  // This should toggle
        };
      }
      return item;
    }));
    
    setFilteredClarifications(prev => prev.map(item => {
      if (item.id === clarificationId) {
        return {
          ...item,
          upvotes: data.upvotes,
          user_voted: data.user_voted  // This should toggle
        };
      }
      return item;
    }));

  } catch (error) {
    console.error('Error voting:', error);
    alert('Failed to vote. Please try again.');
  }
};

  const handleDeleteQuestion = async (clarificationId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/contests/${contestId}/clarifications/${clarificationId}/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete: ${response.status}`);
      }

      // Remove from local state
      setClarifications(prev => prev.filter(item => item.id !== clarificationId));
      setFilteredClarifications(prev => prev.filter(item => item.id !== clarificationId));
      
      alert('Question deleted successfully!');

    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.message || 'Failed to delete question. Please try again.');
    }
  };

  const toggleQuestionDetails = (questionId) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
      setReplyingTo(prev => ({
        ...prev,
        [questionId]: false
      }));
    } else {
      setExpandedQuestion(questionId);
    }
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

  const getStatusBadge = (status, isPublished) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-bold";
    
    if (!isPublished) {
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
    }
    
    switch(status) {
      case 'approved':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Rejected</span>;
      case 'answered':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Answered</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  const renderStatusIndicator = (status, isPublished) => {
    switch(status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'answered':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default:
        return isPublished ? 
          <Eye className="w-4 h-4 text-green-500" /> : 
          <EyeOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClarifications();
  };

  const handleStartReply = (clarificationId) => {
    setReplyingTo(prev => ({
      ...prev,
      [clarificationId]: true
    }));
    setReplyInputs(prev => ({
      ...prev,
      [clarificationId]: ''
    }));
  };

  const handleCancelReply = (clarificationId) => {
    setReplyingTo(prev => ({
      ...prev,
      [clarificationId]: false
    }));
    setReplyInputs(prev => ({
      ...prev,
      [clarificationId]: ''
    }));
  };

  const renderReplies = (replies) => {
    if (!replies || !Array.isArray(replies) || replies.length === 0) {
      return null;
    }
    
    return replies.map((reply) => (
      <div key={reply.id} className="bg-gray-50 rounded-lg p-4 mb-3 border-l-4 border-blue-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-800">
                {reply.author?.name?.charAt(0) || 'O'}
              </span>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                {reply.author?.name || 'Organizer'}
                <span className="text-xs font-medium px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">
                  Organizer
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatDate(reply.created_at)}
              </span>
              {reply.is_edited && (
                <span className="text-xs text-gray-400 ml-2">(edited)</span>
              )}
            </div>
          </div>
          {isOrganizer && (
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <p className="text-gray-700 text-sm whitespace-pre-wrap">
          {reply.content}
        </p>
      </div>
    ));
  };

  if (loading && !clarifications.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading clarifications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        {/* Header with Search and New Question */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search clarifications..."
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
            <div className="flex items-center gap-3">
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => setOrganizerView(!organizerView)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                    organizerView 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {organizerView ? 'Participant View' : 'Organizer View'}
                  </span>
                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNewQuestionForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Ask Question
              </button>
            </div>
          </form>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* Problem Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Problems
              </button>
              <button
                onClick={() => setActiveFilter('problem_general')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === 'problem_general' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                General
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

            {/* Status Filters (for organizers) */}
            {isOrganizer && (
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'approved', 'rejected', 'answered'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${
                      statusFilter === status 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}

            {/* My Questions Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="my-questions"
                checked={showOnlyMyQuestions}
                onChange={(e) => setShowOnlyMyQuestions(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="my-questions" className="text-xs text-gray-700">
                Show only my questions
              </label>
            </div>

            {/* Sort Options */}
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

        {/* New Question Form */}
        {showNewQuestionForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Ask a Question</h3>
              <button
                onClick={() => setShowNewQuestionForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Question title..."
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <textarea
                placeholder="Describe your question in detail..."
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={newQuestion.problem}
                  onChange={(e) => setNewQuestion({...newQuestion, problem: e.target.value})}
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
                  value={newQuestion.tags.join(', ')}
                  onChange={(e) => setNewQuestion({...newQuestion, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">Important Note:</p>
                    <p>Your question will be reviewed by contest organizers before being published to all participants. You will be notified when it's approved or answered.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewQuestionForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Question
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clarifications List */}
        <div className="space-y-4">
          {filteredClarifications.length > 0 ? (
            filteredClarifications.map(question => {
              const canEdit = question.can_edit && question.status === 'pending';
              const canReply = question.can_reply && isOrganizer && question.is_published;
              const canModerate = question.can_moderate && isOrganizer;
              
              return (
                <div 
                  key={question.id} 
                  className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                >
                  <div className="p-6">
                    {/* Status and Problem Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {renderStatusIndicator(question.status, question.is_published)}
                        {getStatusBadge(question.status, question.is_published)}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getProblemColor(question.problem)}`}>
                          Problem {question.problem}
                        </span>
                      </div>
                      
                      {/* Organizer Actions */}
                      {canModerate && !question.is_answered && (
                        <div className="flex items-center gap-2">
                          {question.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'approved')}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-medium flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide a reason for rejection:');
                                  if (reason) handleUpdateStatus(question.id, 'rejected', reason);
                                }}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}
                          {question.is_published && canReply && !question.is_answered && (
                            <button
                              onClick={() => handleStartReply(question.id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" />
                              Reply
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-800">
                          {question.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {question.author?.name || 'Unknown User'}
                          {question.author?.role === 'admin' && (
                            <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-800 rounded ml-2">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Asked {formatDate(question.created_at)}
                          {question.is_published ? ' • Published' : ' • Not Published'}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Edit functionality
                              const newTitle = prompt('Edit title:', question.title);
                              if (newTitle && newTitle.trim()) {
                                // Call update API here
                                console.log('Update title to:', newTitle);
                              }
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Question Title and Content */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {question.title}
                    </h3>

                    <div className="text-gray-600 text-sm mb-6 whitespace-pre-wrap">
                      {expandedQuestion === question.id || question.content.length < 300
                        ? question.content
                        : `${question.content.substring(0, 300)}...`
                      }
                      {question.content.length > 300 && expandedQuestion !== question.id && (
                        <button
                          onClick={() => toggleQuestionDetails(question.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm ml-2"
                        >
                          Read more
                        </button>
                      )}
                    </div>

                    {/* Stats and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-6">

                        {/* Upvotes */}
<button
  onClick={() => handleVote(question.id)}
  disabled={!question.is_published}
  className={`flex items-center gap-1 text-sm ${
    question.user_voted 
      ? 'text-blue-600 font-medium'  // Voted state
      : 'text-gray-500 hover:text-blue-600'
  } ${!question.is_published ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  {/* Show filled thumb when voted */}
  {question.user_voted ? (
    <ThumbsUp className="w-4 h-4" fill="currentColor" />
  ) : (
    <ThumbsUp className="w-4 h-4" />
  )}
  <span>{question.upvotes || 0}</span>
  <span>{question.user_voted ? 'Helpful!' : 'Helpful'}</span>
</button>

                        {/* Replies Count */}
                        <button
                          onClick={() => toggleQuestionDetails(question.id)}
                          className={`flex items-center gap-2 text-sm ${
                            expandedQuestion === question.id
                              ? 'text-blue-600'
                              : 'text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{question.replies_count || 0}</span>
                          <span>Replies</span>
                        </button>
                      </div>

                      {/* Right Side Actions */}
                      <div className="flex items-center gap-4">
                        <button 
                          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report</span>
                        </button>
                        
                        <button 
                          className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Replies Section */}
                    {(expandedQuestion === question.id || (question.replies && question.replies.length > 0)) && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        {/* Replies List */}
                        {question.replies && question.replies.length > 0 ? (
                          <div className="mb-6">
                            <div className="space-y-3">
                              {renderReplies(question.replies)}
                            </div>
                          </div>
                        ) : question.is_answered ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No replies yet, but marked as answered.
                          </div>
                        ) : null}

                        {/* Reply Input (for organizers) */}
                        {canReply && (replyingTo[question.id] || !question.is_answered) && (
                          <div className="mt-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mt-2 flex-shrink-0">
                                <span className="text-sm font-medium text-purple-800">O</span>
                              </div>
                              <div className="flex-1">
                                <textarea
                                  value={replyInputs[question.id] || ''}
                                  onChange={(e) => setReplyInputs(prev => ({
                                    ...prev,
                                    [question.id]: e.target.value
                                  }))}
                                  placeholder="Write your reply as an organizer..."
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                  rows="3"
                                  autoFocus={replyingTo[question.id]}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              {replyingTo[question.id] && (
                                <button
                                  onClick={() => handleCancelReply(question.id)}
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => handleSubmitReply(question.id)}
                                className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                              >
                                {question.is_answered ? 'Add Reply' : 'Post Answer'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Organizer Quick Actions */}
                        {canModerate && !replyingTo[question.id] && (
                          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                            <span className="text-xs text-gray-500">Quick Actions:</span>
                            {!question.is_answered && canReply && (
                              <button
                                onClick={() => handleStartReply(question.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium"
                              >
                                Reply to Question
                              </button>
                            )}
                            {question.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(question.id, 'approved')}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-medium"
                                >
                                  Approve & Publish
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Rejection reason:');
                                    if (reason) handleUpdateStatus(question.id, 'rejected', reason);
                                  }}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No clarifications yet</p>
              {contest && (
                <p className="text-sm text-gray-500 mt-2">
                  {statusFilter === 'pending' && isOrganizer 
                    ? 'No pending clarifications' 
                    : 'Be the first to ask a question'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestClarification;