import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { 
  Menu,
  Play,
  Download,
  Clock,
  Code2,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trophy,
  Loader2,
  Users,
  Shield,
  ChevronRight,
  Copy,
  Settings,
  FileCode,
  Eye,
  BookOpen,
  HelpCircle,
  Calendar,
  Hash,
  Zap,
  Cpu,
  FileOutput,
  MessageSquare
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ProblemInside = () => {
  const { contestId, problemIndex } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contestData, setContestData] = useState(null);
  const [problemData, setProblemData] = useState(null);
  const [problemsList, setProblemsList] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [problemStats, setProblemStats] = useState(null);
  const [compilationStats, setCompilationStats] = useState(null);
  const [userStatus, setUserStatus] = useState({});
  const [expandedTestCase, setExpandedTestCase] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOKEN = localStorage.getItem('token');

  // Custom markdown components for compact design
  const customComponents = {
    h1: ({ children }) => (
      <h1 className="text-base font-bold mt-3 mb-2 text-gray-900 border-b border-gray-200 pb-1">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-bold mt-2 mb-1.5 text-gray-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-700">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="my-1.5 text-gray-700 leading-relaxed text-xs">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 ml-4 list-disc space-y-1 text-gray-700 text-xs">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 ml-4 list-decimal space-y-1 text-gray-700 text-xs">
        {children}
      </ol>
    ),
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="my-2 rounded overflow-hidden">
          <div className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 font-mono">
            {match[1]}
          </div>
          <pre className="bg-gray-900 text-gray-100 p-2 overflow-x-auto text-xs">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-blue-400 pl-2 py-1 my-2 bg-blue-50 italic text-gray-700 text-xs">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300 text-xs">
          {children}
        </table>
      </div>
    ),
    tr: ({ children }) => (
      <tr className="divide-x divide-gray-200">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-2 py-1.5 bg-gray-100 text-left text-xs font-semibold text-gray-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1.5 text-xs text-gray-700 border-t border-gray-200">
        {children}
      </td>
    ),
  };

  // Fetch data - preserving all functionality
  useEffect(() => {
    const fetchAllData = async () => {
      if (!contestId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch problems list
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        if (problemsRes.data) {
          setContestData(problemsRes.data.contest_info || problemsRes.data.contest);
          setProblemsList(problemsRes.data.problems || []);
        }

        // Determine problem to fetch
        let problemToFetch = problemIndex;
        if (!problemToFetch && problemsRes.data?.problems?.length > 0) {
          const firstProblem = problemsRes.data.problems[0];
          problemToFetch = firstProblem.problem_id || firstProblem.code || firstProblem.index;
          navigate(`/contests/${contestId}/problems/${problemToFetch}`, { replace: true });
          return;
        }

        // Fetch specific problem
        if (problemToFetch) {
          const problemRes = await axios.get(
            `http://localhost:8000/contests/${contestId}/problems/${problemToFetch}/`,
            { headers: { Authorization: `Bearer ${TOKEN}` } }
          );
          
          if (problemRes.data) {
            setProblemData(problemRes.data);
          }
        }

        // Fetch problem stats if available
        const statsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/problems/${problemToFetch}/stats/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        ).catch(() => null);
        
        if (statsRes?.data) {
          setProblemStats(statsRes.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.error || 'Failed to load contest');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [contestId, problemIndex, navigate]);

  // Timer effect
  useEffect(() => {
    const calculateTimeRemaining = (contest) => {
      if (!contest?.start_time || contest?.status !== 'live') {
        return 0;
      }
      
      try {
        const startTime = new Date(contest.start_time);
        const durationMinutes = contest.duration_minutes || 
                               (contest.duration ? contest.duration * 60 : 0);
        
        if (durationMinutes <= 0) return 0;
        
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        const now = new Date();
        
        if (now >= startTime && now <= endTime) {
          return Math.floor((endTime - now) / 1000);
        } else if (now > endTime) {
          return 0;
        }
      } catch (error) {
        console.error('Error calculating time remaining:', error);
        return 0;
      }
      
      return 0;
    };

    if (contestData) {
      const remaining = calculateTimeRemaining(contestData);
      if (remaining > 0) {
        setTimeRemaining(remaining);
        setIsTimerActive(true);
      }
    }
  }, [contestData]);

  useEffect(() => {
    let intervalId;
    
    if (isTimerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    }
    
    return () => clearInterval(intervalId);
  }, [isTimerActive, timeRemaining]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (problemId) => {
    const status = userStatus[problemId]?.status || 'unsolved';
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'attempted': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      default: return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusClass = (problemId) => {
    const status = userStatus[problemId]?.status || 'unsolved';
    switch (status) {
      case 'solved': return 'bg-green-100 text-green-800 border-green-300';
      case 'attempted': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getEditorMode = (lang) => {
    switch(lang) {
      case 'cpp': return 'c_cpp';
      case 'c': return 'c_cpp';
      case 'python': return 'python';
      case 'java': return 'java';
      case 'javascript': return 'javascript';
      default: return 'text';
    }
  };

  const getVersionIndex = (lang) => {
    switch(lang) {
      case 'python': return '3';
      case 'python3': return '3';
      case 'java': return '4';
      case 'c': return '5';
      case 'cpp': return '5';
      case 'javascript': return '4';
      default: return '0';
    }
  };

  // Run function
  const handleRun = async () => {
    if (isRunning) return; // Prevent multiple clicks
    
    if (!code.trim()) {
      alert('Please write some code before running.');
      return;
    }

    try {
      setIsRunning(true); // Set running state
      
      const runData = {
        language: language,
        code: code,
      };

      setCompilationStats({
        status: 'running',
        message: 'Running against all test cases...',
        type: 'run'
      });

      const response = await axios.post(
        `http://localhost:8000/contests/${contestId}/problems/${problemData?.problem_index || problemIndex}/run/`,
        runData,
        { 
          headers: { 
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      const result = response.data;
      
      if (result.verdict === 'AC' || result.all_passed === true) {
        setCompilationStats({
          status: 'success',
          verdict: result.verdict || 'AC',
          time: result.execution_time || 0,
          memory: result.memory_used || result.memory || 0,
          passed: result.passed_test_cases || result.total_test_cases || 0,
          total: result.total_test_cases || 0,
          testCaseOutputs: result.test_case_outputs || [],
          output: result.output || '',
          message: result.status || `All ${result.total_test_cases || 0} test cases passed!`,
          type: 'run'
        });
      } else {
        setCompilationStats({
          status: result.verdict === 'CE' ? 'compile_error' : 'error',
          verdict: result.verdict || 'WA',
          time: result.execution_time || 0,
          memory: result.memory_used || result.memory || 0,
          passed: result.passed_test_cases || 0,
          total: result.total_test_cases || 0,
          failedTestCase: result.failed_test_case || 0,
          testCaseOutputs: result.test_case_outputs || [],
          output: result.output || '',
          message: result.error_message || 
                  `${result.passed_test_cases || 0}/${result.total_test_cases || 0} test cases passed`,
          type: 'run'
        });
      }
      
    } catch (error) {
      console.error('Run error:', error);
      setCompilationStats({
        status: 'error',
        message: error.response?.data?.error || 'Run failed',
        type: 'run'
      });
    } finally {
      setIsRunning(false); // Reset running state
    }
  };

  // Submit function
  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent multiple clicks
    
    if (!code.trim()) {
      alert('Please write some code before submitting.');
      return;
    }

    if (!window.confirm('Submit your solution? This will be judged against all test cases.')) {
      return;
    }

    try {
      setIsSubmitting(true); // Set submitting state
      
      const submitData = {
        language: language,
        version_index: getVersionIndex(language),
        code: code,
        input_data: '',
      };

      setCompilationStats({
        status: 'running',
        message: 'Submitting and judging against all test cases...',
        type: 'submit'
      });

      const response = await axios.post(
        `http://localhost:8000/contests/${contestId}/problems/${problemData?.problem_index || problemIndex}/execute/`,
        submitData,
        { 
          headers: { 
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      const result = response.data;
      
      if (result.verdict === 'AC' || result.status === 'Accepted' || result.all_passed === true) {
        setCompilationStats({
          status: 'success',
          verdict: 'AC',
          time: result.execution_time || 0,
          memory: result.memory_used || 0,
          passed: result.passed_test_cases || result.total_test_cases || 0,
          total: result.total_test_cases || 0,
          message: result.status || `All ${result.total_test_cases} test cases passed!`,
          submissionId: result.submission_id,
          type: 'submit'
        });
        
        // Refresh status
        fetchUserProblemStatus();
      } else {
        setCompilationStats({
          status: result.status === 'CE' ? 'compile_error' : 'error',
          verdict: result.status || 'WA',
          time: result.execution_time || 0,
          memory: result.memory_used || 0,
          passed: result.passed_test_cases || 0,
          total: result.total_test_cases || 0,
          failedTestCase: result.failed_test_case || 0,
          message: `${result.passed_test_cases}/${result.total_test_cases} test cases passed`,
          type: 'submit'
        });
      }
      
    } catch (error) {
      console.error('Submission error:', error);
      setCompilationStats({
        status: 'error',
        message: error.response?.data?.error || 'Submission failed',
        type: 'submit'
      });
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Fetch user problem status
  const fetchUserProblemStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/contests/${contestId}/problems/status/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      setUserStatus(response.data.problem_statuses || {});
    } catch (error) {
      console.error('Error fetching problem status:', error);
    }
  };

  useEffect(() => {
    if (problemData && contestId) {
      fetchUserProblemStatus();
    }
  }, [problemData, contestId]);

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'AC': return 'bg-green-50 text-green-700 border-green-200';
      case 'WA': return 'bg-red-50 text-red-700 border-red-200';
      case 'TLE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'MLE': return 'bg-green-50 text-green-700 border-green-200';
      case 'CE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'RE': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PENDING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RUNNING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading problem...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Contest Error</h3>
          <p className="text-gray-600 text-xs mb-3 text-center">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/contests')}
              className="w-full bg-blue-600 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Compact */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 hover:bg-blue-800 rounded transition-colors"
              >
                <Menu className="w-3 h-3" />
              </button>
              <h1 className="text-sm font-bold">{contestData?.title || 'Contest'}</h1>
              <span className={`text-xs px-1.5 py-0.5 rounded ${contestData?.status === 'live' ? 'bg-red-100 text-red-800' :
                contestData?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'}`}>
                {contestData?.status?.charAt(0).toUpperCase() + contestData?.status?.slice(1)}
              </span>
              <span className="text-xs text-blue-200">
                • {problemsList.length} problems • {contestData?.type === 'team' ? 'Team' : 'Individual'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {timeRemaining > 0 && contestData?.status === 'live' && (
                <div className="flex items-center gap-1 text-xs bg-red-800 px-2 py-1 rounded animate-pulse">
                  <Clock className="w-3 h-3" />
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-xs">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{contestData?.platform || 'Custom Platform'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Collapsible Sidebar */}
        <div className={`
          bg-white border-r border-gray-200 transition-all duration-200
          h-[calc(100vh-4rem)] overflow-y-auto sticky top-0
          ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}
        `}>
          <div className="p-3 space-y-4">
            {/* Problems List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Problems ({problemsList.length})
                </h3>
                <div className="text-xs text-gray-500">
                  {contestData?.status === 'live' ? 'Live' : 'Practice'}
                </div>
              </div>
              <div className="space-y-1.5">
                {problemsList.map((problem) => {
                  const problemId = problem.problem_id || problem.code || problem.index;
                  const isActive = problemId === (problemData?.problem_index || problemIndex);
                  
                  return (
                    <Link
                      key={problemId}
                      to={`/contests/${contestId}/problems/${problemId}`}
                      className={`flex items-center space-x-2 p-2 rounded border text-xs transition-all duration-150 ${
                        isActive
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {getStatusIcon(problemId)}
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${getStatusClass(problemId)}`}>
                        {problemId}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{problem.title}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-1">
              <button
                onClick={() => navigate(`/contests/${contestId}/submissions`)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors text-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <Code2 className="w-3 h-3" />
                  <span className="font-medium">Submissions</span>
                </div>
              </button>
              
              {contestData?.status === 'past' && (
                <button
                  onClick={() => navigate(`/contests/${contestId}/discussion`)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-3 h-3" />
                    <span className="font-medium">Discussions</span>
                  </div>
                </button>
              )}
              
              {contestData?.status === 'live' && (
                <button
                  onClick={() => navigate(`/contests/${contestId}/clarifications`)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-3 h-3" />
                    <span className="font-medium">Clarification</span>
                  </div>
                </button>
              )}
              
              <button
                onClick={() => navigate(`/contests/${contestId}/standings`)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors text-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <Trophy className="w-3 h-3" />
                  <span className="font-medium">Standings</span>
                </div>
              </button>
              
              {contestData?.status === 'past' && (
                <button
                  onClick={() => navigate(`/contests/${contestId}/editorial`)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-3 h-3" />
                    <span className="font-medium">Editorial</span>
                  </div>
                </button>
              )}
            </div>

            {/* Stats Section */}
            <div className="bg-gray-50 rounded p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Problem Stats</h3>
                <Shield className="w-3 h-3 text-blue-600" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-bold text-gray-900">{problemData?.points || 100}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Time Limit:</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="font-medium">{problemData?.time_limit || 1}s</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Memory Limit:</span>
                  <div className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-gray-500" />
                    <span className="font-medium">{problemData?.memory_limit || 256}MB</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    problemData?.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                    problemData?.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {(problemData?.difficulty?.charAt(0).toUpperCase() + problemData?.difficulty?.slice(1)) || 'Medium'}
                  </span>
                </div>
                {problemStats && (
                  <>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Solved By:</span>
                        <span className="font-medium text-green-600">
                          {problemStats.statistics?.users_solved || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Attempted By:</span>
                        <span className="font-medium text-blue-600">
                          {problemStats.statistics?.users_attempted || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="font-medium text-gray-900">
                          {problemStats.statistics?.accuracy || '0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Your Status:</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          problemStats.statistics?.user_status === 'solved' ? 'bg-green-100 text-green-800' :
                          problemStats.statistics?.user_status === 'attempted' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {problemStats.statistics?.user_status === 'solved' ? 'Solved' :
                           problemStats.statistics?.user_status === 'attempted' ? 'Attempted' :
                           'Not Attempted'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Problem Statement */}
            <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-3">
                {/* Problem Header */}
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-gray-900">
                        {problemData?.problem_index || problemIndex}. {problemData?.title || 'Problem'}
                      </h2>
                      <div className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-[10px]">
                        {(problemData?.difficulty?.charAt(0).toUpperCase() + problemData?.difficulty?.slice(1)) || 'Medium'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Time Limit: {problemData?.time_limit || 1}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      <span>Memory Limit: {problemData?.memory_limit || 256}MB</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Points: {problemData?.points || 100}</span>
                    </div>
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="mb-4">
                  <div className="text-xs text-gray-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                      components={customComponents}
                    >
                      {problemData?.statement || 'No problem statement available.'}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Sample Test Cases */}
                {problemData?.sample_test_cases && problemData.sample_test_cases.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">Sample Test Cases</span>
                      </div>
                      <button
                        onClick={() => setExpandedTestCase(expandedTestCase === null ? 0 : null)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {expandedTestCase !== null ? 'Expand' : 'Collapse'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {problemData.sample_test_cases.map((testCase, index) => (
                        <div key={index} className="border border-gray-200 rounded overflow-hidden">
                          <div className="bg-gray-50 px-2 py-1.5 text-xs font-medium border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span>Sample Test Case {index + 1}</span>
                            </div>
                            <button
                              onClick={() => setExpandedTestCase(expandedTestCase === index ? null : index)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {expandedTestCase === index ? '+' : '-'}
                            </button>
                          </div>
                          
                          {(expandedTestCase === index || expandedTestCase === null) && (
                            <>
                              <div className="grid grid-cols-2 gap-0">
                                <div className="border-r border-gray-200">
                                  <div className="flex items-center justify-between px-2 py-1 bg-gray-100 border-b border-gray-200">
                                    <span className="text-xs font-medium">Input</span>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(testCase.input);
                                      }}
                                      className="text-gray-500 hover:text-gray-700"
                                      title="Copy"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <pre className="p-2 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
                                    {testCase.input}
                                  </pre>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between px-2 py-1 bg-gray-100 border-b border-gray-200">
                                    <span className="text-xs font-medium">Output</span>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(testCase.output);
                                      }}
                                      className="text-gray-500 hover:text-gray-700"
                                      title="Copy"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <pre className="p-2 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
                                    {testCase.output}
                                  </pre>
                                </div>
                              </div>
                              
                              {testCase.explanation && (
                                <div className="border-t border-gray-200">
                                  <div className="px-2 py-1.5 bg-blue-50 border-b border-blue-200">
                                    <span className="text-xs font-medium text-blue-800">Explanation</span>
                                  </div>
                                  <div className="p-2 bg-blue-50 text-blue-800 text-xs">
                                    {testCase.explanation}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Code Editor */}
            <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
              {/* Editor Header */}
              <div className="border-b border-gray-200 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="python">Python 3</option>
                      <option value="cpp">C++ 17</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                      <option value="c">C</option>
                    </select>
                    <span className="text-xs text-gray-600">
                      Version: {language === 'cpp' ? '17' : language === 'python' ? '3.9' : language === 'java' ? '17' : 'Latest'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const blob = new Blob([code], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${problemData?.problem_index || problemIndex}_${language}.${language}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 bg-gray-900">
                <AceEditor
                  mode={getEditorMode(language)}
                  theme="monokai"
                  value={code}
                  onChange={setCode}
                  name="code-editor"
                  height="100%"
                  width="100%"
                  fontSize={13}
                  showPrintMargin={false}
                  showGutter={true}
                  highlightActiveLine={true}
                  setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    showLineNumbers: true,
                    tabSize: 2,
                    useWorker: false,
                  }}
                  placeholder={`// Write ${language.toUpperCase()} code here...\n`}
                />
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Language: {language === 'cpp' ? 'C++ 17' : language === 'java' ? 'Java 17' : language === 'python' ? 'Python 3.9' : 'JavaScript'}</span>
                      <span className="text-gray-400">•</span>
                      <span>{code.length} chars</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleRun}
                      disabled={isRunning}
                      className={`px-3 py-1.5 border rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                        isRunning 
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isRunning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                        isSubmitting
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Compilation Results */}
              {compilationStats && (
                <div className="border-t border-gray-200">
                  <div className={`p-3 ${compilationStats.status === 'running' ? 'bg-blue-50' : 
                    compilationStats.status === 'success' ? 'bg-green-50' : 
                    compilationStats.status === 'compile_error' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        {compilationStats.status === 'running' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            <span className="text-xs font-medium text-blue-900">Running...</span>
                          </>
                        ) : compilationStats.status === 'success' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-900">Success!</span>
                          </>
                        ) : compilationStats.status === 'compile_error' ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-yellow-600" />
                            <span className="text-xs font-medium text-yellow-900">Compilation Error</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span className="text-xs font-medium text-red-900">Failed</span>
                          </>
                        )}
                        <span className="text-xs px-1.5 py-0.5 bg-white rounded border">
                          {compilationStats.type === 'run' ? 'Run' : 'Submission'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setCompilationStats(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="text-xs mb-3">{compilationStats.message}</div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <div className={`p-2 rounded border ${getVerdictColor(compilationStats.verdict)}`}>
                        <div className="text-xs text-gray-600">Verdict</div>
                        <div className="font-bold text-sm">
                          {compilationStats.verdict || 'N/A'}
                        </div>
                      </div>
                      {compilationStats.time > 0 && (
                        <div className="p-2 rounded border bg-white">
                          <div className="text-xs text-gray-600">Time</div>
                          <div className="font-bold text-sm">
                            {compilationStats.time} ms
                          </div>
                        </div>
                      )}
                      {compilationStats.passed !== undefined && (
                        <div className="p-2 rounded border bg-white">
                          <div className="text-xs text-gray-600">Test Cases</div>
                          <div className="font-bold text-sm">
                            {compilationStats.passed}/{compilationStats.total}
                          </div>
                        </div>
                      )}
                      {compilationStats.memory > 0 && (
                        <div className="p-2 rounded border bg-white">
                          <div className="text-xs text-gray-600">Memory</div>
                          <div className="font-bold text-sm">
                            {compilationStats.memory > 1024 
                              ? `${(compilationStats.memory / 1024).toFixed(1)} MB` 
                              : `${compilationStats.memory} KB`}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {compilationStats.testCaseOutputs && compilationStats.testCaseOutputs.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-600 mb-1">Test Case Results:</div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {compilationStats.testCaseOutputs.slice(0, 3).map((tc, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded border">
                              <div className="flex items-center gap-2">
                                <span>Test {tc.test_case}</span>
                                {tc.passed ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                )}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                tc.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {tc.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ))}
                          {compilationStats.testCaseOutputs.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{compilationStats.testCaseOutputs.length - 3} more test cases
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {compilationStats.failedTestCase && (
                      <div className="text-xs">
                        <span className="text-gray-600">Failed on test case: </span>
                        <span className="font-medium">#{compilationStats.failedTestCase}</span>
                      </div>
                    )}
                    
                    {compilationStats.submissionId && (
                      <div className="text-xs">
                        <span className="text-gray-600">Submission ID: </span>
                        <span className="font-mono text-blue-600">
                          {compilationStats.submissionId.substring(0, 12)}...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemInside;