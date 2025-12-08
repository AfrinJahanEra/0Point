// MySubmissions.jsx
import React, { useState, useEffect } from 'react';
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
  Eye,
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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [contestStatus, setContestStatus] = useState('live');
  
  const { contestId } = useParams();
  const [filter, setFilter] = useState('my');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [selectedProblem, setSelectedProblem] = useState('all');
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [contestEnded, setContestEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');

  // Fetch submissions from backend
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        // Add filter parameter ('my' or 'all')
        params.append('filter', filter);
        
        // Add problem filter if not 'all'
        if (selectedProblem !== 'all') {
          params.append('problem', selectedProblem);
        }
        
        // Add verdict filter if not 'all'
        if (selectedVerdict !== 'all') {
          params.append('verdict', selectedVerdict);
        }
        
        // Build the query string
        const queryString = params.toString();
        
        // Get API URL from environment or use default
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        // IMPORTANT: Use the correct URL
        const url = `${apiUrl}/contests/${contestId}/submissions/${queryString ? `?${queryString}` : ''}`;
        
        console.log('Fetching submissions from URL:', url);
        
        // Get token from localStorage
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log('Backend response:', data);
        
        // Set the submissions data
        const submissionsData = data.submissions || [];
        setAllSubmissions(submissionsData);
        
        // Update current user info
        if (data.current_user_id) {
          setCurrentUserId(data.current_user_id);
          setCurrentUserName(data.current_user_name || 'You');
        }
        
        // Update contest ended status if provided by backend
        if (data.contest_ended !== undefined) {
          setContestEnded(data.contest_ended);
        }
        
        // Update contest status if provided by backend
        if (data.contest_status) {
          setContestStatus(data.contest_status);
        }
        
        // Set problems for filter
        if (data.filters && data.filters.problems) {
          setProblems(data.filters.problems);
        }
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching submissions:', err);
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

    // Apply frontend filtering if needed (backend already does most filtering)
    // The backend handles 'my' filter, but we can double-check
    if (filter === 'my' && currentUserId) {
      filtered = filtered.filter(sub => sub.user === currentUserId);
    }

    // Sort submissions
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

  // Format countdown timer
  const formatCountdown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      case 'AC': return <CheckCircle2 className="w-4 h-4" />;
      case 'WA': return <XCircle className="w-4 h-4" />;
      case 'TLE': return <Clock4 className="w-4 h-4" />;
      case 'MLE': return <AlertCircle className="w-4 h-4" />;
      case 'CE': return <XCircle className="w-4 h-4" />;
      case 'RE': return <AlertCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'RUNNING': return <Clock className="w-4 h-4 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getVerdictLabel = (verdict) => {
    switch (verdict) {
      case 'AC': return 'Accepted';
      case 'WA': return 'Wrong Answer';
      case 'TLE': return 'Time Limit Exceeded';
      case 'MLE': return 'Memory Limit Exceeded';
      case 'CE': return 'Compilation Error';
      case 'RE': return 'Runtime Error';
      case 'PENDING': return 'Pending';
      case 'RUNNING': return 'Running';
      default: return verdict;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const verdictOptions = [
    { value: 'all', label: 'All Verdicts' },
    { value: 'AC', label: 'Accepted' },
    { value: 'WA', label: 'Wrong Answer' },
    { value: 'TLE', label: 'Time Limit Exceeded' },
    { value: 'MLE', label: 'Memory Limit Exceeded' },
    { value: 'CE', label: 'Compilation Error' },
    { value: 'RE', label: 'Runtime Error' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'RUNNING', label: 'Running' }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Code copied to clipboard!');
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
    if (submission.can_view_code || submission.is_current_user || contestEnded) {
      setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id);
    } else {
      alert('You can only view your own code during the contest. Other users\' code will be available after the contest ends.');
    }
  };

  const getUserDisplayName = (submission) => {
    if (submission.is_current_user) {
      return `${submission.user_name || 'You'} (You)`;
    }
    return submission.user_name || `User_${submission.user.substring(0, 8)}`;
  };

  const getUserDisplayClass = (submission) => {
    if (submission.is_current_user) {
      return 'font-semibold text-blue-600';
    }
    return 'text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">

            
            {/* Timer at Top Right */}
            {contestStatus === 'live' && timeRemaining > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600 animate-pulse" />
                <div className="text-right">
                  <div className="text-xs text-gray-600">Time Remaining</div>
                  <div className="font-mono font-bold text-lg text-red-600">{formatCountdown(timeRemaining)}</div>
                </div>
              </div>
            )}
            

          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {/* My/All Filter */}
            <div className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setFilter('my')}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-2 ${
                  filter === 'my'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User className="w-3 h-3" />
                My Submissions
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-2 ${
                  filter === 'all'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <UserCircle className="w-3 h-3" />
                All Submissions
              </button>
            </div>

            {/* Verdict Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedVerdict}
                onChange={(e) => setSelectedVerdict(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white w-40"
              >
                {verdictOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Filter */}
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-500" />
              <select
                value={selectedProblem}
                onChange={(e) => setSelectedProblem(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white min-w-[200px]"
              >
                <option value="all">All Problems</option>
                {problems.map(problem => (
                  <option key={problem.code} value={problem.code}>
                    {problem.code} - {problem.title} ({problem.submission_count || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Buttons */}
            <div className="flex gap-2 ml-auto">

              
              {filter === 'all' && (
                <button
                  onClick={() => handleSort('user')}
                  className={`flex items-center gap-1 px-3 py-2 border rounded-lg transition-colors text-xs ${
                    sortBy === 'user'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>User</span>
                  {sortBy === 'user' && (
                    sortOrder === 'desc' ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Error loading submissions</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-24">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900">
                      Problem
                    </th>
                    {filter === 'all' && (
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-40">
                        User
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-36">
                      Verdict
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-24">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-28">
                      Memory
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-32">
                      Language
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-900 w-32">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <React.Fragment key={submission.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewCode(submission)}
                            disabled={!submission.can_view_code && !submission.is_current_user && !contestEnded}
                            className={`font-mono text-xs ${
                              submission.can_view_code || submission.is_current_user || contestEnded
                                ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={
                              submission.can_view_code || submission.is_current_user || contestEnded
                                ? "Click to view code"
                                : "View code after contest ends"
                            }
                          >
                            #{submission.id.substring(0, 8)}
                            {!submission.can_view_code && !submission.is_current_user && !contestEnded && (
                              <Lock className="w-3 h-3 inline ml-1" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              <span className="font-bold text-gray-800">{submission.problem_code}.</span> {submission.problem_title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {submission.language}
                            </div>
                          </div>
                        </td>
                        {filter === 'all' && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-600" />
                              </div>
                              <span className={`text-sm ${getUserDisplayClass(submission)}`}>
                                {getUserDisplayName(submission)}
                              </span>
                              {submission.user_rating > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">
                                  <Trophy className="w-3 h-3" />
                                  {submission.user_rating}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getVerdictColor(submission.verdict)}`}>
                            {getVerdictIcon(submission.verdict)}
                            {getVerdictLabel(submission.verdict)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-700">
                            {submission.execution_time > 0 ? `${submission.execution_time} ms` : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-700">
                            {submission.memory > 0 ? `${(submission.memory / 1024).toFixed(1)} MB` : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-700 font-mono">
                              {submission.language.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-500" title={formatDateTime(submission.submitted_at)}>
                            {formatTime(submission.submitted_at)}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Code View */}
                      {expandedSubmission === submission.id && (
                        <tr>
                          <td colSpan={filter === 'all' ? 8 : 7} className="bg-gray-50 p-0">
                            <div className="p-4 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    Submission #{submission.id.substring(0, 8)} • {submission.language.toUpperCase()} • {getUserDisplayName(submission)}
                                  </h3>
                                  <p className="text-xs text-gray-600">
                                    Submitted {formatDateTime(submission.submitted_at)} • Problem: {submission.problem_code} - {submission.problem_title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => copyToClipboard(submission.code)}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Copy Code
                                  </button>
                                  <Link
                                    to={`/contest/${contestId}/problem/${submission.problem_code}`}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View Problem
                                  </Link>
                                </div>
                              </div>
                              <div className="bg-gray-900 rounded-lg overflow-hidden">
                                <div className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-mono">
                                  {submission.language.toUpperCase()} • {submission.verdict}
                                </div>
                                <pre className="p-4 text-xs text-gray-100 font-mono overflow-x-auto max-h-96">
                                  <code>{submission.code}</code>
                                </pre>
                              </div>
                              <div className="mt-4 text-xs text-gray-600 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-1 rounded ${getVerdictColor(submission.verdict)}`}>
                                    {getVerdictLabel(submission.verdict)}
                                  </span>
                                  <span>Time: {submission.execution_time > 0 ? `${submission.execution_time}ms` : 'N/A'}</span>
                                  <span>Memory: {submission.memory > 0 ? `${(submission.memory / 1024).toFixed(1)}MB` : 'N/A'}</span>
                                  {submission.passed_test_cases > 0 && (
                                    <span>Tests: {submission.passed_test_cases}/{submission.total_test_cases}</span>
                                  )}
                                </div>
                                {submission.verdict !== 'AC' && submission.verdict !== 'PENDING' && (
                                  <button className="text-blue-600 hover:text-blue-800 text-xs">
                                    View Details →
                                  </button>
                                )}
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
              <div className="py-16 text-center">
                <div className="text-gray-400 mb-4">
                  <Filter className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-500">No submissions found</p>
                </div>
                <div className="text-gray-500 text-sm mb-6">
                  {filter === 'my' 
                    ? "You haven't made any submissions yet."
                    : "No submissions match your filters."
                  }
                </div>
              </div>
            )}

            {/* Simple Pagination */}
            {submissions.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{submissions.length}</span> of{' '}
                    <span className="font-medium">{allSubmissions.length}</span> submissions
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm">
                      ← Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">1</span>
                    <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                      2
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        

      </div>
    </div>
  );
};

export default MySubmissions;