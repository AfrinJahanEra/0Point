// CreateContest.jsx - Compact Version
import React, { useState, useEffect } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import { Code2, Play, Download } from 'lucide-react';
import { Link, useNavigate, useParams} from 'react-router-dom';
import { 
  ArrowLeft,
  Trophy,
  Calendar,
  Clock,
  Users,
  Settings,
  FileText,
  Plus,
  Trash2,
  Save,
  Eye,
  Check,
  Tag,
  Image,
  TestTube,
  GraduationCap,
  Sliders,
  Globe,
  Lock,
  Mail,
  Shield,
  Bell,
  UserPlus,
  X,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { BACKEND_URL } from '../utils/api';

const CreateContest = () => {
  const navigate = useNavigate();
  const { contestId } = useParams();
  const [activeProblem, setActiveProblem] = useState(null);
  const [compilationStats, setCompilationStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('problems');
  const [contestData, setContestData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 3,
    type: 'individual',
    platform: 'IUT'
  });
  const [code, setCode] = useState(``);
  const [language, setLanguage] = useState('cpp');
  const [showStatementPreview, setShowStatementPreview] = useState(false);
  const [problems, setProblems] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loadingContest, setLoadingContest] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [publishSettings, setPublishSettings] = useState({
    visibility: 'public',
    registrationRequired: true,
    emailNotifications: true,
    leaderboardPublic: true,
    allowPractice: true,
    ratingChanges: true,
    editorialPublished: false,
    testContest: false,
    testers: [],
    testStartTime: '',
    testDuration: 1,
  });
  const [predefinedTags] = useState([
    'Dynamic Programming', 'Graph Theory', 'Greedy', 'Binary Search',
    'Mathematics', 'Data Structures', 'Strings', 'Sorting',
    'Trees', 'Geometry', 'Combinatorics', 'Bitmasking',
    'Number Theory', 'Two Pointers', 'DFS/BFS', 'Backtracking',
    'Segment Tree', 'DSU', 'Shortest Path', 'Game Theory'
  ]);
  const [testInvites, setTestInvites] = useState('');
  const [publishErrors, setPublishErrors] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [predictingDifficulty, setPredictingDifficulty] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);

  const customComponents = {
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold mt-3 mb-2 text-gray-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-700">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="my-2 text-gray-700 text-xs leading-relaxed">
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
          <div className="bg-gray-800 text-gray-300 text-xs px-2 py-1 font-mono">
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
      <blockquote className="border-l-3 border-blue-400 pl-2 py-1 my-2 bg-blue-50 italic text-gray-700 text-xs">
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
      <th className="px-2 py-1 bg-gray-100 text-left text-xs font-semibold text-gray-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1 text-xs text-gray-700 border-t border-gray-200">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline text-xs">
        {children}
      </a>
    ),
    spoiler: ({ children, summary }) => (
      <details className="my-2 bg-gray-50 border border-gray-300 rounded">
        <summary className="cursor-pointer px-2 py-1 font-medium text-gray-700 hover:bg-gray-100 text-xs">
          {summary || 'Solution / Spoiler'}
        </summary>
        <div className="px-2 py-1 border-t border-gray-300 bg-white text-xs">
          {children}
        </div>
      </details>
    )
  };

  useEffect(() => {
    if (contestId) {
      const fetchContestForEdit = async () => {
        setLoadingContest(true);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication required');
          }
          
          const response = await fetch(`${BACKEND_URL}/contests/${contestId}/`, {
            headers: { 
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (!response.ok) throw new Error('Failed to fetch contest');
          
          const contestData = await response.json();
          
          setContestData({
            title: contestData.title || '',
            description: contestData.description || '',
            startTime: contestData.start_time ? contestData.start_time.replace('Z', '') : '',
            duration: contestData.duration || 3,
            type: contestData.type || 'individual',
            platform: contestData.platform || 'IUT'
          });
          
          const problemsResponse = await fetch(`${BACKEND_URL}/contests/${contestId}/problems/`, {
            headers: { 
              "Authorization": `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (problemsResponse.ok) {
            const problemsData = await problemsResponse.json();
            
            if (problemsData.problems && problemsData.problems.length > 0) {
              const formattedProblems = await Promise.all(
                problemsData.problems.map(async (problem, index) => {
                  const problemDetailResponse = await fetch(
                    `${BACKEND_URL}/contests/${contestId}/problems/${problem.code}/`,
                    {
                      headers: { 
                        "Authorization": `Bearer ${localStorage.getItem('token')}`
                      }
                    }
                  );
                  
                  if (problemDetailResponse.ok) {
                    const problemDetail = await problemDetailResponse.json();
                    
                    return {
                      id: generateProblemId(),
                      problemIndex: problem.code,
                      title: problem.title,
                      statement: problemDetail.statement || '',
                      timeLimit: problemDetail.time_limit || 2,
                      memoryLimit: problemDetail.memory_limit || 256,
                      tags: problemDetail.tags || [],
                      tutorial: problemDetail.tutorial || '',
                      difficulty: problemDetail.difficulty || 'Medium',
                      testCases: problemDetail.test_cases?.map((tc, tcIndex) => ({
                        id: Date.now() + tcIndex,
                        input: tc.input || '',
                        output: tc.output || '',
                        explanation: tc.explanation || ''
                      })) || []
                    };
                  }
                  
                  return {
                    id: generateProblemId(),
                    problemIndex: problem.code,
                    title: problem.title,
                    statement: '',
                    timeLimit: 2,
                    memoryLimit: 256,
                    tags: [],
                    tutorial: '',
                    difficulty: problem.difficulty || 'Medium',
                    testCases: []
                  };
                })
              );
              
              setProblems(formattedProblems);
              if (formattedProblems.length > 0) {
                setActiveProblem(formattedProblems[0].id);
              }
            }
          }
          
          setEditMode(true);
        } catch (error) {
          console.error('Error fetching contest for edit:', error);
          alert('Failed to load contest for editing');
          navigate('/contests');
        } finally {
          setLoadingContest(false);
        }
      };
      
      fetchContestForEdit();
    }
  }, [contestId, navigate]);

  const generateProblemId = () => {
    return `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleContestChange = (field, value) => {
    setContestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderTutorialTab = () => {
    const currentProblem = problems.find(p => p.id === activeProblem);
    
    if (!currentProblem) {
      return (
        <div className="bg-white rounded border border-gray-200 p-3">
          <div className="text-center py-8">
            <GraduationCap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No Problem Selected</h3>
            <p className="text-gray-600 text-xs">Please select a problem to add a tutorial.</p>
          </div>
        </div>
      );
    }

    const handleTutorialChange = (value) => {
      handleProblemChange(currentProblem.id, 'tutorial', value);
    };

    return (
      <div className="bg-white rounded border border-gray-200">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                Tutorial: {currentProblem.title}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Problem {currentProblem.problemIndex} • Supports Markdown, LaTeX, and images
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentProblem.tutorial ? currentProblem.tutorial.length : 0} chars
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-[300px]">
          {!showPreview ? (
            <textarea
              value={currentProblem.tutorial || ''}
              onChange={(e) => handleTutorialChange(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border-0 focus:ring-0 font-mono text-xs text-gray-900 resize-none focus:outline-none h-full min-h-[300px]"
              placeholder="Write your tutorial here... You can use Markdown formatting!"
            />
          ) : (
            <div className="w-full p-3 bg-white min-h-[300px] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="markdown-content">
                  <h1 className="text-sm font-bold mb-2">Tutorial Preview</h1>
                  <div className="border rounded p-2 bg-gray-50 min-h-[250px]">
                    {currentProblem.tutorial ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                          components={customComponents}
                        >
                          {currentProblem.tutorial}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 text-xs">
                        <GraduationCap className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p>No tutorial content yet. Switch to edit mode to write a tutorial.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Markdown + LaTeX</span>
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('problems')}
                className="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50"
              >
                Back to Problems
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveDraft = async () => {
    if (!contestData.title.trim()) {
      alert("Please enter a contest title before saving draft");
      return;
    }

    const formattedProblems = problems.map((problem) => ({
      index: problem.problemIndex || '',
      title: problem.title,
      statement: problem.statement,
      time_limit_seconds: parseFloat(problem.timeLimit) || 2,
      memory_limit_mb: parseInt(problem.memoryLimit) || 256,
      tags: problem.tags,
      difficulty: problem.difficulty || "Medium",
      tutorial: problem.tutorial || "",
      points: parseInt(problem.points) || 0,
      test_cases: problem.testCases.map((tc) => ({
        input: tc.input,
        output: tc.output,
        difficulty: problem.difficulty || null,
        explanation: tc.explanation || "",
        sample: true,
        hidden: tc.hidden || false
      })),
    }));

    const payload = {
      title: contestData.title,
      description: contestData.description || "",
      start_time: contestData.startTime ? contestData.startTime + ":00Z" : null,
      duration: parseFloat(contestData.duration) || 3.0,
      type: contestData.type,
      platform: contestData.platform,
      problems: formattedProblems,
      status: "draft",
      editorial_published: publishSettings.editorialPublished,
    };

    try {
      let url = `${BACKEND_URL}/contests/create-full/`;
      let method = "POST";
      
      if (editMode && contestId) {
        url = `${BACKEND_URL}/contests/${contestId}/update/`;
        method = "PATCH";
      }

      const response = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error:", data);
        alert("Failed to save draft. Check console.");
        return;
      }

      alert(editMode ? "Draft updated successfully!" : "Draft saved successfully!");
      
      if (!editMode && data.id) {
        navigate(`/contests/${data.id}/edit/`);
      }
      
    } catch (err) {
      console.error("Request failed:", err);
      alert("Could not reach server.");
    }
  };

  const handleProblemChange = (problemInternalId, field, value) => {
    if (field === 'problemIndex') {
      const newIndex = value.toUpperCase().trim();
      
      const isIndexTaken = problems.some(p => 
        p.problemIndex === newIndex && p.id !== problemInternalId
      );
      
      if (isIndexTaken) {
        alert(`Problem index "${newIndex}" is already taken!`);
        return;
      }
      
      setProblems(prev => prev.map(problem => 
        problem.id === problemInternalId ? { ...problem, problemIndex: newIndex } : problem
      ));
    } else {
      setProblems(prev => prev.map(problem => 
        problem.id === problemInternalId ? { ...problem, [field]: value } : problem
      ));
    }
  };

  const handleSettingChange = (field, value) => {
    setPublishSettings(prev => ({ ...prev, [field]: value }));
    if (publishErrors[field]) setPublishErrors(prev => ({ ...prev, [field]: '' }));
  };

  const predictDifficulty = async (problemId) => {
    try {
      setPredictingDifficulty(true);
      
      const problem = problems.find(p => p.id === problemId);
      if (!problem) {
        alert('Problem not found');
        return;
      }

      // Validate required fields
      if (!problem.statement || problem.statement.trim() === '') {
        alert('Please write a problem statement first');
        return;
      }

      // Prepare API request
      const requestData = {
        statement: problem.statement,
        tags: problem.tags || [],
        test_cases: (problem.testCases || []).map(tc => ({
          input: tc.input,
          output: tc.output
        })),
        title: problem.title || 'Untitled'
      };

      // Call prediction API
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/difficulty-prediction/predict/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success && data.prediction) {
        // Update problem difficulty with prediction
        handleProblemChange(problemId, 'difficulty', data.prediction.difficulty);
        
        // Show beautiful modal
        setPredictionResult(data.prediction);
        setShowPredictionModal(true);
      } else {
        alert('Failed to predict difficulty: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error predicting difficulty:', error);
      alert('Failed to predict difficulty. Please ensure the ML model is trained.');
    } finally {
      setPredictingDifficulty(false);
    }
  };

  const handleAddTesters = () => {
    const input = testInvites.trim();
    if (!input) {
      setPublishErrors(prev => ({ ...prev, testInvites: 'Please enter at least one tester email' }));
      return;
    }
    const emails = input.split(',').map(e => e.trim()).filter(e => e);
    const invalidEmails = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalidEmails.length > 0) {
      setPublishErrors(prev => ({ ...prev, testInvites: `Invalid email(s): ${invalidEmails.join(', ')}` }));
      return;
    }
    const newTesters = emails.map(email => ({ id: Date.now() + Math.random(), email, status: 'pending' }));
    setPublishSettings(prev => ({ ...prev, testers: [...prev.testers, ...newTesters] }));
    setTestInvites('');
  };

  const handleRemoveTester = id => {
    setPublishSettings(prev => ({ ...prev, testers: prev.testers.filter(t => t.id !== id) }));
  };

  const getEditorMode = (lang) => {
    switch(lang) {
      case 'cpp':
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

  const validateTestContest = () => {
    const newErrors = {};
    if (publishSettings.testContest) {
      if (publishSettings.testers.length === 0) newErrors.testInvites = 'Please enter at least one tester email';
      if (!publishSettings.testDuration || publishSettings.testDuration < 1) newErrors.testDuration = 'Please enter a valid test duration';
      if (!publishSettings.testStartTime) newErrors.testStartTime = 'Please select a start time';
    }
    setPublishErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublishContest = async (type) => {
    let payload;
    let url;
    let method;

    if (!contestData.title.trim()) {
      alert("Please enter a contest title");
      return;
    }

    if (!contestData.startTime) {
      alert("Please select a start time");
      return;
    }

    if (problems.length === 0) {
      alert("Please add at least one problem");
      return;
    }

    const invalidProblems = problems.filter(
      (p) => !p.problemIndex || !p.title.trim() || !p.statement.trim()
    );

    if (invalidProblems.length > 0) {
      alert("All problems must have an index, title, and statement");
      return;
    }

    if (type === "test") {
      payload = {
        test_start_time: publishSettings.testStartTime + ":00Z",
        testers: publishSettings.testers.map(t => t.email),
        duration: parseFloat(contestData.duration) || 3.0
      };

      url = `${BACKEND_URL}/contests/${contestId}/publish-test/`;
      method = "POST";
      
      try {
        const response = await fetch(url, {
          method: method,
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Server error:", data);
          alert(data.error || "Failed to publish test contest");
          return;
        }

        alert(`Contest published as test successfully!`);
        navigate("/contests");
        return;
      } catch (err) {
        console.error("Request failed:", err);
        alert("Could not reach server.");
        return;
      }
    }

    try {
      const formattedProblems = problems.map((problem) => ({
        index: problem.problemIndex || '',
        title: problem.title,
        statement: problem.statement,
        time_limit_seconds: parseFloat(problem.timeLimit) || 2,
        memory_limit_mb: parseInt(problem.memoryLimit) || 256,
        tags: problem.tags,
        difficulty: problem.difficulty || "Medium",
        tutorial: problem.tutorial || "",
        points: parseInt(problem.points) || 0,
        test_cases: problem.testCases.map((tc) => ({
          input: tc.input,
          output: tc.output,
          difficulty: problem.difficulty || null,
          explanation: tc.explanation || "",
          sample: true,
          hidden: tc.hidden || false
        })),
      }));

      if (editMode && contestId) {
        payload = {
          title: contestData.title,
          description: contestData.description || "",
          start_time: contestData.startTime + ":00Z",
          duration: parseFloat(contestData.duration) || 3.0,
          type: contestData.type,
          platform: contestData.platform,
          problems: formattedProblems,
          editorial_published: publishSettings.editorialPublished
        };
        
        if (type === "test") {
          payload.convert_to_test = true;
          payload.testers = publishSettings.testers.map(t => t.email);
          payload.testStartTime = publishSettings.testStartTime + ":00Z";
        }
        
        url = `${BACKEND_URL}/contests/${contestId}/publish/`;
        method = "POST";
      } else {
        payload = {
          title: contestData.title,
          description: contestData.description || "",
          start_time: contestData.startTime + ":00Z",
          duration: parseFloat(contestData.duration) || 3.0,
          type: contestData.type,
          platform: contestData.platform,
          problems: formattedProblems,
          status: type === "test" ? "test" : "upcoming",
          visibility: publishSettings.visibility,
          registration_required: publishSettings.registrationRequired,
          email_notifications: publishSettings.emailNotifications,
          leaderboard_public: publishSettings.leaderboardPublic,
          allow_practice: publishSettings.allowPractice,
          rating_changes: publishSettings.ratingChanges,
          editorial_published: publishSettings.editorialPublished
        };

        if (type === "test") {
          payload.testers = publishSettings.testers.map(t => t.email);
          payload.test_start_time = publishSettings.testStartTime + ":00Z";
          payload.test_duration = publishSettings.testDuration;
          payload.type = "test";
        }

        url = `${BACKEND_URL}/contests/create-full/`;
        method = "POST";
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error:", data);
        alert(data.error || "Failed to publish contest");
        return;
      }

      alert(`Contest ${type === "test" ? "published as test" : "published successfully"}!`);
      navigate("/contests");
    } catch (err) {
      console.error("Request failed:", err);
      alert("Could not reach server.");
    }
  };

  const addProblem = () => {
    const newProblem = {
      id: generateProblemId(),
      problemIndex: '',
      title: '',  
      statement: '',
      testCases: [],
      timeLimit: 2,
      memoryLimit: 256,
      tags: [],
      tutorial: '',
      difficulty: '',
      points: '',
      testResults: []
    };
    
    setProblems(prev => [...prev, newProblem]);
    setActiveProblem(newProblem.id);
  };

  const handleRunCode = async () => {
    if (isRunning) return; // Prevent multiple clicks
    
    if (!code.trim()) {
      alert('Please write some code before running.');
      return;
    }

    const currentProblem = problems.find(p => p.id === activeProblem);
    if (!currentProblem) return;

    if (!contestId) {
      alert('Please save the contest as draft first before testing code.');
      return;
    }

    if (!currentProblem.problemIndex) {
      alert('Please set a problem index (A, B, C, etc.) before testing code.');
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(
        `${BACKEND_URL}/contests/${contestId}/problems/${currentProblem.problemIndex}/run/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(runData)
        }
      );

      const data = await response.json();
      
      if (data.verdict === 'AC' || data.all_passed === true) {
        setCompilationStats({
          status: 'success',
          verdict: data.verdict || 'AC',
          time: data.execution_time || 0,
          memory: data.memory_used || 0,
          passed: data.passed_test_cases || data.total_test_cases || 0,
          total: data.total_test_cases || 0,
          testCaseOutputs: data.test_case_outputs || [],
          output: data.output || '',
          message: data.status || `All ${data.total_test_cases} test cases passed!`,
          type: 'run'
        });
      } else {
        setCompilationStats({
          status: data.verdict === 'CE' ? 'compile_error' : 'error',
          verdict: data.verdict || 'WA',
          time: data.execution_time || 0,
          memory: data.memory_used || 0,
          passed: data.passed_test_cases || 0,
          total: data.total_test_cases || 0,
          failedTestCase: data.failed_test_case || 0,
          testCaseOutputs: data.test_case_outputs || [],
          output: data.output || '',
          message: data.error_message ||
                   `${data.passed_test_cases || 0}/${data.total_test_cases || 0} test cases passed`,
          type: 'run'
        });
      }
      
      setProblems(prev => prev.map(problem => 
        problem.id === activeProblem 
          ? { ...problem, testResults: [data] }
          : problem
      ));
        
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

  const addTestCase = (problemId) => {
    const newTestCase = {
      id: Date.now(),
      input: '',
      output: '',
      explanation: '',
      hidden: false
    };
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, testCases: [...problem.testCases, newTestCase] }
        : problem
    ));
  };

  const removeTestCase = (problemId, testCaseId) => {
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, testCases: problem.testCases.filter(tc => tc.id !== testCaseId) }
        : problem
    ));
  };

  const handleDeleteProblem = (problemId) => {
    setProblems((prev) => {
      const newList = prev.filter((p) => p.id !== problemId);
      
      if (problemId === activeProblem) {
        setActiveProblem(newList.length > 0 ? newList[0].id : null);
      }
      
      return newList;
    });
  };

  const addTag = (problemId) => {
    if (newTag.trim()) {
      setProblems(prev => prev.map(problem => {
        if (problem.id === problemId) {
          if (problem.tags.includes(newTag.trim())) {
            alert('This tag is already added!');
            return problem;
          }
          return { ...problem, tags: [...problem.tags, newTag.trim()] };
        }
        return problem;
      }));
      setNewTag('');
    }
  };

  const removeTag = (problemId, tagIndex) => {
    setProblems(prev => prev.map(problem => 
      problem.id === problemId 
        ? { ...problem, tags: problem.tags.filter((_, index) => index !== tagIndex) }
        : problem
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActiveTab('publish');
  };

  if (loadingContest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xs">Loading contest for editing...</div>
      </div>
    );
  }

  const currentProblem = problems.find(p => p.id === activeProblem);

  const renderProblemsTab = () => (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded border border-gray-200">
        <div className="p-3 border-b border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contest Name
              </label>
              <input
                type="text"
                value={contestData.title}
                onChange={(e) => handleContestChange('title', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                placeholder="Enter contest name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={contestData.description}
                onChange={(e) => handleContestChange('description', e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                placeholder="Describe the contest..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={contestData.startTime}
                  onChange={(e) => handleContestChange('startTime', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={contestData.duration}
                  onChange={(e) => handleContestChange('duration', e.target.value)}
                  min="0.5"
                  step="0.5"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Participation Type
                </label>
                <select
                  value={contestData.type}
                  onChange={(e) => handleContestChange('type', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={contestData.platform}
                  onChange={(e) => handleContestChange('platform', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="IUT">IUT Platform</option>
                  <option value="codeforces">Codeforces</option>
                  <option value="codechef">CodeChef</option>
                  <option value="atcoder">AtCoder</option>
                  <option value="hackerrank">HackerRank</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {currentProblem && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {currentProblem.problemIndex ? `Problem ${currentProblem.problemIndex}` : 'New Problem'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tutorial');
                }}
                className="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 flex items-center gap-1"
              >
                <GraduationCap className="w-3 h-3" />
                Edit Tutorial
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Problem Index
                    </label>
                    <input
                      type="text"
                      value={currentProblem.problemIndex}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'problemIndex', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase text-xs"
                      placeholder="A, B, C, etc."
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use single letters (A-Z)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={currentProblem.title}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'title', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="Enter problem title"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Statement
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStatementPreview(!showStatementPreview)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                      >
                        <Eye className="w-3 h-3" />
                        {showStatementPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {!showStatementPreview ? (
                      <textarea
                        value={currentProblem.statement}
                        onChange={(e) => handleProblemChange(currentProblem.id, 'statement', e.target.value)}
                        rows={6}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                        placeholder="Enter problem statement... (Supports Markdown & LaTeX)"
                      />
                    ) : (
                      <div className="border border-gray-300 rounded p-2 bg-gray-50 min-h-[100px] overflow-auto">
                        <div className="prose prose-sm max-w-none">
                          {currentProblem.statement ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                              components={customComponents}
                            >
                              {currentProblem.statement}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-gray-500 italic text-xs">No statement content yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  {currentProblem.testCases.map(testCase => (
                    <div key={testCase.id} className="border border-gray-200 rounded p-2">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 text-xs">Test Case</h4>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={testCase.hidden || false}
                              onChange={(e) => {
                                const updatedTestCases = currentProblem.testCases.map(tc =>
                                  tc.id === testCase.id ? { ...tc, hidden: e.target.checked } : tc
                                );
                                handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                              }}
                              className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">Hidden</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTestCase(currentProblem.id, testCase.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Input
                          </label>

                          <div className="flex gap-1">
                            <textarea
                            value={testCase.input}
                            onChange={(e) => {
                              const updatedTestCases = currentProblem.testCases.map(tc =>
                                tc.id === testCase.id ? { ...tc, input: e.target.value } : tc
                              );
                              handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                            }}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                            placeholder="Input..."
                          />
                            <label className="cursor-pointer px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 flex items-center gap-1 text-xs">
                              
                          </div>
                          
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Expected Output
                          </label>
                          <textarea
                            value={testCase.output}
                            onChange={(e) => {
                              const updatedTestCases = currentProblem.testCases.map(tc =>
                                tc.id === testCase.id ? { ...tc, output: e.target.value } : tc
                              );
                              handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                            }}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                            placeholder="Expected output..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={testCase.explanation || ''}
                          onChange={(e) => {
                            const updatedTestCases = currentProblem.testCases.map(tc =>
                              tc.id === testCase.id ? { ...tc, explanation: e.target.value } : tc
                            );
                            handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
                          }}
                          rows={1}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          placeholder="Explain..."
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTestCase(currentProblem.id)}
                    className="w-full border border-dashed border-gray-300 rounded py-2 text-gray-600 hover:text-gray-800 hover:border-gray-400 text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Test Case
                  </button>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Time Limit (s)
                    </label>
                    <input
                      type="number"
                      value={currentProblem.timeLimit}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'timeLimit', e.target.value)}
                      min="0.1"
                      step="0.1"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Memory Limit (MB)
                    </label>
                    <input
                      type="number"
                      value={currentProblem.memoryLimit}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'memoryLimit', e.target.value)}
                      min="16"
                      step="16"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Difficulty
                      </label>
                      <button
                        type="button"
                        onClick={() => predictDifficulty(currentProblem.id)}
                        disabled={predictingDifficulty}
                        className="px-2 py-0.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Predict difficulty using AI"
                      >
                        {predictingDifficulty ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Predicting...
                          </>
                        ) : (
                          <>
                            <Settings className="w-3 h-3" />
                            Auto Predict
                          </>
                        )}
                      </button>
                    </div>
                    <select
                      value={currentProblem.difficulty || 'Medium'}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'difficulty', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="">None</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      value={currentProblem.points || ''}
                      onChange={(e) => handleProblemChange(currentProblem.id, 'points', e.target.value)}
                      min="0"
                      step="1"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="Points"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <h3 className="font-semibold text-gray-900 text-xs">Problem Tags</h3>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {currentProblem.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(currentProblem.id, index)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  >
                    <option value="">Select a tag...</option>
                    {predefinedTags
                      .filter(tag => !currentProblem.tags.includes(tag))
                      .map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))
                    }
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (newTag.trim()) {
                        addTag(currentProblem.id);
                      }
                    }}
                    className="px-2 py-1.5 bg-blue-800 text-white rounded hover:bg-blue-900 text-xs"
                    disabled={!newTag.trim()}
                  >
                    Add
                  </button>
                </div>
                {predefinedTags.filter(tag => !currentProblem.tags.includes(tag)).length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">All available tags added.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-xs">Code Testing</h3>
                  <div className="flex items-center gap-1">
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="cpp">C++ 17</option>
                      <option value="python">Python 3</option>
                      <option value="java">Java</option>
                      <option value="c">C</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                </div>
                
                <div className="border border-gray-300 rounded overflow-hidden mb-2">
                  <div className="h-48 bg-gray-900">
                    <AceEditor
                      mode={getEditorMode(language)}
                      theme="monokai"
                      value={code}
                      onChange={setCode}
                      name="code-editor"
                      height="100%"
                      width="100%"
                      fontSize={12}
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
                      placeholder={`// Write your ${language.toUpperCase()} code here...`}
                    />
                  </div>
                  
                  <div className="bg-gray-800 px-2 py-1 border-t border-gray-700 flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Language: {language === 'cpp' ? 'C++ 17' : 
                                language === 'java' ? 'Java' : 
                                language === 'python' ? 'Python 3' : 'C'}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([code], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `test_code.${language}`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2 py-0.5 border border-gray-600 rounded text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-0.5"
                      >
                        <Download className="w-2.5 h-2.5" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 ${
                          isRunning 
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isRunning ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Play className="w-2.5 h-2.5" />
                        )}
                        {isRunning ? 'Running...' : 'Run Code'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {compilationStats && (
                  <div className="border-t border-gray-200 mt-2">
                    <div className={`p-2 ${compilationStats.status === 'running' ? 'bg-blue-50' : compilationStats.status === 'success' ? 'bg-green-50' : compilationStats.status === 'compile_error' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-1">
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
                          <span className="text-xs px-1 py-0.5 bg-white rounded border">
                            {compilationStats.type === 'run' ? 'Run' : 'Submit'}
                          </span>
                        </div>
                        <button 
                          onClick={() => setCompilationStats(null)}
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs">
                          {compilationStats.message}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                          <div className="bg-white p-1 rounded border">
                            <div className="text-xs text-gray-600">Verdict</div>
                            <div className={`font-medium text-xs ${compilationStats.verdict === 'AC' ? 'text-green-600' : compilationStats.verdict === 'WA' ? 'text-red-600' : 'text-gray-700'}`}>
                              {compilationStats.verdict || 'N/A'}
                            </div>
                          </div>
                          
                          {compilationStats.time > 0 && (
                            <div className="bg-white p-1 rounded border">
                              <div className="text-xs text-gray-600">Time</div>
                              <div className="font-medium text-xs text-gray-900">
                                {compilationStats.time} ms
                              </div>
                            </div>
                          )}
                          
                          {compilationStats.memory > 0 && (
                            <div className="bg-white p-1 rounded border">
                              <div className="text-xs text-gray-600">Memory</div>
                              <div className="font-medium text-xs text-gray-900">
                                {compilationStats.memory > 1024 
                                  ? `${(compilationStats.memory / 1024).toFixed(1)} MB` 
                                  : `${compilationStats.memory} KB`}
                              </div>
                            </div>
                          )}
                          
                          {compilationStats.passed !== undefined && (
                            <div className="bg-white p-1 rounded border">
                              <div className="text-xs text-gray-600">Tests</div>
                              <div className="font-medium text-xs text-gray-900">
                                {compilationStats.passed}/{compilationStats.total}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {compilationStats.failedTestCase && (
                          <div className="mt-1 text-xs">
                            <span className="text-gray-600">Failed on test case:</span>
                            <span className="font-medium ml-1">#{compilationStats.failedTestCase}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('publish')}
              className="w-full sm:w-auto px-4 py-1.5 bg-blue-800 text-white rounded hover:bg-blue-900 text-xs font-medium flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Proceed to Publish
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  const renderPublishTab = () => (
    <div className="bg-white rounded border border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div><div className="text-gray-600 text-xs">Title</div><div className="font-medium text-gray-900 truncate">{contestData.title || 'Untitled'}</div></div>
            <div><div className="text-gray-600 text-xs">Problems</div><div className="font-medium text-gray-900">{problems.length}</div></div>
            <div><div className="text-gray-600 text-xs">Duration</div><div className="font-medium text-gray-900">{contestData.duration}h</div></div>
            <div><div className="text-gray-600 text-xs">Start</div><div className="font-medium text-gray-900 truncate">{contestData.startTime || 'Not set'}</div></div>
            <div><div className="text-gray-600 text-xs">Type</div><div className="font-medium text-gray-900">{contestData.type}</div></div>
          </div>
        </div>

        <div className="mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
            <div className="flex items-start gap-2">
              <div>
                <h4 className="font-medium text-amber-900 text-xs mb-0.5">Test Contest Feature</h4>
                <p className="text-amber-800 text-xs">
                  Invite trusted users to test your contest before final publication.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium text-gray-900 text-xs">Enable Test Contest</div>
                  <div className="text-gray-600 text-xs">Publish as test version</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishSettings.testContest}
                  onChange={(e) => handleSettingChange('testContest', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {publishSettings.testContest && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invite Testers ({publishSettings.testers.length})
                  </label>
                  {publishSettings.testers.length > 0 && (
                    <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex flex-wrap gap-1">
                        {publishSettings.testers.map(t => (
                          <div key={t.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                            <span className="text-xs font-medium text-blue-800 truncate max-w-[100px]">{t.email}</span>
                            <button type="button" onClick={() => handleRemoveTester(t.id)} className="ml-0.5 text-blue-600 hover:text-blue-800">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={testInvites}
                      onChange={e => { setTestInvites(e.target.value); if(publishErrors.testInvites) setPublishErrors(prev => ({ ...prev, testInvites: '' })); }}
                      placeholder="tester@example.com"
                      className={`flex-1 px-2 py-1 border ${publishErrors.testInvites ? 'border-red-500' : 'border-gray-300'} rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs`}
                    />
                    <button type="button" onClick={handleAddTesters} className="px-2 py-1 bg-blue-800 text-white rounded hover:bg-blue-900 flex items-center gap-1 text-xs">
                      <UserPlus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {publishErrors.testInvites && <p className="text-red-500 text-xs mt-0.5">{publishErrors.testInvites}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Test Start Time</label>
                  <input
                    type="datetime-local"
                    value={publishSettings.testStartTime}
                    onChange={e => handleSettingChange('testStartTime', e.target.value)}
                    className={`w-full px-2 py-1 border ${publishErrors.testStartTime ? 'border-red-500' : 'border-gray-300'} rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs`}
                  />
                  {publishErrors.testStartTime && <p className="text-red-500 text-xs mt-0.5">{publishErrors.testStartTime}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-xs mb-2">Visibility & Access</h3>
          <div className="space-y-2">
            {[
              { label: 'Contest Visibility', icon: Globe, field: 'visibility', type: 'select', options: ['public','invite'], desc: 'Who can see and join' },
              { label: 'Registration Required', icon: Lock, field: 'registrationRequired', type: 'checkbox', desc: 'Must register before participating' },
              { label: 'Public Leaderboard', icon: Eye, field: 'leaderboardPublic', type: 'checkbox', desc: 'Show rankings to all' },
              { label: 'Email Notifications', icon: Mail, field: 'emailNotifications', type: 'checkbox', desc: 'Send emails to participants' },
              { label: 'Rating Changes', icon: Shield, field: 'ratingChanges', type: 'checkbox', desc: 'Update user ratings' },
              { label: 'Publish Editorial', icon: FileText, field: 'editorialPublished', type: 'checkbox', desc: 'Make solutions available' },
              { label: 'Allow Practice', icon: HelpCircle, field: 'allowPractice', type: 'checkbox', desc: 'Practice after contest ends' },
            ].map(item => (
              <div key={item.field} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900 text-xs">{item.label}</div>
                    <div className="text-gray-600 text-xs">{item.desc}</div>
                  </div>
                </div>
                {item.type === 'checkbox' ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={publishSettings[item.field]} onChange={e => handleSettingChange(item.field, e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                ) : (
                  <select value={publishSettings[item.field]} onChange={e => handleSettingChange(item.field, e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs">
                    {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="w-3 h-3" />
              <span>Review all settings before publishing</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('problems')}
              className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium"
            >
              ← Back to Edit
            </button>
            {publishSettings.testContest && (
              <button type="button" onClick={() => handlePublishContest('test')} 
              className="w-full sm:w-auto px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1 text-xs">
                Publish as Test
              </button>
            )}
            <button type="button" onClick={() => handlePublishContest('final')} className="w-full sm:w-auto px-3 py-1.5 bg-blue-800 text-white rounded hover:bg-blue-900 flex items-center gap-1 text-xs">
              <Check className="w-3 h-3" />
              Publish Contest
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">              
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <h1 className="text-sm font-bold">{editMode ? 'Edit Contest' : 'Create Contest'}</h1>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'problems' ? 'bg-blue-800 text-blue-100' : activeTab === 'tutorial' ? 'bg-green-800 text-green-100' : 'bg-purple-800 text-purple-100'}`}>
                  {activeTab === 'problems' ? (editMode ? 'Editing' : 'Creating') : activeTab === 'tutorial' ? 'Tutorial' : 'Publishing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Sidebar */}
          <div className={`lg:col-span-1 transition-all duration-300 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded border border-gray-200">
              <div className="p-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-xs">Problems</h3>
              </div>
              <div className="p-1 max-h-[400px] overflow-y-auto">
                {problems.map(problem => (
                  <div key={problem.id} className="relative group">
                    <button
                      onClick={() => {
                        setActiveProblem(problem.id);
                        setActiveTab('problems');
                      }}
                      className={`w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors duration-200 mb-0.5 ${
                        activeProblem === problem.id
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${activeProblem === problem.id ? 'bg-blue-800 text-white' : 'bg-gray-100'}`}>
                        {problem.problemIndex || ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {problem.title || 'Untitled Problem'}
                        </div>
                        {problem.tutorial && problem.tutorial.trim() && (
                          <div className="text-xs text-green-600 mt-0.5 flex items-center gap-0.5">
                            <GraduationCap className="w-2.5 h-2.5" />
                            Has tutorial
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteProblem(problem.id)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-600 hover:text-red-800 p-0.5"
                      title="Delete Problem"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    addProblem();
                    setActiveTab('problems');
                  }}
                  className="w-full flex items-center gap-1 p-1.5 text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-medium">Add Problem</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="p-2 border-t border-gray-200">
                <div className="space-y-1">
                  <button 
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 flex items-center justify-center gap-1">
                    <Save className="w-3 h-3" />
                    Save Draft
                  </button>

                  {currentProblem && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('tutorial');
                      }}
                      className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <GraduationCap className="w-3 h-3" />
                      Edit Tutorial
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('publish')}
                    className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Publish Contest
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-3">
            {activeTab === 'problems' ? renderProblemsTab() : 
             activeTab === 'tutorial' ? renderTutorialTab() : 
             renderPublishTab()}
          </div>
        </div>
      </div>

      {/* Prediction Result Modal */}
      {showPredictionModal && predictionResult && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-blue-900 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-800 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">AI Prediction Result</h3>
                  <p className="text-blue-200 text-xs">Powered by {predictionResult.model_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPredictionModal(false)}
                className="text-white hover:bg-blue-800 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Predicted Difficulty */}
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Predicted Difficulty</p>
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-2xl ${
                  predictionResult.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  predictionResult.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                  {predictionResult.difficulty}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < Math.round(predictionResult.confidence * 5)
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-700 font-semibold text-sm">
                    {(predictionResult.confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>
              </div>

              {/* Probability Breakdown */}
              <div className="space-y-3">
                <p className="text-gray-700 font-semibold text-sm">Probability Breakdown</p>
                
                {['Easy', 'Medium', 'Hard'].map((level) => {
                  const probability = predictionResult.probabilities[level];
                  const percentage = (probability * 100).toFixed(1);
                  const color = level === 'Easy' ? 'green' : level === 'Medium' ? 'yellow' : 'red';
                  
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">{level}</span>
                        <span className="font-semibold text-gray-900">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            level === 'Easy' ? 'bg-green-600' :
                            level === 'Medium' ? 'bg-yellow-600' :
                            'bg-red-600'
                          } transition-all duration-500 ease-out`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">Difficulty has been automatically set</p>
                  <p className="text-blue-700">You can still manually change it from the dropdown if needed.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowPredictionModal(false)}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default CreateContest;
