// VirtualProblem.jsx - UPDATED VERSION
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
  Users
} from 'lucide-react';
import axios from 'axios';

const VirtualProblem = () => {
  // Fix: Extract ALL parameters from URL
  const { contestId: contestIdParam, virtualContestId, problemIndex } = useParams();
  const navigate = useNavigate();
  
  // Use contestIdParam for API calls
  const contestId = contestIdParam;
  
  const [loading, setLoading] = useState(true);
  const [virtualContestData, setVirtualContestData] = useState(null);
  const [originalContestData, setOriginalContestData] = useState(null);
  const [problemData, setProblemData] = useState(null);
  const [problemsList, setProblemsList] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [problemStats, setProblemStats] = useState(null);
  // Add this with other useState declarations:
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
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    return () => {
      if (footer) footer.style.display = "block";
    };
  }, []);

  // Helper function to calculate time remaining for virtual contest
  const calculateTimeRemaining = (virtualContest) => {
    if (!virtualContest?.virtual_end_time) {
      return 0;
    }
    
    try {
      const endTime = new Date(virtualContest.virtual_end_time);
      const now = new Date();
      
      if (now < endTime) {
        return Math.floor((endTime - now) / 1000);
      } else if (now >= endTime) {
        return 0;
      }
    } catch (error) {
      console.error('Error calculating virtual contest time remaining:', error);
      return 0;
    }
    
    return 0;
  };

  // Hide footer only in VirtualProblem page
  useEffect(() => {
    const fetchAllData = async () => {
      if (!virtualContestId || !contestId) {
        setError("Missing contest ID or virtual contest ID");
        setLoading(false);
        return;
      }

      console.log('Fetching data for contest:', contestId, 'virtual contest:', virtualContestId, 'problem:', problemIndex);
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch virtual contest details
        console.log('Fetching virtual contest details...');
        const virtualContestRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        console.log('Virtual Contest API Response:', virtualContestRes.data);
        
        if (virtualContestRes.data) {
          setVirtualContestData(virtualContestRes.data);
          
          // Extract original contest data
          if (virtualContestRes.data.original_contest) {
            setOriginalContestData(virtualContestRes.data.original_contest);
          }
          
          // Extract user progress
          if (virtualContestRes.data.progress) {
            setUserProgress(virtualContestRes.data.progress);
          }
        }
        
        // 2. Fetch virtual contest problems
        console.log('Fetching virtual contest problems...');
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        console.log('Virtual Problems API Response:', problemsRes.data);
        
        if (problemsRes.data) {
          setProblemsList(problemsRes.data.problems || []);
          
          // If we don't have original contest data from first response, use this
          if (!originalContestData && problemsRes.data.original_contest_id) {
            setOriginalContestData({
              id: problemsRes.data.original_contest_id,
              title: problemsRes.data.contest_title || 'Original Contest'
            });
          }
        }
        
        // 3. Determine which problem to fetch
        let problemToFetch = problemIndex;
        
        // If no problemIndex specified, use the first problem
        if (!problemToFetch && problemsRes.data?.problems?.length > 0) {
          const firstProblem = problemsRes.data.problems[0];
          problemToFetch = firstProblem.index;
          console.log('No problem index specified, using first problem:', problemToFetch);
          
          // Navigate to the first problem
          navigate(`/contests/${contestId}/virtual/${virtualContestId}/problems/${problemToFetch}`, { replace: true });
          return;
        }
        
        // 4. Fetch specific problem data from VIRTUAL contest endpoint
        if (problemToFetch) {
          console.log('Fetching virtual problem:', problemToFetch);
          try {
            const problemRes = await axios.get(
              `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/problems/${problemToFetch}/`,
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            if (problemRes.data) {
              console.log('Virtual problem data response:', problemRes.data);
              setProblemData(problemRes.data);
              
              // If we don't have contestData yet, use data from problem response
              if (!originalContestData && problemRes.data.contest_title) {
                setOriginalContestData({
                  id: problemRes.data.contest_id,
                  title: problemRes.data.contest_title
                });
              }
            } else {
              console.error('No problem data in response');
            }
          } catch (problemError) {
            console.error('Error fetching virtual problem:', problemError);
            
            // Fall back to original contest problem if virtual endpoint fails
            if (originalContestData?.id) {
              try {
                const fallbackRes = await axios.get(
                  `http://localhost:8000/contests/${originalContestData.id}/problems/${problemToFetch}/`,
                  { headers: { Authorization: `Bearer ${TOKEN}` } }
                );
                
                if (fallbackRes.data) {
                  // Add virtual metadata to the original problem data
                  const virtualData = {
                    ...fallbackRes.data,
                    virtual_contest_id: virtualContestId,
                    virtual_status: 'unsolved',
                    virtual_attempts: 0,
                    virtual_solved: false
                  };
                  
                  // Add virtual progress if available
                  if (virtualContestRes.data?.progress?.[problemToFetch]) {
                    const progress = virtualContestRes.data.progress[problemToFetch];
                    virtualData.virtual_status = progress.solved ? 'solved' : 
                                                progress.attempts > 0 ? 'attempted' : 'unsolved';
                    virtualData.virtual_attempts = progress.attempts || 0;
                    virtualData.virtual_solved = progress.solved || false;
                    virtualData.virtual_best_time = progress.best_time;
                  }
                  
                  setProblemData(virtualData);
                }
              } catch (fallbackError) {
                console.error('Error fetching fallback problem:', fallbackError);
              }
            }
            
            // Navigate to first problem if current one not found
            if (problemsRes.data?.problems?.length > 0) {
              const firstProblem = problemsRes.data.problems[0];
              const firstIndex = firstProblem.index;
              navigate(`/contests/${contestId}/virtual/${virtualContestId}/problems/${firstIndex}`);
            }
          }
        }
        
        // Calculate initial time remaining from virtual contest
        if (virtualContestRes.data?.virtual_end_time) {
          const remaining = calculateTimeRemaining(virtualContestRes.data);
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setIsTimerActive(true);
            console.log('⏰ Virtual Timer started:', remaining, 'seconds remaining');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching virtual contest data:', error);
        setError(error.response?.data?.error || 'Failed to load virtual contest');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [contestId, virtualContestId, problemIndex, navigate]);

  // Dynamic countdown timer effect for virtual contest
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

  // Update timer when virtualContestData changes
  useEffect(() => {
    if (virtualContestData?.virtual_end_time) {
      try {
        const remaining = calculateTimeRemaining(virtualContestData);
        if (remaining > 0 && remaining !== timeRemaining) {
          setTimeRemaining(remaining);
          setIsTimerActive(true);
        }
      } catch (timeError) {
        console.error('Error updating virtual contest timer:', timeError);
      }
    }
  }, [virtualContestData]);

  // Format time for display
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (problemIdentifier) => {
    const status = userProgress[problemIdentifier]?.solved ? 'solved' : 
                  (userProgress[problemIdentifier]?.attempts > 0 ? 'attempted' : 'unsolved');
    switch (status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'attempted': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusClass = (problemIdentifier) => {
    const status = userProgress[problemIdentifier]?.solved ? 'solved' : 
                  (userProgress[problemIdentifier]?.attempts > 0 ? 'attempted' : 'unsolved');
    switch (status) {
      case 'solved': return 'bg-green-100 text-green-800';
      case 'attempted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const refreshVirtualProblemStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/problems/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      if (response.data.problems) {
        setProblemsList(response.data.problems);
        
        // Update user progress
        if (response.data.problems) {
          const newProgress = {};
          response.data.problems.forEach(problem => {
            newProgress[problem.index] = {
              attempts: problem.attempts || 0,
              solved: problem.solved || false,
              best_time: problem.best_time || null
            };
          });
          setUserProgress(newProgress);
        }
      }
    } catch (error) {
      console.error('Error refreshing virtual problems:', error);
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
      // Don't need input_data or expected_output for run endpoint
      // It will automatically use all test cases from the problem
    };

    console.log('Running code in virtual contest with data:', runData);
    
    // Set loading state
    setCompilationStats({
      status: 'running',
      message: 'Running against all test cases...',
      type: 'run'
    });
    
    // FIXED: Use the /run/ endpoint instead of /execute/
    const response = await axios.post(
      `http://localhost:8000/contests/${originalContestData?.id || contestId}/problems/${problemData?.problem_index || problemIndex}/run/`,
      runData,
      { 
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Run response:', response.data);
    
    // Update compilation stats based on actual API response
    if (response.data.verdict === 'AC' || response.data.all_passed === true) {
      setCompilationStats({
        status: 'success',
        verdict: response.data.verdict || 'AC',
        time: response.data.execution_time || 0,
        memory: response.data.memory_used || 0,
        passed: response.data.passed_test_cases || response.data.total_test_cases || 0,
        total: response.data.total_test_cases || 0,
        // Show all test case outputs
        testCaseOutputs: response.data.test_case_outputs || [],
        // For backward compatibility, keep single output
        output: response.data.output || '',
        message: response.data.status || `All ${response.data.total_test_cases} test cases passed!`,
        type: 'run'
      });
    } else {
      setCompilationStats({
        status: response.data.verdict === 'CE' ? 'compile_error' : 'error',
        verdict: response.data.verdict || 'WA',
        time: response.data.execution_time || 0,
        memory: response.data.memory_used || 0,
        passed: response.data.passed_test_cases || 0,
        total: response.data.total_test_cases || 0,
        failedTestCase: response.data.failed_test_case || 0,
        // ✅ FIX: include test cases for WA too
        testCaseOutputs: response.data.test_case_outputs || [],
        output: response.data.output || '',
        message: response.data.error_message ||
                `${response.data.passed_test_cases || 0}/${response.data.total_test_cases || 0} test cases passed`,
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

  // Update handleSubmit function for virtual contest
const handleSubmit = async () => {
  if (!code.trim()) {
    alert('Please write some code before submitting.');
    return;
  }

  // Show confirmation for submission
  if (!window.confirm('Submit your solution to the virtual contest? This will be judged against all test cases.')) {
    return;
  }

  try {
    const submitData = {
      problem_index: problemData?.problem_index || problemIndex,
      code: code,
      language: language,
    };

    console.log('Submitting to virtual contest:', submitData);
    
    // Set loading state
    setCompilationStats({
      status: 'running',
      message: 'Submitting to virtual contest and judging...',
      type: 'submit'
    });
    
    // Use virtual contest submission endpoint
    const response = await axios.post(
      `http://localhost:8000/contests/${contestId}/virtual/${virtualContestId}/submit/`,
      submitData,
      { 
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    console.log('Virtual submit response:', response.data);
    
    if (response.data.contest_submission_result) {
      const contestResult = response.data.contest_submission_result;
      
      if (contestResult.verdict === 'AC') {
        setCompilationStats({
          status: 'success',
          verdict: 'AC',
          time: contestResult.execution_time || 0,
          memory: contestResult.memory_used || 0,
          passed: contestResult.passed_test_cases || 0,
          total: contestResult.total_test_cases || 0,
          message: `All ${contestResult.total_test_cases} test cases passed!`,
          virtualSubmissionId: response.data.virtual_submission_id,
          type: 'submit'
        });
      } else {
        setCompilationStats({
          status: contestResult.verdict === 'CE' ? 'compile_error' : 'error',
          verdict: contestResult.verdict || 'WA',
          time: contestResult.execution_time || 0,
          memory: contestResult.memory_used || 0,
          passed: contestResult.passed_test_cases || 0,
          total: contestResult.total_test_cases || 0,
          failedTestCase: contestResult.failed_test_case || 0,
          message: `${contestResult.passed_test_cases}/${contestResult.total_test_cases} test cases passed`,
          virtualSubmissionId: response.data.virtual_submission_id,
          type: 'submit'
        });
      }
    } else if (response.data.status === 'pending' || response.data.message) {
      setCompilationStats({
        status: 'running',
        message: 'Submission received! Judging in progress...',
        virtualSubmissionId: response.data.virtual_submission_id,
        type: 'submit'
      });
    } else {
      setCompilationStats({
        status: 'error',
        message: response.data.error || 'Submission failed',
        type: 'submit'
      });
    }
    
    // Refresh virtual problem status after a delay
    setTimeout(() => {
      refreshVirtualProblemStatus();
    }, 2000);
    
  } catch (error) {
    console.error('Virtual submission error:', error);
    setCompilationStats({
      status: 'error',
      message: error.response?.data?.error || 'Submission failed to virtual contest',
      type: 'submit'
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

  // Format problem difficulty
  const formatDifficulty = (difficulty) => {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  // Fix the Link components in the sidebar
  const renderSidebarLinks = () => {
    // Use contestId (the original contest ID) for discussion, clarifications, etc.
    const originalContestId = originalContestData?.id || contestId;
    
    return (
      <div className="space-y-1">
        <Link
          to={`/contests/${contestId}/submissions`}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
        >
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-semibold text-gray-900">My Submissions</span>
        </Link>
        
        {!virtualContestData?.is_active && (
          <Link
            to={`/contests/${originalContestId}/discussion`}
            className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-semibold text-gray-900">Discussions</span>
          </Link>
        )}
        {virtualContestData?.is_active && (
          <Link
            to={`/contests/${originalContestId}/clarifications`}
            className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-xs font-semibold text-gray-900">Clarification</span>
          </Link>
        )}
        
        <Link
          to={`/contests/${originalContestId}/standings`}
          className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
        >
          <Trophy className="w-4 h-4" />
          <span className="text-xs font-semibold text-gray-900">Standings</span>
        </Link>
        {!virtualContestData?.is_active && (
          <Link
            to={`/contests/${originalContestId}/editorial`}
            className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-semibold text-gray-900">Editorial</span>
          </Link>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading virtual contest problem...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/my-virtual')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Virtual Contests
          </button>
        </div>
      </div>
    );
  }

  // If no problem data loaded (but we have problems list)
  if (!problemData && problemsList.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading problem data...</p>
        </div>
      </div>
    );
  }

  // If no problems in virtual contest
  if (problemsList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/my-virtual')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {originalContestData?.title || 'Virtual Contest'}
                  </h1>
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                      Virtual
                    </span>
                    <span>Started: {new Date(virtualContestData?.virtual_start_time).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-10">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Problems Available</h3>
            <p className="text-gray-600 mb-4">This virtual contest doesn't have any problems yet.</p>
            <button
              onClick={() => navigate('/my-virtual')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Virtual Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback data
  const displayContestData = {
    title: originalContestData?.title || 'Virtual Contest',
    platform: originalContestData?.platform || 'Virtual Platform',
    status: virtualContestData?.is_active ? 'live' : 'past',
    type: 'virtual',
    virtual_start_time: virtualContestData?.virtual_start_time,
    virtual_end_time: virtualContestData?.virtual_end_time
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
                <h1 className="text-xl font-bold text-gray-900">{displayContestData.title}</h1>
                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{displayContestData.platform}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                    Virtual
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    virtualContestData?.is_active ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {virtualContestData?.is_active ? 'Running' : 'Past'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {virtualContestData?.is_active && timeRemaining > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    Virtual Time Remaining
                  </div>
                  <div className="font-mono font-bold text-lg text-red-600 animate-pulse">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              )}
              {!virtualContestData?.is_active && (
                <div className="text-right">
                  <div className="text-xs text-gray-600">Virtual Contest Ended</div>
                  <div className="text-sm text-gray-700">
                    {new Date(virtualContestData?.virtual_end_time).toLocaleString()}
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
              <h3 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Problems ({problemsList.length})
              </h3>
              <div className="space-y-2">
                {problemsList.map((problem) => {
                  const problemId = problem.index;
                  const isActive = problemId === (problemData?.problem_index || problemIndex);
                  
                  return (
                    <Link
                      key={problemId}
                      to={`/contests/${contestId}/virtual/${virtualContestId}/problems/${problemId}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {getStatusIcon(problemId)}
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${getStatusClass(problemId)}`}>
                        {problemId}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{problem.title}</div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">{formatDifficulty(problem.difficulty)}</div>
                          <div className="text-xs">
                            {problem.solved ? (
                              <span className="text-green-600">✓ Solved</span>
                            ) : problem.attempts > 0 ? (
                              <span className="text-yellow-600">{problem.attempts} attempts</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Virtual Contest Navigation */}
            {renderSidebarLinks()}

            {/* Virtual Problem Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-900 mb-3">Stats</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    problemData?.virtual_solved ? 'text-green-600' :
                    problemData?.virtual_attempts > 0 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {problemData?.virtual_solved ? 'Solved' :
                     problemData?.virtual_attempts > 0 ? 'Attempted' :
                     'Not Attempted'}
                  </span>
                </div>
                {problemData?.virtual_attempts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Attempts:</span>
                    <span className="font-medium text-yellow-600">
                      {problemData.virtual_attempts}
                    </span>
                  </div>
                )}
                {problemData?.virtual_best_time && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Time:</span>
                    <span className="font-medium text-green-600">
                      {problemData.virtual_best_time.toFixed(2)} min
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-medium text-gray-900">
                    {problemData?.points || 100}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className="font-medium text-gray-900">
                    {formatDifficulty(problemData?.difficulty)}
                  </span>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Virtual
                      </span>
                      <span className="text-xs text-gray-500">
                        From: {originalContestData?.title}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {problemData?.problem_index || problemIndex} - {problemData?.title || 'Problem'}
                    </h1>
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
                        <p className="text-yellow-800">No problem statement available.</p>
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
                      <p className="text-gray-600 text-sm">No sample test cases available.</p>
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
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="python">Python 3</option>
                      <option value="cpp">C++ 17</option>
                      <option value="java">Java</option>
                      <option value="c">C</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const blob = new Blob([code], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${problemData?.problem_index || problemIndex}.${language}`;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert('Code downloaded!');
                      }}
                      title="Download Code"
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
                name="code-editor"
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
                  useWorker: false, // Disable worker for better performance
                }}
                style={{ 
                  background: '#1f2937',
                  fontFamily: 'Consolas, Monaco, "Andale Mono", monospace'
                }}
                placeholder={`// Write your ${language.toUpperCase()} code here...`}
              />
            </div>

              {/* Editor Footer */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    Language: {language === 'cpp' ? 'C++ 17' : 
                              language === 'java' ? 'Java' : 
                              language === 'python' ? 'Python 3' : 'C'}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleRun}
                      className="px-4 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Run
                    </button>
                    <button 
                      onClick={handleSubmit}
                      className="px-6 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </div>


{/* Add this after the Editor Footer section */}
{compilationStats && (
  <div className="border-t border-gray-200">
    <div className={`p-4 ${
      compilationStats.status === 'running' ? 'bg-blue-50' : 
      compilationStats.status === 'success' ? 'bg-green-50' : 
      compilationStats.status === 'compile_error' ? 'bg-yellow-50' : 
      'bg-red-50'
    }`}>
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
            {compilationStats.type === 'run' ? 'Run' : 'Virtual Submit'}
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
        {(compilationStats.time > 0 || compilationStats.memory > 0 || 
          compilationStats.passed !== undefined) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {/* Verdict */}
            {compilationStats.verdict && (
              <div className="bg-white p-2 rounded border">
                <div className="text-xs text-gray-600">Verdict</div>
                <div className={`font-medium text-sm ${
                  compilationStats.verdict === 'AC' ? 'text-green-600' :
                  compilationStats.verdict === 'WA' ? 'text-red-600' :
                  compilationStats.verdict === 'TLE' ? 'text-orange-600' :
                  compilationStats.verdict === 'MLE' ? 'text-purple-600' :
                  compilationStats.verdict === 'CE' ? 'text-yellow-600' :
                  compilationStats.verdict === 'RE' ? 'text-pink-600' :
                  'text-gray-700'
                }`}>
                  {compilationStats.verdict || 'N/A'}
                </div>
              </div>
            )}
            
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
        )}
        
        {/* Failed Test Case Info */}
        {compilationStats.failedTestCase && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Failed on test cases</span>
            {/* <span className="font-medium ml-2">#{compilationStats.failedTestCase}</span> */}
          </div>
        )}
        
        {/* Output (for run) */}
        {compilationStats.output && compilationStats.type === 'run' && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-600 mb-1">Output:</div>
            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
              {compilationStats.output}
            </pre>
            
            {/* Show expected output if available and mismatch */}
            {compilationStats.expectedOutput && 
            compilationStats.output?.trim() !== compilationStats.expectedOutput.trim() && (
              <>
                <div className="text-xs text-gray-600 mb-1">Expected Output:</div>
                <pre className="bg-gray-700 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono border-l-4 border-yellow-500">
                  {compilationStats.expectedOutput}
                </pre>
              </>
            )}
          </div>
        )}
        
        {/* Test Case Results - NEW SECTION ADDED HERE */}
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
        
        {/* Virtual Submission ID */}
        {compilationStats.virtualSubmissionId && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Virtual Submission ID:</span>
            <span className="font-medium ml-2">{compilationStats.virtualSubmissionId}</span>
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

export default VirtualProblem;