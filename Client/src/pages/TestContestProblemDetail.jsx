// TestContestProblemDetail.jsx
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
import React, { useState, useEffect } from 'react';
import { Clipboard } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Menu,
  Play,
  Download,
  Clock,
  Calendar,
  Code2,
  FileText,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  HelpCircle,
  Trophy,
  Loader2,
  Users,
  BookOpen,
  TestTube,
  Shield
} from 'lucide-react';
import axios from 'axios';

const TestContestProblemDetail = () => {
  const { testContestId, problemIndex } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contestData, setContestData] = useState(null);
  const [problemData, setProblemData] = useState(null);
  const [problemsList, setProblemsList] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState();
  const [language, setLanguage] = useState('cpp');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [problemStats, setProblemStats] = useState(null);
  const [compilationStats, setCompilationStats] = useState(null);


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

  useEffect(() => {
    const fetchProblemStats = async () => {
      if (!testContestId || !(problemData?.problem_index || problemIndex)) {
        return;
      }
      
      try {
        const problemIdentifier = problemData?.problem_index || problemIndex;

        console.log('Test contest stats not yet implemented');
        setProblemStats({
          problem: {
            points: problemData?.points || 100
          },
          statistics: {
            users_solved: 0,
            users_attempted: 0,
            accuracy: '0%',
            total_submissions: 0,
            user_status: 'not_attempted',
            user_attempts: 0
          }
        });
      } catch (error) {
        console.error('Error fetching test contest problem stats:', error);
      }
    };
    
    if (problemData || problemIndex) {
      fetchProblemStats();
    }
  }, [testContestId, problemData, problemIndex]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    return () => {
      if (footer) footer.style.display = "block";
    };
  }, []);

  // Helper function to calculate time remaining
  const calculateTimeRemaining = (contest) => {
    if (!contest?.test_start_time || contest?.status !== 'live') {
      return 0;
    }
    
    try {
      const startTime = new Date(contest.test_start_time);
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

  // Hide footer only in TestContestProblemDetail page
  useEffect(() => {
    const fetchAllData = async () => {
      if (!testContestId) {
        setLoading(false);
        return;
      }

      console.log('Fetching data for test contest:', testContestId, 'problem:', problemIndex);
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch test contest problems list
        console.log('Fetching test contest problems...');
        const problemsRes = await axios.get(
          `http://localhost:8000/test-contests/${testContestId}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        console.log('Test Problems API Response:', problemsRes.data);
        
        // Check if we got a successful response
        if (problemsRes.data) {
          // Set contest data
          if (problemsRes.data.contest_info) {
            setContestData(problemsRes.data.contest_info);
          } else if (problemsRes.data.contest) {
            setContestData(problemsRes.data.contest);
          } else {
            setContestData(null);
          }
          setProblemsList(problemsRes.data.problems || []);
        }
        
        // 2. Determine which problem to fetch
        let problemToFetch = problemIndex;
        
        // If no problemIndex specified, use the first problem
        if (!problemToFetch && problemsRes.data?.problems?.length > 0) {
          const firstProblem = problemsRes.data.problems[0];
          problemToFetch = firstProblem.problem_id || firstProblem.code || firstProblem.index;
          console.log('No problem index specified, using first problem:', problemToFetch);
          
          // Navigate to the first problem
          navigate(`/test-contests/${testContestId}/problems/${problemToFetch}`, { replace: true });
          return;
        }
        
        // 3. Fetch specific problem data
        if (problemToFetch) {
          console.log('Fetching specific test contest problem:', problemToFetch);
          try {
            const problemRes = await axios.get(
              `http://localhost:8000/test-contests/${testContestId}/problems/${problemToFetch}/`,
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            if (problemRes.data) {
              console.log('Test problem data response:', problemRes.data);
              console.log('Test contest status from problem response:', problemRes.data.contest_status);
              setProblemData(problemRes.data);
              
              // If we don't have contestData yet, use data from problem response
              if (!contestData && problemRes.data.contest_title) {
                setContestData({
                  status: problemRes.data.contest_status,
                  title: problemRes.data.contest_title,
                  platform: 'Test Platform',
                  type: 'individual',
                  is_test_contest: true
                });
              }
            } else {
              console.error('No test problem data in response');
            }
          } catch (problemError) {
            console.error('Error fetching specific test problem:', problemError);
            
            // Check if we have problems list to fall back to
            if (problemsRes.data?.problems?.length > 0) {
              // Show the first problem instead
              const firstProblem = problemsRes.data.problems[0];
              const firstIndex = firstProblem.problem_id || firstProblem.code || firstProblem.index;
              navigate(`/test-contests/${testContestId}/problems/${firstIndex}`);
            }
          }
        }
        
        // Calculate initial time remaining from API response data
        const contestInfo = problemsRes.data?.contest_info || problemsRes.data?.contest;
        if (contestInfo) {
          const remaining = calculateTimeRemaining(contestInfo);
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setIsTimerActive(true);
            console.log('⏰ Test contest timer started:', remaining, 'seconds remaining');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching test contest data:', error);
        setError(error.response?.data?.error || 'Failed to load test contest');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [testContestId, problemIndex, navigate]);

  // Dynamic countdown timer effect
  useEffect(() => {
    let intervalId;
    
    if (isTimerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setIsTimerActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerActive, timeRemaining]);

  // Update timer when contestData changes
  useEffect(() => {
    if (contestData?.test_start_time && contestData?.status === 'live') {
      try {
        const remaining = calculateTimeRemaining(contestData);
        if (remaining > 0 && remaining !== timeRemaining) {
          setTimeRemaining(remaining);
          setIsTimerActive(true);
        }
      } catch (timeError) {
        console.error('Error updating timer from contestData:', timeError);
      }
    }
  }, [contestData]);

  // Format time for display
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (problemIdentifier) => {
    const status = userStatus[problemIdentifier]?.status || 'unsolved';
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'attempted': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusClass = (problemIdentifier) => {
    const status = userStatus[problemIdentifier]?.status || 'unsolved';
    switch (status) {
      case 'solved': return 'bg-green-100 text-green-800';
      case 'attempted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const refreshProblemStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/test-contests/${testContestId}/problems/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      if (response.data.problems) {
        setProblemsList(response.data.problems);
      }
    } catch (error) {
      console.error('Error refreshing test problems:', error);
    }
  };

const handleRun = async () => {
  if (!code.trim()) {
    alert('Please write some code before running.');
    return;
  }

  try {
    const runData = {
      language: language,
      code: code,
      // For test contest run, it should run against all test cases
      problem_index: problemData?.problem_index || problemIndex, // ADD THIS
    };

    console.log('Running code for test contest with data:', runData);
    
    // Set loading state
    setCompilationStats({
      status: 'running',
      message: 'Running against all test cases...',
      type: 'run',
      is_test_contest: true
    });
    
    // Use the same endpoint structure as regular contests
    const response = await axios.post(
      `http://localhost:8000/test-contests/${testContestId}/problems/${problemData?.problem_index || problemIndex}/run/`,
      runData,
      { 
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Test contest run response:', response.data);
    
    // Update compilation stats based on actual API response
    const result = response.data;
    
    if (result.verdict === 'AC' || result.all_passed === true) {
      setCompilationStats({
        status: 'success',
        verdict: result.verdict || 'AC',
        time: result.execution_time || 0,
        memory: result.memory_used || result.memory || 0,
        passed: result.passed_test_cases || result.total_test_cases || 0,
        total: result.total_test_cases || 0,
        // Show all test case outputs if available
        testCaseOutputs: result.test_case_outputs || [],
        // For backward compatibility, keep single output
        output: result.output || '',
        message: result.status || `All ${result.total_test_cases || 0} test cases passed!`,
        type: 'run',
        is_test_contest: true
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
        // Include test cases for WA too
        testCaseOutputs: result.test_case_outputs || [],
        output: result.output || '',
        message: result.error_message || 
                `${result.passed_test_cases || 0}/${result.total_test_cases || 0} test cases passed`,
        type: 'run',
        is_test_contest: true
      });
    }
    
  } catch (error) {
    console.error('Test contest run error:', error);
    setCompilationStats({
      status: 'error',
      message: error.response?.data?.error || 'Run failed',
      type: 'run',
      is_test_contest: true
    });
  }
};

  // Helper function to map language to Ace editor mode
  const getEditorMode = (lang) => {
    switch(lang) {
      case 'cpp':
        return 'c_cpp';
      case 'c':
        return 'c_cpp';
      case 'python':
        return 'python';
      case 'java':
        return 'java';
      case 'javascript':
        return 'javascript';
      default:
        return 'text';
    }
  };

const handleSubmit = async () => {
  if (!code.trim()) {
    alert('Please write some code before submitting.');
    return;
  }

  // Show confirmation for submission
  if (!window.confirm('Submit your solution to the test contest? This will be judged against all test cases.')) {
    return;
  }

  try {
    const submitData = {
      language: language,
      code: code,
      // For submission, it should judge against all test cases
    };

    console.log('Submitting to test contest:', submitData);
    
    // Set loading state
    setCompilationStats({
      status: 'running',
      message: 'Submitting and judging against all test cases...',
      type: 'submit',
      is_test_contest: true
    });
    
    const response = await axios.post(
      `http://localhost:8000/test-contests/${testContestId}/problems/${problemData?.problem_index || problemIndex}/execute/`,
      submitData,
      { 
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Test contest submit response:', response.data);
    
    const result = response.data;
    
    if (result.verdict === 'AC' || result.all_passed === true) {
      setCompilationStats({
        status: 'success',
        verdict: result.verdict || 'AC',
        time: result.execution_time || 0,
        memory: result.memory_used || result.memory || 0,
        passed: result.passed_test_cases || result.total_test_cases || 0,
        total: result.total_test_cases || 0,
        // Include test case outputs if available
        testCaseOutputs: result.test_case_outputs || [],
        message: result.status || `All ${result.total_test_cases || 0} test cases passed!`,
        submissionId: result.submission_id || result.test_submission_id,
        type: 'submit',
        is_test_contest: true
      });
      
      // Refresh status
      fetchUserProblemStatus();
      refreshProblemStatus();
    } else {
      setCompilationStats({
        status: result.verdict === 'CE' ? 'compile_error' : 'error',
        verdict: result.verdict || result.status || 'WA',
        time: result.execution_time || 0,
        memory: result.memory_used || result.memory || 0,
        passed: result.passed_test_cases || 0,
        total: result.total_test_cases || 0,
        failedTestCase: result.failed_test_case || 0,
        // Include test case outputs
        testCaseOutputs: result.test_case_outputs || [],
        message: result.error_message || 
                `${result.passed_test_cases || 0}/${result.total_test_cases || 0} test cases passed`,
        type: 'submit',
        is_test_contest: true
      });
    }
    
  } catch (error) {
    console.error('Test contest submission error:', error);
    setCompilationStats({
      status: 'error',
      message: error.response?.data?.error || 'Submission failed',
      type: 'submit',
      is_test_contest: true
    });
  }
};

  // Helper function to get version index
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

  // Add this function to fetch user problem status for test contest
  const fetchUserProblemStatus = async () => {
    try {
      // Note: You might need to create a separate status endpoint for test contests
      // For now, we'll initialize empty status
      const initialStatuses = {};
      problemsList.forEach(problem => {
        const problemId = problem.problem_id || problem.code || problem.index;
        if (problemId) {
          initialStatuses[problemId] = {
            status: 'unsolved',
            solved: false,
            attempts: 0
          };
        }
      });
      setUserStatus(initialStatuses);
    } catch (error) {
      console.error('Error fetching test contest problem status:', error);
    }
  };

  // Call this in your useEffect after loading problem data
  useEffect(() => {
    if (problemData && testContestId) {
      fetchUserProblemStatus();
    }
  }, [problemData, testContestId]);

  // Format problem difficulty
  const formatDifficulty = (difficulty) => {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  // Handle back to test contest overview
  const handleBackToTestContest = () => {
    navigate(`/test-contests/${testContestId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-gray-600">Loading test contest problem...</p>
          </div>
          <p className="text-xs text-gray-500">Test Contest ID: {testContestId}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Contest Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleBackToTestContest}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Back to Test Contest
            </button>
            <button
              onClick={() => navigate('/contests')}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no problem data loaded (but we have problems list)
  if (!problemData && problemsList.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading test problem data...</p>
        </div>
      </div>
    );
  }

  // If no problems in test contest
  if (problemsList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToTestContest}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">
                      {contestData?.title || problemData?.contest_title || 'Test Contest'}
                    </h1>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      TEST
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Test Contest Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-10">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Test Problems Available</h3>
            <p className="text-gray-600 mb-4">This test contest doesn't have any problems yet.</p>
            <button
              onClick={handleBackToTestContest}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Back to Test Contest
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback data if contestData is missing
  const displayContestData = contestData || {
    title: problemData?.contest_title || 'Test Contest',
    platform: 'Test Platform',
    status: 'live',
    type: 'individual',
    is_test_contest: true
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{displayContestData.title}</h1>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                    TEST CONTEST
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{problemData?.contest_platform || displayContestData?.platform || 'Test Platform'}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                    {problemData?.contest_type === 'team' ? 'Team' : 'Individual'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    displayContestData?.status === 'live' ? 'bg-red-100 text-red-800' :
                    displayContestData?.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                    displayContestData?.status === 'past' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {displayContestData?.status?.charAt(0).toUpperCase() + displayContestData?.status?.slice(1)}
                    {displayContestData?.is_test_contest}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {displayContestData.status === 'live' && timeRemaining > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    Test Time Remaining
                  </div>
                  <div className="font-mono font-bold text-lg text-red-600 animate-pulse">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Collapsible Sidebar */}
        <div className={`
          bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          h-[calc(100vh-4rem)] overflow-y-auto sticky top-16
          ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}
        `}>
          <div className="p-6 space-y-6">
            {/* Problems List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Test Problems ({problemsList.length})
                </h3>
              </div>
              <div className="space-y-2">
                {problemsList.map((problem) => {
                  const problemId = problem.problem_id || problem.code || problem.index;
                  const isActive = problemId === (problemData?.problem_index || problemIndex);
                  
                  return (
                    <Link
                      key={problemId}
                      to={`/test-contests/${testContestId}/problems/${problemId}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {getStatusIcon(problemId)}
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getStatusClass(problemId)}`}>
                        {problemId}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{problem.title}</div>
                        <div className="text-xs text-gray-500">{formatDifficulty(problem.difficulty)}</div>
                      </div>
                      {problem.points && (
                        <div className="text-xs font-bold text-gray-700">
                          {problem.points}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Test Contest Navigation */}
            <div className="space-y-1">
              <button
                onClick={() => navigate(`/test-contests/${testContestId}/submissions`)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Code2 className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Submissions</span>
              </button>
              
              {/* {displayContestData.status === 'past' && (
                <button
                  onClick={() => console.log('Navigate to test contest discussions')}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-900">Discussions</span>
                </button>
              )} */}
              {/* {displayContestData.status === 'live' && (
                <button
                  onClick={() => console.log('Navigate to test contest clarifications')}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-900">Clarifications</span>
                </button>
              )} */}
              
              <button
                onClick={() => navigate(`/test-contests/${testContestId}/standings`)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Standings</span>
              </button>
              {/* {displayContestData.status === 'past' && (
                <button
                  onClick={() => console.log('Navigate to test contest editorial')}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-900">Editorial</span>
                </button>
              )} */}
            </div>

            {/* Test Problem Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-900">Stats</h3>
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-medium text-gray-900">
                    {problemStats?.problem?.points || problemData?.points || 100}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Solved By:</span>
                  <span className="font-medium text-green-600">
                    {problemStats?.statistics?.users_solved || problemData?.solved_count || 0}
                    {problemStats?.statistics?.users_attempted ? 
                      `/${problemStats.statistics.users_attempted}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Status:</span>
                  <span className={`font-medium ${
                    problemStats?.statistics?.user_status === 'solved' ? 'text-green-600' :
                    problemStats?.statistics?.user_status === 'attempted' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {problemStats?.statistics?.user_status === 'solved' ? 'Solved' :
                     problemStats?.statistics?.user_status === 'attempted' ? 'Attempted' :
                     'Not Attempted'}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">Test Contest Info</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-700">This is a test version</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700">Only visible to testers ad contest organizers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Problem Statement - Left Side */}
            <div className="flex-1 border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-6">
                {/* Problem Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {problemData?.problem_index || problemIndex} - {problemData?.title || 'Test Problem'}
                      </h1>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        TEST
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Time Limit: {problemData?.time_limit || 1} sec</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Memory Limit: {problemData?.memory_limit || 256} MB</span>
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {formatDifficulty(problemData?.difficulty)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Statement Content */}
                <div className="prose prose-sm max-w-none">
                  {problemData?.statement ? (
                    <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Problem Statement</span>
                      </div>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                        components={customComponents}
                      >
                        {problemData.statement}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800">No test problem statement available.</p>
                    </div>
                  )}
                  
                  {/* Sample Test Cases */}
                  {problemData?.sample_test_cases && problemData.sample_test_cases.length > 0 ? (
                    <div className="space-y-8 mb-8">
                      {problemData.sample_test_cases.map((testCase, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900">
                              Sample Test Case {index + 1}
                            </h4>
                          </div>
                          
                          {/* Input and Output side by side */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            {/* Input Column */}
                            <div className="border-r border-gray-200">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h5 className="font-medium text-gray-900">Input</h5>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(testCase.input);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 transition-colors" 
                                  title="Copy"
                                >
                                  <Clipboard className="w-4 h-4" />
                                </button>
                              </div>
                              <pre className="bg-gray-800 text-gray-100 p-4 font-mono text-xs overflow-x-auto whitespace-pre m-0">
                                {testCase.input}
                              </pre>
                            </div>
                            
                            {/* Output Column */}
                            <div>
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                                <h5 className="font-medium text-gray-900">Output</h5>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(testCase.output);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 transition-colors" 
                                  title="Copy"
                                >
                                  <Clipboard className="w-4 h-4" />
                                </button>
                              </div>
                              <pre className="bg-gray-800 text-gray-100 p-4 font-mono text-xs overflow-x-auto whitespace-pre m-0">
                                {testCase.output}
                              </pre>
                            </div>
                          </div>
                          
                          {/* Explanation - Full width below */}
                          {testCase.explanation && (
                            <div className="border-t border-gray-200">
                              <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                                <h5 className="font-medium text-blue-900">Explanation</h5>
                              </div>
                              <div className="p-4 bg-blue-50 text-blue-800 text-xs">
                                {testCase.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-gray-600 text-sm">No sample test cases available for test problem.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Code Editor - Right Side */}
            <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
              {/* Editor Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2">
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="python">Python 3</option>
                        <option value="cpp">C++ 17</option>
                        <option value="java">Java</option>
                        <option value="c">C</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const blob = new Blob([code], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${problemData?.problem_index || problemIndex}_TEST.${language}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert('Test code downloaded!');
                      }}
                      title="Download Test Code"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Editor with Syntax Highlighting */}
              <div className="flex-1 bg-gray-900 overflow-hidden">
                <AceEditor
                  mode={getEditorMode(language)}
                  theme="monokai"
                  value={code}
                  onChange={setCode}
                  name="test-code-editor"
                  height="100%"
                  width="100%"
                  fontSize={14}
                  showPrintMargin={true}
                  showGutter={true}
                  highlightActiveLine={true}
                  setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 4,
                    useWorker: false,
                  }}
                  style={{ 
                    background: '#1f2937',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace'
                  }}
                  placeholder={`// Write your ${language.toUpperCase()} code for test contest...`}
                />
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Language: {language === 'cpp' ? 'C++ 17' : 
                                language === 'java' ? 'Java' : 
                                language === 'python' ? 'Python 3' : 'C'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleRun}
                      className="px-4 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-3 h-3" />
                      Run
                    </button>
                    <button 
                      onClick={handleSubmit}
                      className="px-6 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </div>

{compilationStats && (
  <div className="border-t border-gray-200">
    <div className={`p-4 ${compilationStats.status === 'running' ? 'bg-blue-50' : compilationStats.status === 'success' ? 'bg-green-50' : compilationStats.status === 'compile_error' ? 'bg-yellow-50' : 'bg-red-50'}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          {compilationStats.status === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Running...</span>
            </>
          ) : compilationStats.status === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Success!</span>
            </>
          ) : compilationStats.status === 'compile_error' ? (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Compilation Error</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Failed</span>
            </>
          )}
          <span className="text-xs px-2 py-1 bg-white rounded border">
            {compilationStats.type === 'run' ? 'Run' : 'Submit'}
          </span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded border">
            TEST CONTEST
          </span>
        </div>
        <button 
          onClick={() => setCompilationStats(null)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        {/* Message */}
        <div className="text-sm">
          {compilationStats.message}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {/* Verdict */}
          <div className="bg-white p-2 rounded border">
            <div className="text-xs text-gray-600">Verdict</div>
            <div className={`font-medium text-sm ${
              compilationStats.verdict === 'AC' ? 'text-green-600' :
              compilationStats.verdict === 'WA' ? 'text-red-600' :
              compilationStats.verdict === 'TLE' ? 'text-orange-600' :
              compilationStats.verdict === 'MLE' ? 'text-green-600' :
              compilationStats.verdict === 'CE' ? 'text-yellow-600' :
              compilationStats.verdict === 'RE' ? 'text-pink-600' :
              'text-gray-700'
            }`}>
              {compilationStats.verdict || 'N/A'}
            </div>
          </div>
          
          {/* Time */}
          {compilationStats.time > 0 && (
            <div className="bg-white p-2 rounded border">
              <div className="text-xs text-gray-600">Time</div>
              <div className="font-medium text-sm text-gray-900">
                {compilationStats.time} ms
              </div>
            </div>
          )}
          
          {/* Memory */}
          {compilationStats.memory > 0 && (
            <div className="bg-white p-2 rounded border">
              <div className="text-xs text-gray-600">Memory</div>
              <div className="font-medium text-sm text-gray-900">
                {compilationStats.memory > 1024 
                  ? `${(compilationStats.memory / 1024).toFixed(2)} MB` 
                  : `${compilationStats.memory} KB`}
              </div>
            </div>
          )}
          
          {/* Test Cases */}
          {compilationStats.passed !== undefined && (
            <div className="bg-white p-2 rounded border">
              <div className="text-xs text-gray-600">Test Cases</div>
              <div className="font-medium text-sm text-gray-900">
                {compilationStats.passed}/{compilationStats.total}
              </div>
            </div>
          )}
        </div>
        
        {/* Failed Test Case Info */}
        {compilationStats.failedTestCase && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Failed on test case:</span>
            <span className="font-medium ml-2">#{compilationStats.failedTestCase}</span>
          </div>
        )}
        
        {/* Output section - show all test cases */}
        {compilationStats.testCaseOutputs && compilationStats.testCaseOutputs.length > 0 && (
          <div className="mt-3 space-y-4">
            <div className="text-xs text-gray-600 mb-1">Test Case Results:</div>
            {compilationStats.testCaseOutputs.map((tc, idx) => (
              <div key={idx} className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-xs font-medium">
                  Test Case {tc.test_case} {tc.passed ? '✓' : '✗'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  <div className="p-2 border-r border-gray-300">
                    <div className="text-xs text-gray-600 mb-1">Input:</div>
                    <pre className="text-xs font-mono bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>
                  <div className="p-2 border-r border-gray-300">
                    <div className="text-xs text-gray-600 mb-1">Expected:</div>
                    <pre className="text-xs font-mono bg-gray-700 text-gray-100 p-2 rounded overflow-x-auto">
                      {tc.expected}
                    </pre>
                  </div>
                  <div className="p-2">
                    <div className="text-xs text-gray-600 mb-1">Actual:</div>
                    <pre className={`text-xs font-mono p-2 rounded overflow-x-auto ${
                      tc.passed ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'
                    }`}>
                      {tc.actual || tc.error || 'No output'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Submission ID */}
        {compilationStats.submissionId && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Submission ID:</span>
            <span className="font-medium ml-2">{compilationStats.submissionId}</span>
          </div>
        )}
        
        {/* Test contest info */}
        {compilationStats.is_test_contest && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
            <div className="flex items-center gap-2">
              <span>This is a test contest submission. Results are for testing purposes only.</span>
            </div>
          </div>
        )}
      </div>
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

export default TestContestProblemDetail;