import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import { 
  Video, 
  Mail, 
  Send, 
  User, 
  CameraOff, 
  Camera, 
  X, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  MessageSquare,
  Clock,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

const InterviewSession = () => {
  // Layout States
  const [showQuestions, setShowQuestions] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  const [questionsPanelCollapsed, setQuestionsPanelCollapsed] = useState(false);
  
  // Video States
  const [candidateJoined, setCandidateJoined] = useState(false);
  const [isInterviewerVideoOn, setIsInterviewerVideoOn] = useState(true);
  const [isCandidateVideoOn, setIsCandidateVideoOn] = useState(false);
  
  // Question Management
  const [questionFile, setQuestionFile] = useState(null);
  const [showQuestionUploadPopup, setShowQuestionUploadPopup] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  
  // Code Editor States
  const [code, setCode] = useState('// Write your code here...\nfunction solution() {\n  \n}\n');
  const [output, setOutput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [collaboratorCursor, setCollaboratorCursor] = useState(null);
  
  // Invitation States
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitationSent, setInvitationSent] = useState(false);
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  
  // Refs
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize - Check if question exists on mount
  useEffect(() => {
    const savedQuestion = localStorage.getItem('interviewQuestion');
    if (savedQuestion) {
      setQuestionContent(savedQuestion);
    } else {
      setTimeout(() => {
        setShowQuestionUploadPopup(true);
      }, 1000);
    }
  }, []);

  // Simulate candidate joining after invitation
  useEffect(() => {
    if (invitationSent) {
      const timer = setTimeout(() => {
        setCandidateJoined(true);
        setIsCandidateVideoOn(true);
        toast.success('Candidate has joined the session!', {
          style: {
            background: '#1e40af',
            color: '#ffffff',
          },
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [invitationSent]);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          toast('Interview time has ended!', {
            icon: '⏰',
            style: {
              background: '#dc2626',
              color: '#ffffff',
            },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Layout Controls
  const toggleQuestions = () => {
    if (!questionContent && !questionFile) {
      setShowQuestionUploadPopup(true);
      return;
    }
    setShowQuestions(!showQuestions);
  };

  const toggleVideoPanel = () => {
    setIsVideoOpen(!isVideoOpen);
  };

  const toggleQuestionsPanel = () => {
    setQuestionsPanelCollapsed(!questionsPanelCollapsed);
  };

  // Video Controls
  const toggleInterviewerVideo = () => {
    setIsInterviewerVideoOn(!isInterviewerVideoOn);
  };

  const toggleCandidateVideo = () => {
    if (candidateJoined) {
      setIsCandidateVideoOn(!isCandidateVideoOn);
    }
  };

  // Question Management
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setQuestionFile(file);
      
      const mockContent = `Extracted content from: ${file.name}
      
      Question 1: Array Manipulation
      -------------------------------
      Given an array of integers, find the maximum product of any two numbers in the array.
      
      Example:
      Input: [1, 2, 3, 4]
      Output: 12 (3 * 4)
      
      Question 2: String Operations
      -----------------------------
      Write a function to check if a string is a palindrome, ignoring non-alphanumeric characters.
      
      Example:
      Input: "A man, a plan, a canal: Panama"
      Output: true
      
      Question 3: System Design
      -------------------------
      Design a URL shortening service like TinyURL. Discuss the database schema and API endpoints.`;
      
      setQuestionContent(mockContent);
      localStorage.setItem('interviewQuestion', mockContent);
      
      toast.success('Question file uploaded successfully!', {
        style: {
          background: '#1e40af',
          color: '#ffffff',
        },
      });
      
      setShowQuestionUploadPopup(false);
    } else {
      toast.error('Please upload a PDF or DOCX file', {
        style: {
          background: '#dc2626',
          color: '#ffffff',
        },
      });
    }
  };

  const handleManualQuestion = () => {
    const manualQuestion = `Interview Questions
    ==================
    
    1. Coding Questions:
    --------------------
    a) Given an array, find the maximum product of any two numbers.
    b) Check if a string is a palindrome (ignore special characters).
    c) Design a URL shortening service (system design).
    
    2. Behavioral Questions:
    ------------------------
    a) Tell me about a challenging project.
    b) How do you handle conflicting priorities?
    c) Describe your experience with agile methodologies.`;
    
    setQuestionContent(manualQuestion);
    localStorage.setItem('interviewQuestion', manualQuestion);
    setShowQuestionUploadPopup(false);
    
    toast.success('Question set added successfully!', {
      style: {
        background: '#1e40af',
        color: '#ffffff',
      },
    });
  };

  // Code Editor Functions
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });
  };

  const handleRunCode = () => {
    try {
      setOutput(`> Compiling code...
> Code executed successfully!
> 
> Output: 
${evalCode(code)}
> 
> Execution time: 0.002s
> Memory used: 4.2 MB
> 
> Process exited with code 0`);
    } catch (error) {
      setOutput(`> Compiling code...
> Error: ${error.message}
> 
> Please fix the syntax errors and try again.`);
    }
  };

  const evalCode = (codeString) => {
    if (codeString.includes('console.log')) {
      return 'Hello, Interview! Code executed successfully.';
    } else if (codeString.includes('function solution')) {
      return 'Solution function defined. Add implementation.';
    }
    return 'Code executed. No output generated.';
  };

  const handleEditorChange = (value, event) => {
    setCode(value);
  };

  // Simulate collaborator cursor movement
  useEffect(() => {
    if (!candidateJoined) return;
    
    const moveInterval = setInterval(() => {
      if (editorRef.current) {
        const maxLines = code.split('\n').length;
        const lineNumber = Math.floor(Math.random() * maxLines) + 1;
        const column = Math.floor(Math.random() * 20) + 1;
        
        setCollaboratorCursor({
          lineNumber,
          column,
          username: 'Candidate'
        });
      }
    }, 2000);
    
    return () => clearInterval(moveInterval);
  }, [candidateJoined, code]);

  // Invitation Functions
  const handleInviteClick = () => {
    setShowInvitePopup(true);
  };

  const handleSendInvite = () => {
    if (inviteEmail) {
      console.log('Sending invitation to:', inviteEmail);
      
      setShowInvitePopup(false);
      setInvitationSent(true);
      
      toast.success(`Invitation sent to ${inviteEmail}`, {
        style: {
          background: '#1e40af',
          color: '#ffffff',
        },
        duration: 4000,
      });
      
      setInviteEmail('');
    }
  };

  // Calculate widths based on layout state
  const getLeftPanelWidth = () => {
    if (!isVideoOpen) return 'w-0';
    return 'w-1/2'; // Keep left panel at 1/2 width regardless of questions visibility
  };

  const getEditorWidth = () => {
    if (!isVideoOpen) return 'w-full';
    return 'w-1/2'; // Editor takes remaining 1/2 of screen
  };

  const getVideosWidth = () => {
    if (showQuestions && !questionsPanelCollapsed) return 'w-1/4'; // Videos take 1/4 of left panel
    return 'w-full';
  };

  const getQuestionsWidth = () => {
    if (showQuestions && !questionsPanelCollapsed) return 'w-3/4'; // Questions take 3/4 of left panel
    return 'w-0';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5" />
            Interview Session
          </h1>
          <div className="flex items-center bg-blue-50 px-3 py-1 rounded">
            <Clock className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-blue-700 font-medium">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm">Interviewer Connected</span>
          </div>
          {candidateJoined ? (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Candidate Connected</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-sm">Waiting for Candidate</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel (Combined Videos + Questions) */}
        {isVideoOpen && (
          <div className={`${getLeftPanelWidth()} flex transition-all duration-300 ease-in-out`}>
            {/* Collapsed Videos Panel (Left side of left panel) */}
            <div className={`${getVideosWidth()} flex flex-col border-r bg-gray-900 transition-all duration-300 ease-in-out`}>
              {/* Videos Header */}
              <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Participants (2)</span>
                </div>
                <div className="flex space-x-1">
                  <button 
                    onClick={toggleQuestions}
                    className="bg-blue-800 hover:bg-blue-900 text-white p-1.5 rounded text-xs flex items-center gap-1 transition-colors"
                    title={showQuestions ? 'Hide Questions' : 'Show Questions'}
                  >
                    {showQuestions ? <EyeOff className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={toggleVideoPanel}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded text-xs transition-colors"
                    title="Minimize Video"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Collapsed Videos List */}
              <div className="flex-1 overflow-y-auto p-2">
                {/* Interviewer Video Card */}
                <div className="bg-gray-800 rounded-lg mb-2 overflow-hidden">
                  <div className="relative aspect-video bg-gray-700">
                    {isInterviewerVideoOn ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white text-xs">Interviewer</span>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <CameraOff className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    {/* Camera Status */}
                    <div className="absolute bottom-1 right-1">
                      {isInterviewerVideoOn ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs">You</span>
                      <button 
                        onClick={toggleInterviewerVideo}
                        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        {isInterviewerVideoOn ? 'Off' : 'On'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Candidate Video Card */}
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="relative aspect-video bg-gray-700">
                    {candidateJoined && isCandidateVideoOn ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white text-xs">Candidate</span>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        {candidateJoined ? (
                          <CameraOff className="w-8 h-8 text-gray-500" />
                        ) : (
                          <div className="text-center">
                            <CameraOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <span className="text-gray-400 text-xs block">Not Joined</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Invite Button for Candidate */}
                    {!candidateJoined && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                        {!invitationSent ? (
                          <button 
                            onClick={handleInviteClick}
                            className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            Invite
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-not-allowed"
                          >
                            <Mail className="w-3 h-3" />
                            Invited
                          </button>
                        )}
                      </div>
                    )}
                    {/* Camera Status */}
                    {candidateJoined && (
                      <div className="absolute bottom-1 right-1">
                        {isCandidateVideoOn ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs">
                        {candidateJoined ? 'Candidate' : 'Waiting...'}
                      </span>
                      {candidateJoined && (
                        <button 
                          onClick={toggleCandidateVideo}
                          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          {isCandidateVideoOn ? 'Off' : 'On'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Controls at Bottom */}
                <div className="mt-4 p-2 bg-gray-800 rounded-lg">
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={toggleInterviewerVideo}
                      className={`p-2 rounded flex items-center gap-1 text-xs ${
                        isInterviewerVideoOn 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isInterviewerVideoOn ? <CameraOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                    </button>
                    {candidateJoined && (
                      <button 
                        onClick={toggleCandidateVideo}
                        className="p-2 rounded flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        {isCandidateVideoOn ? <CameraOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Panel (Right side of left panel) */}
            {showQuestions && (
              <div className={`${getQuestionsWidth()} flex flex-col bg-white border-r transition-all duration-300 ease-in-out overflow-hidden`}>
                {/* Questions Header */}
                <div className="p-3 border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Interview Questions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={toggleQuestionsPanel}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={questionsPanelCollapsed ? 'Expand questions' : 'Collapse questions'}
                    >
                      {questionsPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setShowQuestions(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Close questions"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Questions Content */}
                <div className="flex-1 overflow-auto p-4">
                  {questionContent ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-blue-600 mr-2" />
                          <div>
                            <p className="font-medium text-blue-800 text-sm">
                              {questionFile ? `Uploaded: ${questionFile.name}` : 'Manual Question Set'}
                            </p>
                            {questionFile && (
                              <p className="text-xs text-blue-600">{(questionFile.size / 1024).toFixed(2)} KB</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-blue-500 pl-3 py-2">
                          <h3 className="font-semibold text-sm">Question 1: Array Manipulation</h3>
                          <p className="text-gray-700 text-xs mt-1">
                            Given an array of integers, find the maximum product of any two numbers in the array.
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-blue-500 pl-3 py-2">
                          <h3 className="font-semibold text-sm">Question 2: String Operations</h3>
                          <p className="text-gray-700 text-xs mt-1">
                            Write a function to check if a string is a palindrome, ignoring non-alphanumeric characters.
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-blue-500 pl-3 py-2">
                          <h3 className="font-semibold text-sm">Question 3: System Design</h3>
                          <p className="text-gray-700 text-xs mt-1">
                            Design a URL shortening service like TinyURL. Discuss the database schema and API endpoints.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-sm mb-2">Behavioral Questions</h3>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            <span>Tell me about a challenging project</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            <span>How do you handle conflicting priorities?</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            <span>Describe your experience with agile methodologies</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-4">
                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm text-center mb-4">No questions available</p>
                      <button 
                        onClick={() => setShowQuestionUploadPopup(true)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded text-sm flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        Upload Questions
                      </button>
                    </div>
                  )}
                </div>

                {/* Questions Footer */}
                <div className="p-3 border-t">
                  <button 
                    onClick={() => setShowQuestionUploadPopup(true)}
                    className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3 h-3" />
                    Update Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Toggle Button (when minimized) */}
        {!isVideoOpen && (
          <div className="absolute left-4 top-20 z-10">
            <button 
              onClick={toggleVideoPanel}
              className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
              title="Show video panel"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Code Editor / IDE */}
        <div className={`${getEditorWidth()} flex flex-col transition-all duration-300 ease-in-out`}>
          <div className="p-4 border-b flex justify-between items-center bg-white">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Collaborative Code Editor</h2>
              {!isVideoOpen && (
                <button 
                  onClick={toggleVideoPanel}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <Video className="w-4 h-4" />
                  Show Video
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                Cursor: Line {cursorPosition.lineNumber}, Column {cursorPosition.column}
              </div>
              <button 
                onClick={handleRunCode}
                className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm flex items-center gap-1 transition-colors"
              >
                <Send className="w-4 h-4" />
                Run Code
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            {/* Code Editor Area */}
            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                defaultValue={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: !candidateJoined,
                }}
              />
              
              {/* Real-time Collaborator Cursor Indicator */}
              {collaboratorCursor && (
                <div 
                  className="absolute w-0.5 h-6 bg-yellow-400 animate-pulse"
                  style={{
                    top: `${(collaboratorCursor.lineNumber - 1) * 20}px`,
                    left: `${(collaboratorCursor.column - 1) * 8}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    {collaboratorCursor.username}
                  </div>
                </div>
              )}
              
              {/* Collaboration Status */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {candidateJoined ? 'Collaborating with Candidate' : 'Waiting for Candidate...'}
              </div>
            </div>
            
            {/* Output Panel */}
            <div className="h-1/3 bg-black text-green-400 p-4 font-mono text-sm overflow-auto">
              <div className="mb-2 flex items-center justify-between">
                <span>Interview Compiler v1.0</span>
                <span className="text-gray-400 text-xs">
                  {candidateJoined ? 'Real-time collaboration active' : 'Single user mode'}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{output || '$ Ready to execute code'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Upload Popup */}
      {showQuestionUploadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Set Interview Questions
            </h2>
            <p className="text-gray-600 mb-4">Upload a question file or add questions manually</p>
            
            <div className="space-y-4">
              {/* File Upload Option */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Upload PDF or DOCX file</p>
                <label className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2 transition-colors mb-2">
                  <Upload className="w-4 h-4" />
                  Choose File
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf,.docx" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
                <p className="text-sm text-gray-500">Supports PDF and DOCX formats</p>
              </div>
              
              {/* Manual Option */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Or add questions manually</h3>
                <p className="text-sm text-gray-600 mb-4">You can type questions directly</p>
                <button 
                  onClick={handleManualQuestion}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Use Sample Questions
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowQuestionUploadPopup(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!questionContent) {
                      toast.error('Please upload or add questions first', {
                        style: {
                          background: '#dc2626',
                          color: '#ffffff',
                        },
                      });
                      return;
                    }
                    setShowQuestionUploadPopup(false);
                  }}
                  className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Candidate Popup */}
      {showInvitePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite Candidate
            </h2>
            <p className="text-gray-600 mb-4">Enter candidate's email to send invitation link</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <p>Candidate will receive an email with a link to join this interview session.</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSendInvite}
                className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invitation
              </button>
              <button
                onClick={() => {
                  setShowInvitePopup(false);
                  setInviteEmail('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;