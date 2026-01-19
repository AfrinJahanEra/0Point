import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MessageSquare,
  ChevronUp,
  Search,
  Plus,
  Send,
  X,
  ThumbsUp,
  Reply,
  Hash,
  User,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const ContestClarification = () => {
  const { contestId } = useParams();
  
  const [clarifications, setClarifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    content: '',
    problem: ''
  });
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState(['A', 'B', 'C', 'D']);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showOnlyMyQuestions, setShowOnlyMyQuestions] = useState(false);
  const [organizerView, setOrganizerView] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const TOKEN = localStorage.getItem('token');

  // Fetch clarifications
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
      setIsOrganizer(data.contest?.user_is_organizer || false);
      
      if (data.contest?.problems) {
        setProblems(data.contest.problems);
      }
      
    } catch (error) {
      console.error('Error fetching clarifications:', error);
      setClarifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch organizer view
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

  // Refresh when filters change
  useEffect(() => {
    fetchClarifications();
  }, [activeFilter, statusFilter, sortBy, showOnlyMyQuestions]);

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
            problem_index: newQuestion.problem === 'General' ? '' : newQuestion.problem
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        setClarifications(prev => [data.clarification, ...prev]);
        setNewQuestion({ title: '', content: '', problem: '' });
        setShowNewQuestionForm(false);
      }
    } catch (error) {
      console.error('Error creating question:', error);
    }
  };

  const handleUpdateStatus = async (clarificationId, status) => {
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
          body: JSON.stringify({ status })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
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

        fetchOrganizerView();
      }
    } catch (error) {
      console.error('Error updating status:', error);
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
          body: JSON.stringify({ content: replyText })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
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

        setReplyInputs(prev => ({
          ...prev,
          [clarificationId]: ''
        }));
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

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

      if (response.ok) {
        const data = await response.json();
        
        setClarifications(prev => prev.map(item => {
          if (item.id === clarificationId) {
            return {
              ...item,
              upvotes: data.upvotes,
              user_voted: data.user_voted
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const toggleQuestionDetails = (questionId) => {
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
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

  const getStatusBadge = (status, isPublished) => {
    if (!isPublished) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800">Pending</span>;
    }
    
    switch(status) {
      case 'approved': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800">Approved</span>;
      case 'rejected': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800">Rejected</span>;
      case 'answered': return <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">Answered</span>;
      default: return <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const renderStatusIndicator = (status, isPublished) => {
    switch(status) {
      case 'pending': return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'rejected': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'answered': return <MessageSquare className="w-3 h-3 text-blue-500" />;
      default: return isPublished ? <Eye className="w-3 h-3 text-green-500" /> : <EyeOff className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClarifications();
  };

  if (loading && !clarifications.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-xs">Loading clarifications...</p>
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
              <h1 className="text-sm font-bold">Clarifications</h1>
              <span className="text-xs bg-blue-800 text-blue-100 px-1.5 py-0.5 rounded">
                CONTEST
              </span>
            </div>
            {isOrganizer && pendingCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                {pendingCount} pending
              </span>
            )}
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

            {/* Organizer View Toggle */}
            {isOrganizer && (
              <button
                onClick={() => setOrganizerView(!organizerView)}
                className={`px-2 py-1.5 rounded text-xs flex items-center gap-1 ${
                  organizerView 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                <Shield className="w-3 h-3" />
                {organizerView ? 'Participant' : 'Organizer'}
              </button>
            )}

            {/* Ask Question Button */}
            <button
              onClick={() => setShowNewQuestionForm(true)}
              className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Ask
            </button>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-2 mt-2">
            {/* Status Filter (for organizers) */}
            {isOrganizer && (
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white w-28"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="answered">Answered</option>
                </select>
              </div>
            )}

            {/* My Questions Toggle */}
            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={showOnlyMyQuestions}
                onChange={(e) => setShowOnlyMyQuestions(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              My Questions
            </label>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="ml-auto px-2 py-1.5 border border-gray-300 rounded text-xs bg-white w-28"
            >
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>

        {/* New Question Form */}
        {showNewQuestionForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-xs">Ask Question</h3>
              <button
                onClick={() => setShowNewQuestionForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Title"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <textarea
                placeholder="Describe your question..."
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})}
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newQuestion.problem}
                  onChange={(e) => setNewQuestion({...newQuestion, problem: e.target.value})}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white flex-1"
                >
                  <option value="">Select Problem</option>
                  <option value="General">General</option>
                  {problems.map(problem => (
                    <option key={problem} value={problem}>Problem {problem}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreateQuestion}
                  className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Submit
                </button>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-700 text-[10px]">
                    Your question will be reviewed by organizers before being published.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clarifications List */}
        {clarifications.length > 0 ? (
          <div className="space-y-2">
            {clarifications.map(question => {
              const canReply = question.can_reply && isOrganizer && question.is_published;
              const canModerate = question.can_moderate && isOrganizer;
              
              return (
                <div key={question.id} className="bg-white rounded-lg border border-gray-200">
                  {/* Question Header */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      {renderStatusIndicator(question.status, question.is_published)}
                      {getStatusBadge(question.status, question.is_published)}
                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getProblemColor(question.problem)}`}>
                        {question.problem}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        <span>{question.author?.name?.split(' ')[0] || 'User'}</span>
                      </div>
                      <span>{formatDate(question.created_at)}</span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="p-2">
                    <h3 className="font-medium text-gray-900 text-xs mb-1">
                      {question.title}
                    </h3>
                    <p className="text-gray-600 text-xs line-clamp-2">
                      {expandedQuestion === question.id || question.content.length < 100
                        ? question.content
                        : `${question.content.substring(0, 100)}...`
                      }
                    </p>
                  </div>

                  {/* Question Actions */}
                  <div className="p-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      {/* Left Actions */}
                      <div className="flex items-center gap-3">
                        {/* Upvotes */}
                        <button
                          onClick={() => handleVote(question.id)}
                          disabled={!question.is_published}
                          className={`flex items-center gap-1 text-xs ${question.user_voted ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'} ${!question.is_published ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsUp className="w-3 h-3" fill={question.user_voted ? 'currentColor' : 'none'} />
                          <span>{question.upvotes || 0}</span>
                        </button>

                        {/* Replies */}
                        <button
                          onClick={() => toggleQuestionDetails(question.id)}
                          className={`flex items-center gap-1 text-xs ${expandedQuestion === question.id ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{question.replies_count || 0}</span>
                        </button>
                      </div>

                      {/* Organizer Actions */}
                      {canModerate && organizerView && (
                        <div className="flex items-center gap-1">
                          {question.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'approved')}
                                className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                title="Approve"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(question.id, 'rejected')}
                                className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                title="Reject"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {canReply && (
                            <button
                              onClick={() => {
                                setExpandedQuestion(question.id);
                                setReplyInputs(prev => ({
                                  ...prev,
                                  [question.id]: ''
                                }));
                              }}
                              className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Reply"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Replies Section */}
                    {expandedQuestion === question.id && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        {/* Replies List */}
                        {question.replies && question.replies.length > 0 ? (
                          <div className="space-y-1.5 mb-2">
                            {question.replies.map(reply => (
                              <div key={reply.id} className="bg-gray-50 rounded p-1.5 border-l-2 border-blue-300">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-[10px] font-medium text-purple-800">O</span>
                                  </div>
                                  <span className="text-[10px] font-medium text-gray-700">
                                    {reply.author?.name?.split(' ')[0] || 'Organizer'}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-xs">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-1 text-gray-500 text-xs mb-2">
                            No replies yet
                          </div>
                        )}

                        {/* Reply Input (for organizers) */}
                        {canReply && organizerView && (
                          <div>
                            <div className="flex items-start gap-1 mb-1">
                              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] font-medium text-purple-800">O</span>
                              </div>
                              <textarea
                                value={replyInputs[question.id] || ''}
                                onChange={(e) => setReplyInputs(prev => ({
                                  ...prev,
                                  [question.id]: e.target.value
                                }))}
                                placeholder="Write your reply..."
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                rows="2"
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSubmitReply(question.id)}
                                className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                              >
                                Post Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-gray-600 text-xs">No clarifications found</p>
          </div>
        )}

        {/* Stats */}
        {clarifications.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            Showing {clarifications.length} clarifications
            {pendingCount > 0 && ` • ${pendingCount} pending`}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestClarification;