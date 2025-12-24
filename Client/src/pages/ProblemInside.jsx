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
  BookOpen
} from 'lucide-react';
import axios from 'axios';

const ProblemInside = () => {
  const { contestId, problemIndex } = useParams();
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
  // Add these with other useState declarations:
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
    if (!contestId || !(problemData?.problem_index || problemIndex)) {
      return;
    }
    
    try {
      const problemIdentifier = problemData?.problem_index || problemIndex;
      const statsRes = await axios.get(
        `http://localhost:8000/contests/${contestId}/problems/${problemIdentifier}/stats/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      
      console.log('Problem stats response:', statsRes.data);
      setProblemStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching problem stats:', error);
      // Don't set error state here - stats are not critical
    }
  };
  
  if (problemData || problemIndex) {
    fetchProblemStats();
  }
}, [contestId, problemData, problemIndex]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";

    return () => {
      if (footer) footer.style.display = "block";
    };
  }, []);

  // Helper function to calculate time remaining
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

  // Hide footer only in ProblemInside page
  useEffect(() => {
    const fetchAllData = async () => {
      if (!contestId) {
        setLoading(false);
        return;
      }

      console.log('Fetching data for contest:', contestId, 'problem:', problemIndex);
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch contest problems list
        console.log('Fetching contest problems...');
        const problemsRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        
        console.log('Problems API Response:', problemsRes.data);
        
        // Check if we got a successful response
        if (problemsRes.data) {
          // IMPORTANT: Only set contestData if we actually have contest data
          if (problemsRes.data.contest_info) {
            setContestData(problemsRes.data.contest_info);
          } else if (problemsRes.data.contest) {
            setContestData(problemsRes.data.contest);
          } else {
            // If no contest data in the response, keep it null
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
          navigate(`/contests/${contestId}/problems/${problemToFetch}`, { replace: true });
          return;
        }
        
        // 3. Fetch specific problem data
        if (problemToFetch) {
          console.log('Fetching specific problem:', problemToFetch);
          try {
            const problemRes = await axios.get(
              `http://localhost:8000/contests/${contestId}/problems/${problemToFetch}/`,
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            if (problemRes.data) {
              console.log('Problem data response:', problemRes.data);
              console.log('Contest status from problem response:', problemRes.data.contest_status);
              setProblemData(problemRes.data);
              
              // If we don't have contestData yet, use data from problem response
              if (!contestData && problemRes.data.contest_title) {
                setContestData({
                  status: problemRes.data.contest_status,
                  title: problemRes.data.contest_title,
                  platform: 'Custom Platform',
                  type: 'individual'
                });
              }
            } else {
              console.error('No problem data in response');
            }
          } catch (problemError) {
            console.error('Error fetching specific problem:', problemError);
            
            // Check if we have problems list to fall back to
            if (problemsRes.data?.problems?.length > 0) {
              // Show the first problem instead
              const firstProblem = problemsRes.data.problems[0];
              const firstIndex = firstProblem.problem_id || firstProblem.code || firstProblem.index;
              navigate(`/contests/${contestId}/problems/${firstIndex}`);
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
            console.log('⏰ Timer started:', remaining, 'seconds remaining');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching contest data:', error);
        setError(error.response?.data?.error || 'Failed to load contest');
        setLoading(false);
      }
    };

    fetchAllData();
  }, [contestId, problemIndex, navigate]);

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
    if (contestData?.start_time && contestData?.status === 'live') {
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
        `http://localhost:8000/contests/${contestId}/problems/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      if (response.data.problems) {
        setProblemsList(response.data.problems);
      }
    } catch (error) {
      console.error('Error refreshing problems:', error);
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      alert('Please write some code before running.');
      return;
    }

    try {
      // Use sample test case input for running
      const sampleInput = problemData?.sample_test_cases?.[0]?.input || '';
      const expectedOutput = problemData?.sample_test_cases?.[0]?.output || '';

      const runData = {
        language: language,
        version_index: getVersionIndex(language),
        code: code,
        input_data: sampleInput,
        expected_output: expectedOutput
      };

      console.log('Running code with data:', runData);
      
      // Set loading state
      setCompilationStats({
        status: 'running',
        message: 'Running against sample test case...',
        type: 'run'
      });
      
      const response = await axios.post(
        `http://localhost:8000/contests/${contestId}/execute/`,
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
      if (response.data.is_execution_success) {
       
        const isCorrect = expectedOutput ? 
          (response.data.output?.trim() === expectedOutput.trim()) : true;
        
        setCompilationStats({
          status: isCorrect ? 'success' : 'error',
          verdict: isCorrect ? 'AC' : 'WA',
          time: response.data.execution_time_ms || 0,
          memory: response.data.memory_kb || 0,
          output: response.data.output || '',
          message: isCorrect ? 'Test case passed!' : 'Wrong Answer',
          type: 'run',
          expectedOutput: expectedOutput
        });
      } else {
        setCompilationStats({
          status: 'error',
          verdict: response.data.verdict || response.data.status || 'RE',
          time: response.data.execution_time_ms || 0,
          memory: response.data.memory_kb || 0,
          output: response.data.output || '',
          message: response.data.status || 'Runtime Error',
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

  // Replace the entire handleSubmit function with this:
  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting.');
      return;
    }

    // Show confirmation for submission
    if (!window.confirm('Submit your solution? This will be judged against all test cases.')) {
      return;
    }

    try {
      const submitData = {
        language: language,
        version_index: getVersionIndex(language),
        code: code,
        input_data: '', // Empty for full submission
      };

      console.log('Submitting code:', submitData);
      
      // Set loading state
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

      console.log('Submit response:', response.data);
      
      if (response.data.verdict === 'AC') {
        setCompilationStats({
          status: 'success',
          verdict: 'AC',
          time: response.data.execution_time || 0,
          memory: response.data.memory_used || 0,
          passed: response.data.passed_test_cases || 0,
          total: response.data.total_test_cases || 0,
          message: `All ${response.data.total_test_cases} test cases passed!`,
          submissionId: response.data.submission_id,
          type: 'submit'
        });
        
        // Refresh status
        fetchUserProblemStatus();
        refreshProblemStatus();
      } else {
        setCompilationStats({
          status: response.data.status === 'CE' ? 'compile_error' : 'error',
          verdict: response.data.status || 'WA',
          time: response.data.execution_time || 0,
          memory: response.data.memory_used || 0,
          passed: response.data.passed_test_cases || 0,
          total: response.data.total_test_cases || 0,
          failedTestCase: response.data.failed_test_case || 0,
          message: `${response.data.passed_test_cases}/${response.data.total_test_cases} test cases passed`,
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

  // Add this function to fetch user problem status
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

  // Call this in your useEffect after loading problem data
  useEffect(() => {
    if (problemData && contestId) {
      fetchUserProblemStatus();
    }
  }, [problemData, contestId]);


  // Format problem difficulty
  const formatDifficulty = (difficulty) => {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading problem...</p>
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
            onClick={() => navigate('/contests')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Contests
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

  // If no problems in contest
  if (problemsList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/contests')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {contestData?.title || problemData?.contest_title || 'Contest'}
                  </h1>
                  <p className="text-xs text-gray-600">{contestData?.platform || 'Custom Platform'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-10">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Problems Available</h3>
            <p className="text-gray-600 mb-4">This contest doesn't have any problems yet.</p>
            <button
              onClick={() => navigate('/contests')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback data if contestData is missing
  const displayContestData = contestData || {
    title: problemData?.contest_title || 'Contest',
    platform: 'Custom Platform',
    status: 'live',
    type: 'individual'
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
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{displayContestData.title}</h1>
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{problemData?.contest_platform || displayContestData?.platform || 'Custom Platform'}</span>
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
                    </span>
                  </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {displayContestData.status === 'live' && timeRemaining > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    Time Remaining
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
              <h3 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Problems ({problemsList.length})
              </h3>
              <div className="space-y-2">
                {problemsList.map((problem) => {
                  const problemId = problem.problem_id || problem.code || problem.index;
                  const isActive = problemId === (problemData?.problem_index || problemIndex);
                  
                  return (
                    <Link
                      key={problemId}
                      to={`/contests/${contestId}/problems/${problemId}`}
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
                        <div className="text-xs text-gray-500">{formatDifficulty(problem.difficulty)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Contest Navigation */}
            <div className="space-y-1">
              <Link
                to={`/contests/${contestId}/submissions`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Code2 className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">My Submissions</span>
              </Link>
              
              {displayContestData.status === 'past' && (
              <Link
                to={`/contests/${contestId}/discussion`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Discussions</span>
              </Link>
              )}
              {displayContestData.status === 'live' && (
              <Link
                to={`/contests/${contestId}/clarifications`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Clarification</span>
              </Link>
              )}
              
              <Link
                to={`/contests/${contestId}/standings`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold text-gray-900">Standings</span>
              </Link>
              {displayContestData.status === 'past' && (
                <Link
                  to={`/contests/${contestId}/editorial`}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-900">Editorial</span>
                </Link>
              )}
            </div>

            {/* Problem Stats */}
<div className="bg-gray-50 rounded-lg p-4">
  <h3 className="text-xs font-semibold text-gray-900 mb-3">Problem Stats</h3>
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
      <span className="text-gray-600">Accuracy:</span>
      <span className="font-medium text-gray-900">
        {problemStats?.statistics?.accuracy || problemData?.accuracy || '0%'}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-600">Attempts:</span>
      <span className="font-medium text-yellow-600">
        {problemStats?.statistics?.total_submissions || problemData?.attempted_count || 0}
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
        {problemStats?.statistics?.user_attempts > 0 ? 
          ` (${problemStats.statistics.user_attempts})` : ''}
      </span>
    </div>
    {problemStats?.statistics?.average_time > 0 && (
      <div className="flex justify-between">
        <span className="text-gray-600">Avg Time:</span>
        <span className="font-medium text-gray-900">
          {problemStats.statistics.average_time}ms
        </span>
      </div>
    )}
  </div>
  {problemStats?.statistics?.verdict_distribution && 
   problemStats.statistics.verdict_distribution.length > 0 && (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-900 mb-2">Verdict Breakdown</h4>
      <div className="space-y-1">
        {problemStats.statistics.verdict_distribution.slice(0, 4).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">{item.verdict}:</span>
            <span className="font-medium text-gray-900 text-xs">
              {item.count}
            </span>
          </div>
        ))}
        {problemStats.statistics.verdict_distribution.length > 4 && (
          <div className="text-center">
            <span className="text-gray-500 text-xs">
              +{problemStats.statistics.verdict_distribution.length - 4} more
            </span>
          </div>
        )}
      </div>
    </div>
  )}
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

              {/* Action Buttons */}
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
                      className="px-6 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
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
                            compilationStats.verdict === 'MLE' ? 'text-purple-600' :
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
                      
                      {/* Submission ID */}
                      {compilationStats.submissionId && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">Submission ID:</span>
                          <span className="font-medium ml-2">{compilationStats.submissionId}</span>
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

export default ProblemInside;