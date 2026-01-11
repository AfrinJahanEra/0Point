// CreateContest.jsx - Fix the tutorial section
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

const CreateContest = () => {
  const navigate = useNavigate();
  const { contestId } = useParams();
  const [activeProblem, setActiveProblem] = useState(null);
  const [compilationStats, setCompilationStats] = useState(null);
  // Add this with other state declarations
const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('problems'); // 'problems', 'tutorial', or 'publish'
  const [contestData, setContestData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 3,
    type: 'individual',
    platform: 'IUT'
  });
  // Add this with other state declarations
const [code, setCode] = useState(``);
const [language, setLanguage] = useState('cpp');
const [showStatementPreview, setShowStatementPreview] = useState(false);

  const [problems, setProblems] = useState([]);
  const [newTag, setNewTag] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [loadingContest, setLoadingContest] = useState(false);

  // Remove local tutorialContent state and use problem.tutorial directly
  const [showPreview, setShowPreview] = useState(false);

  // Publish settings
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

  const customComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-blue-900 border-b border-blue-200 pb-2">
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
    <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline">
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


useEffect(() => {
  // If contestId exists, we're in edit mode
  if (contestId) {
    const fetchContestForEdit = async () => {
      setLoadingContest(true);
      try {
        const response = await fetch(`http://localhost:8000/contests/${contestId}/`, {
          headers: { 
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch contest');
        }
        
        const contestData = await response.json();
        
        // Populate contest data
        setContestData({
          title: contestData.title || '',
          description: contestData.description || '',
          startTime: contestData.start_time ? contestData.start_time.replace('Z', '') : '',
          duration: contestData.duration || 3,
          type: contestData.type || 'individual',
          platform: contestData.platform || 'IUT'
        });
        
        // Now fetch problems for the contest
        const problemsResponse = await fetch(`http://localhost:8000/contests/${contestId}/problems/`, {
          headers: { 
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
          }
        });
        
        if (problemsResponse.ok) {
          const problemsData = await problemsResponse.json();
          
          // Transform problems from API to match our format
          if (problemsData.problems && problemsData.problems.length > 0) {
            const formattedProblems = await Promise.all(
              problemsData.problems.map(async (problem, index) => {
                // Fetch detailed problem data for test cases AND tutorial
                const problemDetailResponse = await fetch(
                  `http://localhost:8000/contests/${contestId}/problems/${problem.code}/`,
                  {
                    headers: { 
                      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
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
                    tutorial: problemDetail.tutorial || '', // IMPORTANT: Load tutorial from backend
                    difficulty: problemDetail.difficulty || 'Medium',
                    testCases: problemDetail.test_cases?.map((tc, tcIndex) => ({
                      id: Date.now() + tcIndex,
                      input: tc.input || '',
                      output: tc.output || '',
                      explanation: tc.explanation || ''
                    })) || []
                  };
                }
                
                // Fallback if problem detail fetch fails
                return {
                  id: generateProblemId(),
                  problemIndex: problem.code,
                  title: problem.title,
                  statement: '',
                  timeLimit: 2,
                  memoryLimit: 256,
                  tags: [],
                  tutorial: '', // Empty tutorial if fetch fails
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

  // Function to generate a unique problem ID for internal use
  const generateProblemId = () => {
    return `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleContestChange = (field, value) => {
    setContestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // FIXED: renderTutorialTab function
const renderTutorialTab = () => {
  const currentProblem = problems.find(p => p.id === activeProblem);
  
  if (!currentProblem) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Problem Selected</h3>
          <p className="text-gray-600">Please select a problem to add a tutorial.</p>
        </div>
      </div>
    );
  }

  const handleTutorialChange = (value) => {
    handleProblemChange(currentProblem.id, 'tutorial', value);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tutorial Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">
              Tutorial: {currentProblem.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Problem {currentProblem.problemIndex} • Supports Markdown, LaTeX, and images
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {currentProblem.tutorial ? currentProblem.tutorial.length : 0} characters
            </span>
          </div>
        </div>
      </div>

      {/* Tutorial Editor Area */}
      <div className="min-h-[500px]">
        {!showPreview ? (
          <textarea
            value={currentProblem.tutorial || ''}
            onChange={(e) => handleTutorialChange(e.target.value)}
            rows={20}
            className="w-full px-6 py-4 border-0 focus:ring-0 font-mono text-sm text-gray-900 resize-none focus:outline-none h-full min-h-[500px]"
            placeholder="Write your tutorial here... You can use Markdown formatting!"
          />
        ) : (
          <div className="w-full p-6 bg-white min-h-[500px] overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <div className="markdown-content">
                <h1 className="text-xl font-bold mb-4">Tutorial Preview</h1>
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
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
  <div className="text-center py-20 text-gray-500">
    <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No tutorial content yet. Switch to edit mode to write a tutorial.</p>
  </div>
)}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Note:</strong> This is a basic preview. For full Markdown rendering, you would need to install and use a Markdown renderer like <code>react-markdown</code>.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tutorial Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Markdown + LaTeX supported</span>
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Code blocks with syntax highlighting</span>
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('problems')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200"
            >
              Back to Problems
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Function to save draft (update if in edit mode)

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
  points: parseInt(problem.points) || 0, // Add this line
  test_cases: problem.testCases.map((tc) => ({
    input: tc.input,
    output: tc.output,
    difficulty: problem.difficulty || null,
    explanation: tc.explanation || "",
    sample: true,
    hidden: tc.hidden || false // Add this line
  })),
}));

  const payload = {
    title: contestData.title,
    description: contestData.description || "",
    start_time: contestData.startTime ? contestData.startTime + ":00Z" : null, // This can be null for draft
    duration: parseFloat(contestData.duration) || 3.0,
    type: contestData.type,
    platform: contestData.platform,
    problems: formattedProblems,
    status: "draft",
    editorial_published: publishSettings.editorialPublished,
  };

  console.log("DEBUG: Payload being sent:", JSON.stringify(payload, null, 2));

  try {
    let url = "http://localhost:8000/contests/create-full/";
    let method = "POST";
    
    if (editMode && contestId) {
      url = `http://localhost:8000/contests/${contestId}/update/`;
      method = "PATCH";  // Or "PUT" depending on your backend
    }

    const response = await fetch(url, {
      method: method,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
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
    
    // If this was a new contest creation (not edit mode), navigate to the new contest
    if (!editMode && data.id) {
      navigate(`/contests/${data.id}/edit/`);
    }
    
  } catch (err) {
    console.error("Request failed:", err);
    alert("Could not reach server.");
  }
};

  const handleProblemChange = (problemInternalId, field, value) => {
    // If changing the problem index (the display letter)
    if (field === 'problemIndex') {
      const newIndex = value.toUpperCase().trim();
      
      // Check if index is already taken by another problem
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

  // Publish settings handlers
  const handleSettingChange = (field, value) => {
    setPublishSettings(prev => ({ ...prev, [field]: value }));
    if (publishErrors[field]) setPublishErrors(prev => ({ ...prev, [field]: '' }));
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

  // Validate contest data
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

  // Validate required fields for test contest
  if (type === "test") {
    // ✅ Use the already-declared variables
    payload = {
      test_start_time: publishSettings.testStartTime + ":00Z",
      testers: publishSettings.testers.map(t => t.email),
      duration: parseFloat(contestData.duration) || 3.0
    };

    url = `http://localhost:8000/contests/${contestId}/publish-test/`;
    method = "POST";
    
    // ✅ If using the new test endpoint, skip the rest of the function
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
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
      return; // Exit the function here
    } catch (err) {
      console.error("Request failed:", err);
      alert("Could not reach server.");
      return;
    }
  }


  try {
    // Format problems (common for both edit and create modes)
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
      // EDIT MODE: Send COMPLETE contest data including problems
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
      
      url = `http://localhost:8000/contests/${contestId}/publish/`;
      method = "POST";
    } else {
      // CREATE NEW MODE: Send full contest data
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

      // Add test contest data if applicable
      if (type === "test") {
        payload.testers = publishSettings.testers.map(t => t.email);
        payload.test_start_time = publishSettings.testStartTime + ":00Z";
        payload.test_duration = publishSettings.testDuration;
        payload.type = "test";
      }

      url = "http://localhost:8000/contests/create-full/";
      method = "POST";
    }

    console.log("Publishing contest:", payload);

    const response = await fetch(url, {
      method: method,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY"
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
      id: generateProblemId(), // Internal unique ID
      problemIndex: '', // Empty index by default
      title: '',  
      statement: '',
      testCases: [],
      timeLimit: 2,
      memoryLimit: 256,
      tags: [],
      tutorial: '', // Initialize with empty tutorial
      difficulty: '',
      points: '', // Add this line
      testResults: [] // Add this
    };
    
    setProblems(prev => [...prev, newProblem]);
    setActiveProblem(newProblem.id);
  };

const handleRunCode = async () => {
  if (!code.trim()) {
    alert('Please write some code before running.');
    return;
  }

  const currentProblem = problems.find(p => p.id === activeProblem);
  if (!currentProblem) return;

  // Check if we're in edit mode and have contestId
  if (!contestId) {
    alert('Please save the contest as draft first before testing code.');
    return;
  }

  // Check if problem has an index
  if (!currentProblem.problemIndex) {
    alert('Please set a problem index (A, B, C, etc.) before testing code.');
    return;
  }

  try {
    const runData = {
      language: language,
      code: code,
    };

    console.log('Running code for problem:', currentProblem.problemIndex);
    
    // Set loading state
    setCompilationStats({
      status: 'running',
      message: 'Running against all test cases...',
      type: 'run'
    });
    
    const response = await fetch(
      `http://localhost:8000/contests/${contestId}/problems/${currentProblem.problemIndex}/run/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY'
        },
        body: JSON.stringify(runData)
      }
    );

    const data = await response.json();
    console.log('Run response:', data);
    
    // Update compilation stats based on actual API response
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
    
    // Also update testResults for backward compatibility
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

const addTestCase = (problemId) => {
  const newTestCase = {
    id: Date.now(),
    input: '',
    output: '',
    explanation: '',
    hidden: false // Add this line
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
      
      // Update active problem
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
        // Check if tag already exists
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
    // This is now handled by handlePublishContest
    setActiveTab('publish');
  };

  if (loadingContest) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading contest for editing...</div>
    </div>
  );
}

  const currentProblem = problems.find(p => p.id === activeProblem);

  const renderProblemsTab = () => (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Contest Settings */}
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Contest Name
              </label>
              <input
                type="text"
                value={contestData.title}
                onChange={(e) => handleContestChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter contest name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={contestData.description}
                onChange={(e) => handleContestChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the contest..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={contestData.startTime}
                  onChange={(e) => handleContestChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={contestData.duration}
                  onChange={(e) => handleContestChange('duration', e.target.value)}
                  min="0.5"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Participation Type
                </label>
                <select
                  value={contestData.type}
                  onChange={(e) => handleContestChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                  <option value="both">Both Individual & Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={contestData.platform}
                  onChange={(e) => handleContestChange('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Problem Editor */}
        {currentProblem && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentProblem.problemIndex ? `Problem ${currentProblem.problemIndex}` : 'New Problem'}
              </h2>
              {/* Tutorial quick link */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tutorial');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                Edit Tutorial
              </button>
            </div>
            <div className="space-y-6">
              {/* Problem Statement */}
<div>
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Problem Index
      </label>
      <input
        type="text"
        value={currentProblem.problemIndex}
        onChange={(e) => handleProblemChange(currentProblem.id, 'problemIndex', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
        placeholder="A, B, C, etc."
      />
      <p className="text-xs text-gray-500 mt-1">
        Use single letters (A-Z) or multiple letters (AA, AB, etc.)
      </p>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Title
      </label>
      <input
        type="text"
        value={currentProblem.title}
        onChange={(e) => handleProblemChange(currentProblem.id, 'title', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter problem title"
      />
    </div>
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-gray-700">
          Statement
        </label>
        <button
          type="button"
          onClick={() => setShowStatementPreview(!showStatementPreview)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          {showStatementPreview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {!showStatementPreview ? (
        <textarea
          value={currentProblem.statement}
          onChange={(e) => handleProblemChange(currentProblem.id, 'statement', e.target.value)}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
          placeholder="Enter problem statement... (Supports Markdown & LaTeX)"
        />
      ) : (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[200px] overflow-auto">
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
              <p className="text-gray-500 italic">No statement content yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
</div>

{/* Test Cases */}
<div>
  <div className="space-y-4">
    {currentProblem.testCases.map(testCase => (
      <div key={testCase.id} className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
          <h4 className="font-medium text-gray-900">Test Case</h4>
          <label className="flex items-center gap-2">
            <input
            type="checkbox"
            checked={testCase.hidden || false}
            onChange={(e) => {
              const updatedTestCases = currentProblem.testCases.map(tc =>
                tc.id === testCase.id ? { ...tc, hidden: e.target.checked } : tc
              );
              handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
            }}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">Hidden</span>
        </label>
      </div>
          <button
            type="button"
            onClick={() => removeTestCase(currentProblem.id, testCase.id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Input
            </label>
            <textarea
              value={testCase.input}
              onChange={(e) => {
                const updatedTestCases = currentProblem.testCases.map(tc =>
                  tc.id === testCase.id ? { ...tc, input: e.target.value } : tc
                );
                handleProblemChange(currentProblem.id, 'testCases', updatedTestCases);
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              placeholder="Enter test case input..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
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
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
              placeholder="Enter expected output..."
            />
          </div>
        </div>
        {/* Explanation Field - OPTIONAL */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
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
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
            placeholder="Explain the test case (optional)..."
          />
        </div>
      </div>
    ))}
    <button
      type="button"
      onClick={() => addTestCase(currentProblem.id)}
      className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-colors duration-200 flex items-center justify-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Add Test Case
    </button>
  </div>
</div>


<div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Time Limit (s)
      </label>
      <input
        type="number"
        value={currentProblem.timeLimit}
        onChange={(e) => handleProblemChange(currentProblem.id, 'timeLimit', e.target.value)}
        min="0.1"
        step="0.1"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Memory Limit (MB)
      </label>
      <input
        type="number"
        value={currentProblem.memoryLimit}
        onChange={(e) => handleProblemChange(currentProblem.id, 'memoryLimit', e.target.value)}
        min="16"
        step="16"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Difficulty
      </label>
      <select
        value={currentProblem.difficulty || 'Medium'}
        onChange={(e) => handleProblemChange(currentProblem.id, 'difficulty', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">None</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Points
      </label>
      <input
        type="number"
        value={currentProblem.points || ''}
        onChange={(e) => handleProblemChange(currentProblem.id, 'points', e.target.value)}
        min="0"
        step="1"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Points"
      />
    </div>
  </div>
</div>



{/* Tags - Dropdown Version */}
<div>
  <div className="flex items-center gap-2 mb-3">
    <h3 className="font-semibold text-gray-900">Problem Tags</h3>
  </div>
  <div className="flex flex-wrap gap-2 mb-3">
    {currentProblem.tags.map((tag, index) => (
      <span
        key={index}
        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
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
  <div className="flex gap-2">
    <select
      value={newTag}
      onChange={(e) => setNewTag(e.target.value)}
      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select a tag...</option>
      {predefinedTags
        .filter(tag => !currentProblem.tags.includes(tag)) // Only show tags not already added
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
      className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200"
      disabled={!newTag.trim()}
    >
      Add
    </button>
  </div>
  {predefinedTags.filter(tag => !currentProblem.tags.includes(tag)).length === 0 && (
    <p className="text-xs text-gray-500 mt-2">All available tags have been added to this problem.</p>
  )}
</div>

{/* Code Editor Section */}
<div>
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold text-gray-900">Code Testing</h3>
    <div className="flex items-center gap-2">
      <select 
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="cpp">C++ 17</option>
        <option value="python">Python 3</option>
        <option value="java">Java</option>
        <option value="c">C</option>
        <option value="javascript">JavaScript</option>
      </select>
    </div>
  </div>
  
  {/* Code Editor */}
  <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
    <div className="h-64 bg-gray-900">
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
    
    <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex justify-between items-center">

      <div className="text-xs text-gray-400">
        Language: {language === 'cpp' ? 'C++ 17' : 
                  language === 'java' ? 'Java' : 
                  language === 'python' ? 'Python 3' : 'C'}
      </div>

      <div className="flex items-center gap-2">
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
          className="px-3 py-1 border border-gray-600 rounded text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          Download
        </button>
        <button
          type="button"
          onClick={handleRunCode}
          className="px-4 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          Run Code
        </button>
      </div>
    </div>
  </div>
  
  {/* Test Results */}

{compilationStats && (
  <div className="border-t border-gray-200 mt-4">
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
        
        {/* Output section - update to show all test cases */}
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
      </div>
    </div>
  </div>
)}

</div>

            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('publish')}
              className="w-full sm:w-auto px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200 font-semibold flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Proceed to Publish
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  const renderPublishTab = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Contest Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div><div className="text-gray-600">Title</div><div className="font-medium text-gray-900">{contestData.title || 'Untitled'}</div></div>
            <div><div className="text-gray-600">Problems</div><div className="font-medium text-gray-900">{problems.length} problems</div></div>
            <div><div className="text-gray-600">Duration</div><div className="font-medium text-gray-900">{contestData.duration} hours</div></div>
            <div><div className="text-gray-600">Start Time</div><div className="font-medium text-gray-900">{contestData.startTime || 'Not set'}</div></div>
            <div><div className="text-gray-600">Type</div><div className="font-medium text-gray-900">{contestData.type}</div></div>
          </div>
        </div>

        {/* Test Contest Section */}
        <div className="mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <TestTube className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Test Contest Feature</h4>
                <p className="text-amber-800 text-xs">
                  Invite trusted users to test your contest before final publication.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TestTube className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">Enable Test Contest</div>
                  <div className="text-xs text-gray-600">Publish as test version for selected users</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishSettings.testContest}
                  onChange={(e) => handleSettingChange('testContest', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {publishSettings.testContest && (
              <div className="space-y-4 pl-8 border-l-2 border-gray-200">
                {/* Testers */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Invite Testers ({publishSettings.testers.length} added)
                  </label>
                  {publishSettings.testers.length > 0 && (
                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {publishSettings.testers.map(t => (
                          <div key={t.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                            <span className="text-xs font-medium text-blue-800">{t.email}</span>
                            <button type="button" onClick={() => handleRemoveTester(t.id)} className="ml-1 text-blue-600 hover:text-blue-800">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testInvites}
                      onChange={e => { setTestInvites(e.target.value); if(publishErrors.testInvites) setPublishErrors(prev => ({ ...prev, testInvites: '' })); }}
                      placeholder="tester1@example.com, tester2@example.com"
                      className={`flex-1 px-3 py-2 border ${publishErrors.testInvites ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <button type="button" onClick={handleAddTesters} className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  {publishErrors.testInvites && <p className="text-red-500 text-xs mt-1">{publishErrors.testInvites}</p>}
                </div>

                {/* Start Time & Duration */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Test Start Time</label>
                  <input
                    type="datetime-local"
                    value={publishSettings.testStartTime}
                    onChange={e => handleSettingChange('testStartTime', e.target.value)}
                    className={`w-full px-3 py-2 border ${publishErrors.testStartTime ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {publishErrors.testStartTime && <p className="text-red-500 text-xs mt-1">{publishErrors.testStartTime}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visibility & Access */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Visibility & Access</h3>
          <div className="space-y-4">
            {[
              { label: 'Contest Visibility', icon: Globe, field: 'visibility', type: 'select', options: ['public','invite'], desc: 'Who can see and join the contest' },
              { label: 'Registration Required', icon: Lock, field: 'registrationRequired', type: 'checkbox', desc: 'Users must register before participating' },
              { label: 'Public Leaderboard', icon: Eye, field: 'leaderboardPublic', type: 'checkbox', desc: 'Show rankings to all participants' },
              { label: 'Email Notifications', icon: Mail, field: 'emailNotifications', type: 'checkbox', desc: 'Send emails to registered participants' },
              { label: 'Rating Changes', icon: Shield, field: 'ratingChanges', type: 'checkbox', desc: 'Update user ratings after contest' },
              { label: 'Publish Editorial', icon: FileText, field: 'editorialPublished', type: 'checkbox', desc: 'Make solution explanations available' },
              { label: 'Allow Practice', icon: HelpCircle, field: 'allowPractice', type: 'checkbox', desc: 'Users can practice after contest ends' },
            ].map(item => (
              <div key={item.field} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-600">{item.desc}</div>
                  </div>
                </div>
                {item.type === 'checkbox' ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={publishSettings[item.field]} onChange={e => handleSettingChange(item.field, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                ) : (
                  <select value={publishSettings[item.field]} onChange={e => handleSettingChange(item.field, e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>Review all settings before publishing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('problems')}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold flex items-center gap-2"
            >
              ← Back to Edit
            </button>
            {publishSettings.testContest && (
              <button type="button" onClick={() => handlePublishContest('test')} 
              className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2">
                Publish as Test
              </button>
            )}
            <button type="button" onClick={() => handlePublishContest('final')} className="w-full sm:w-auto px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Publish Contest
            </button>
          </div>
        </div>
      </div>
    </div>
  );

return (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg 
              className="w-5 h-5 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'problems' ? 'bg-blue-100 text-blue-800' : activeTab === 'tutorial' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {activeTab === 'problems' ? (editMode ? 'Editing Draft' : 'Creating') : activeTab === 'tutorial' ? 'Tutorial' : 'Publishing'}
            </span>
            {activeTab === 'tutorial' && currentProblem && (
              <span className="text-sm text-gray-600">
                → {currentProblem.problemIndex}. {currentProblem.title}
              </span>
            )}
          </div>
        </div>
      </div>


      <div className="flex gap-4 h-[calc(100vh-6rem)]">
        {/* Sidebar - Collapsible with independent scroll */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 ease-in-out`}>
          {sidebarOpen && (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
              {/* Problems List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Problems</h3>
                </div>
                <div className="p-2">
                  {problems.map(problem => (
                    <div key={problem.id} className="relative group">
                      <button
                        onClick={() => {
                          setActiveProblem(problem.id);
                          setActiveTab('problems');
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors duration-200 ${
                          activeProblem === problem.id
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                          activeProblem === problem.id
                            ? 'bg-blue-800 text-white'
                            : 'bg-gray-100'
                        }`}>
                          {problem.problemIndex || ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {problem.title || 'Untitled Problem'}
                          </div>
                          {/* Tutorial indicator */}
                          {problem.tutorial && problem.tutorial.trim() && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              Has tutorial
                            </div>
                          )}
                        </div>
                      </button>
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={() => handleDeleteProblem(problem.id)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-600 hover:text-red-800 p-1"
                        title="Delete Problem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      addProblem();
                      setActiveTab('problems');
                    }}
                    className="w-full flex items-center gap-2 p-2 text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium">Add Problem</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 border-t border-gray-200">
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full bg-blue-800 text-white py-2 rounded text-xs font-semibold hover:bg-blue-900 transition-colors duration-200 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>

                  {currentProblem && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('tutorial');
                      }}
                      className="w-full border border-gray-300 text-gray-700 py-2 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <GraduationCap className="w-4 h-4" />
                      Edit Tutorial
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('publish')}
                    className="w-full border border-gray-300 text-gray-700 py-2 rounded text-xs font-semibold hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Publish Contest
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Independent scroll */}
        <div className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? '' : 'ml-0'}`}>
          {activeTab === 'problems' ? renderProblemsTab() : 
           activeTab === 'tutorial' ? renderTutorialTab() : 
           renderPublishTab()}
        </div>
      </div>
    </div>
  </div>
);

};

export default CreateContest;