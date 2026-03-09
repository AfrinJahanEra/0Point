import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/api';
import { 
  CheckCircle2, 
  Clock,
  XCircle, 
  Clock4,
  Code2,
  User,
  Copy,
  ExternalLink,
  Lock,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Hash,
  UserCircle,
  Trophy
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

const MySubmissions = () => {
  const { contestId } = useParams();
  const [filter, setFilter] = useState('my');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [selectedProblem, setSelectedProblem] = useState('all');
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const TOKEN = localStorage.getItem('token');

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('filter', filter);
        
        if (selectedProblem !== 'all') {
          params.append('problem', selectedProblem);
        }
        
        if (selectedVerdict !== 'all') {
          params.append('verdict', selectedVerdict);
        }
        
        const queryString = params.toString();
        const url = `${BACKEND_URL}/contests/${contestId}/submissions/${queryString ? `?${queryString}` : ''}`;
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        };
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        const submissionsData = data.submissions || [];
        setAllSubmissions(submissionsData);
        
        if (data.current_user_id) {
          setCurrentUserId(data.current_user_id);
        }
        
        if (data.filters?.problems) {
          setProblems(data.filters.problems);
        }
        
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchSubmissions();
    }
  }, [contestId, selectedProblem, selectedVerdict, filter]);

  // Filter and sort submissions
  useEffect(() => {
    let filtered = [...allSubmissions];
    
    if (filter === 'my' && currentUserId) {
      filtered = filtered.filter(sub => sub.user_id === currentUserId || sub.user === currentUserId);
    }

    filtered.sort((a, b) => {
      const factor = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'time') {
        const timeA = new Date(a.submitted_at || a.time);
        const timeB = new Date(b.submitted_at || b.time);
        return factor * (timeB - timeA);
      } else if (sortBy === 'problem') {
        return factor * (a.problem_code || '').localeCompare(b.problem_code || '');
      } else if (sortBy === 'user') {
        return factor * (a.user_name || '').localeCompare(b.user_name || '');
      }
      return 0;
    });

    setSubmissions(filtered);
  }, [allSubmissions, filter, sortBy, sortOrder, currentUserId]);

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'AC': return 'bg-green-50 text-green-700 border-green-200';
      case 'WA': return 'bg-red-50 text-red-700 border-red-200';
      case 'TLE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MLE': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CE': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'RE': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PENDING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RUNNING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getVerdictIcon = (verdict) => {
    switch (verdict) {
      case 'AC': return <CheckCircle2 className="w-3 h-3" />;
      case 'WA': return <XCircle className="w-3 h-3" />;
      case 'TLE': return <Clock4 className="w-3 h-3" />;
      case 'MLE': return <AlertCircle className="w-3 h-3" />;
      case 'CE': return <XCircle className="w-3 h-3" />;
      case 'RE': return <AlertCircle className="w-3 h-3" />;
      case 'PENDING': return <Clock className="w-3 h-3" />;
      case 'RUNNING': return <Clock className="w-3 h-3 animate-spin" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getVerdictLabel = (verdict) => {
    switch (verdict) {
      case 'AC': return 'AC';
      case 'WA': return 'WA';
      case 'TLE': return 'TLE';
      case 'MLE': return 'MLE';
      case 'CE': return 'CE';
      case 'RE': return 'RE';
      case 'PENDING': return 'Pending';
      case 'RUNNING': return 'Running';
      default: return verdict;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid';
      
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
    } catch (err) {
      return 'Invalid';
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewCode = (submission) => {
    if (submission.can_view_code || submission.is_current_user) {
      setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id);
    } else {
      alert('You can only view your own code');
    }
  };

  const getUserDisplayName = (submission) => {
    if (submission.is_current_user) return 'You';
    return submission.user_name?.split(' ')[0] || `User_${submission.user_id?.substring(0, 4)}`;
  };

  const verdictOptions = [
    { value: 'all', label: 'All' },
    { value: 'AC', label: 'Accepted' },
    { value: 'WA', label: 'Wrong' },
    { value: 'TLE', label: 'TLE' },
    { value: 'MLE', label: 'MLE' },
    { value: 'CE', label: 'Compile' },
    { value: 'RE', label: 'Runtime' },
    { value: 'PENDING', label: 'Pending' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <h1 className="text-sm font-bold">Submissions</h1>
              <span className="text-xs bg-blue-800 text-blue-100 px-1.5 py-0.5 rounded">
                CONTEST
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* My/All Filter */}
            <div className="flex space-x-1 bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setFilter('my')}
                className={`px-2 py-1 text-xs rounded transition-colors ${filter === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                <User className="w-3 h-3 inline mr-1" />
                My
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-xs rounded transition-colors ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                <UserCircle className="w-3 h-3 inline mr-1" />
                All
              </button>
            </div>

            {/* Verdict Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-gray-500" />
              <select
                value={selectedVerdict}
                onChange={(e) => setSelectedVerdict(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white w-28"
              >
                {verdictOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Filter */}
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-gray-500" />
              <select
                value={selectedProblem}
                onChange={(e) => setSelectedProblem(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white w-32"
              >
                <option value="all">All Problems</option>
                {problems.map(problem => (
                  <option key={problem.code} value={problem.code}>
                    {problem.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Buttons */}
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => handleSort('time')}
                className={`px-2 py-1 border rounded text-xs ${sortBy === 'time' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                <Calendar className="w-3 h-3 inline mr-1" />
                Time
                {sortBy === 'time' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronUp className="w-3 h-3 inline ml-1" />)}
              </button>
              {filter === 'all' && (
                <button
                  onClick={() => handleSort('user')}
                  className={`px-2 py-1 border rounded text-xs ${sortBy === 'user' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  <User className="w-3 h-3 inline mr-1" />
                  User
                  {sortBy === 'user' && (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronUp className="w-3 h-3 inline ml-1" />)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-2 border-b border-gray-100">
                <div className="h-2.5 bg-gray-200 rounded w-20" />
                <div className="h-2.5 bg-gray-200 rounded flex-1" />
                <div className="h-5 bg-gray-200 rounded w-12" />
                <div className="h-2.5 bg-gray-200 rounded w-16" />
                <div className="h-2.5 bg-gray-200 rounded w-14" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-2 py-1 bg-blue-800 text-white rounded text-xs hover:bg-blue-900"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-2 font-medium text-gray-900 w-16">ID</th>
                    <th className="text-left p-2 font-medium text-gray-900">Problem</th>
                    {filter === 'all' && (
                      <th className="text-left p-2 font-medium text-gray-900 w-24">User</th>
                    )}
                    <th className="text-left p-2 font-medium text-gray-900 w-20">Status</th>
                    <th className="text-left p-2 font-medium text-gray-900 w-16">Time</th>
                    <th className="text-left p-2 font-medium text-gray-900 w-16">Memory</th>
                    <th className="text-left p-2 font-medium text-gray-900 w-20">Language</th>
                    <th className="text-left p-2 font-medium text-gray-900 w-16">When</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <React.Fragment key={submission.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2">
                          <button
                            onClick={() => handleViewCode(submission)}
                            disabled={!submission.can_view_code && !submission.is_current_user}
                            className={`font-mono text-xs ${submission.can_view_code || submission.is_current_user ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
                          >
                            #{submission.id?.substring(0, 6) || 'N/A'}
                            {!submission.can_view_code && !submission.is_current_user && (
                              <Lock className="w-2.5 h-2.5 inline ml-0.5" />
                            )}
                          </button>
                        </td>
                        <td className="p-2">
                          <div className="font-medium">
                            <span className="font-bold">{submission.problem_code}.</span> {submission.problem_title?.substring(0, 20)}
                          </div>
                        </td>
                        {filter === 'all' && (
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-gray-600" />
                              </div>
                              <span className={`${submission.is_current_user ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                                {getUserDisplayName(submission)}
                              </span>
                              {submission.user_rating > 0 && (
                                <Trophy className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          </td>
                        )}
                        <td className="p-2">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${getVerdictColor(submission.verdict)}`}>
                            {getVerdictIcon(submission.verdict)}
                            {getVerdictLabel(submission.verdict)}
                          </div>
                        </td>
                        <td className="p-2 text-gray-700">
                          {submission.execution_time > 0 ? `${submission.execution_time}ms` : '-'}
                        </td>
                        <td className="p-2 text-gray-700">
                          {submission.memory > 0 ? `${(submission.memory / 1024).toFixed(0)}MB` : '-'}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Code2 className="w-3 h-3 text-gray-400" />
                            <span className="font-mono">
                              {submission.language?.substring(0, 3).toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-gray-500" title={new Date(submission.submitted_at).toLocaleString()}>
                          {formatTime(submission.submitted_at)}
                        </td>
                      </tr>
                      
                      {/* Expanded Code View */}
                      {expandedSubmission === submission.id && (
                        <tr>
                          <td colSpan={filter === 'all' ? 8 : 7} className="bg-gray-50 p-0">
                            <div className="p-2 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-900">
                                    Submission #{submission.id?.substring(0, 8)}
                                  </h3>
                                  <p className="text-xs text-gray-600">
                                    {submission.problem_code} • {submission.language?.toUpperCase()} • {getUserDisplayName(submission)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(submission.code || '')}
                                    className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copy
                                  </button>
                                  <Link
                                    to={`/contest/${contestId}/problem/${submission.problem_code}`}
                                    className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Problem
                                  </Link>
                                </div>
                              </div>
                              <div className="bg-gray-900 rounded overflow-hidden">
                                <div className="px-2 py-1 bg-gray-800 text-gray-300 text-xs font-mono">
                                  {submission.language?.toUpperCase()} • {getVerdictLabel(submission.verdict)}
                                </div>
                                <pre className="p-2 text-xs text-gray-100 font-mono overflow-x-auto max-h-48">
                                  <code>{submission.code || 'No code available'}</code>
                                </pre>
                              </div>
                              <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>Time: {submission.execution_time > 0 ? `${submission.execution_time}ms` : '-'}</span>
                                  <span>Memory: {submission.memory > 0 ? `${(submission.memory / 1024).toFixed(1)}MB` : '-'}</span>
                                  {submission.passed_test_cases > 0 && (
                                    <span>Tests: {submission.passed_test_cases}/{submission.total_test_cases}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {submissions.length === 0 && (
              <div className="p-4 text-center">
                <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No submissions found</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        {submissions.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            Showing {submissions.length} submissions
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubmissions;