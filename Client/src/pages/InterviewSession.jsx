import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Video, Mail, Send, User, CameraOff, Camera, X, ChevronLeft, ChevronRight,
  FileText, Minimize2, Clock, Upload, Eye, EyeOff, Users, Download,
  MessageSquare, Maximize2, File, Play, Square
} from 'lucide-react';
import InterviewLayout from '../components/Interview/InterviewLayout';

const InterviewSession = () => {
  // Layout States
  const [showQuestions, setShowQuestions] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  const [questionsPanelCollapsed, setQuestionsPanelCollapsed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Video States
  const [candidateJoined, setCandidateJoined] = useState(false);
  const [isInterviewerVideoOn, setIsInterviewerVideoOn] = useState(true);
  const [isCandidateVideoOn, setIsCandidateVideoOn] = useState(false);
  
  // Question Management
  const [sharedQuestionFile, setSharedQuestionFile] = useState(null);
  const [sharedQuestionContent, setSharedQuestionContent] = useState('');
  const [sharedFileUrl, setSharedFileUrl] = useState(null);
  
  // Code Editor States
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [codeVersion, setCodeVersion] = useState(0);
  
  // Session & Users
  const [sessionId, setSessionId] = useState('');
  const [currentUser, setCurrentUser] = useState({ id: '', username: '', role: '' });
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Invitation Handling
  const [invitationToken, setInvitationToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Invitation States
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // Refs
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const fileUrlRef = useRef(null);

  // Initialize session from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    const role = urlParams.get('role');
    const token = urlParams.get('token');
    
    // If we have an invitation token, validate it first
    if (token) {
      setInvitationToken(token);
      validateInvitation(token);
    } else if (session && role) {
      // Direct session access
      setSessionId(session);
      setCurrentUser({
        id: '',
        username: role === 'interviewer' ? 'Interviewer' : 'Candidate',
        role
      });

      toast.success(`Joined session: ${session.substring(0, 8)} as ${role}`, {
        duration: 4000,
      });
    } else {
      // Generate a new session if neither token nor session/role provided
      const newSessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      setCurrentUser({
        id: '',
        username: 'Interviewer',
        role: 'interviewer'
      });
      
      toast.success(`Created new session: ${newSessionId.substring(0, 8)}`, {
        duration: 4000,
      });
    }
  }, []);

  // Validate invitation token
  const validateInvitation = async (token) => {
    setIsValidating(true);
    setValidationError('');
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/validate-invitation/?token=${token}`);
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        // Set session and role from invitation
        setSessionId(result.session_id);
        setCurrentUser({
          id: '',
          username: result.role === 'interviewer' ? 'Interviewer' : 'Candidate',
          role: result.role
        });
        
        toast.success(`Validated invitation for session: ${result.session_id.substring(0, 8)}`, {
          duration: 4000,
        });
      } else {
        setValidationError(result.message || 'Invalid invitation token');
      }
    } catch (error) {
      setValidationError('Network error: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Use invitation token (mark as used)
  const useInvitation = async (token) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/use-invitation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        // Redirect to the session
        window.location.href = result.join_link;
      } else {
        setValidationError(result.message || 'Failed to use invitation');
      }
    } catch (error) {
      setValidationError('Network error: ' + error.message);
    }
  };


  // WebSocket Connection
  useEffect(() => {
    // Don't connect until we have a valid session and role
    if (!sessionId || !currentUser.role || isValidating || validationError) return;

    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws/interview/${sessionId}/?role=${currentUser.role}`;
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        toast.success('Connected to interview session');
        
        // Heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "heartbeat" }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "initial_state":
              setCurrentUser(prev => ({ ...prev, id: data.user_id }));
              setCode(data.code?.content || code);
              setLanguage(data.code?.language || 'python');
              setCodeVersion(data.code?.version || 0);
              
              if (data.question?.content) setSharedQuestionContent(data.question.content);
              if (data.question?.file_data) {
                setSharedQuestionFile(data.question.file_data);
                // Reconstruct blob URL for existing file data
                if (data.question.file_data && data.question.file_type) {
                  // The file_data is already stored in the database as base64
                  // We need to convert it back to a blob for display
                  const byteCharacters = atob(data.question.file_data);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: data.question.file_type });
                  const fileUrl = URL.createObjectURL(blob);
                  // Clean up previous URL if exists
                  if (fileUrlRef.current) {
                    URL.revokeObjectURL(fileUrlRef.current);
                  }
                  fileUrlRef.current = fileUrl;
                  setSharedFileUrl(fileUrl);
                } else {
                  setSharedFileUrl(null);
                }
              } else {
                setSharedQuestionFile(null);
                setSharedFileUrl(null);
              }
              
              setTimeRemaining(data.timer?.remaining_time || 3600);
              setIsTimerRunning(data.timer?.is_running ?? true);
              setOnlineUsers(data.online_users || []);
              
              const cursors = {};
              (data.cursors || []).forEach(c => {
                if (c.user_id !== data.user_id) {
                  cursors[c.user_id] = {
                    lineNumber: c.line,
                    column: c.column,
                    username: c.username
                  };
                }
              });
              setCollaboratorCursors(cursors);
              break;

            case "code_change":
              if (data.user_id !== currentUser.id) {
                setCode(data.content);
                if (data.language) setLanguage(data.language);
                setCodeVersion(data.version || 0);
              }
              break;

            case "language_change":
              if (data.user_id !== currentUser.id) {
                setLanguage(data.language);
              }
              break;

            case "cursor_move":
              if (data.user_id !== currentUser.id) {
                setCollaboratorCursors(prev => ({
                  ...prev,
                  [data.user_id]: {
                    lineNumber: data.line,
                    column: data.column,
                    username: data.username
                  }
                }));
              }
              break;



            case "question_update":
              setSharedQuestionContent(data.content);
              if (data.file_data) {
                setSharedQuestionFile(data.file_data);
                // Reconstruct blob URL if we have file data
                if (data.file_data.file_content && data.file_data.file_type) {
                  // Convert base64 to blob for display
                  const byteCharacters = atob(data.file_data.file_content);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: data.file_data.file_type });
                  const fileUrl = URL.createObjectURL(blob);
                  // Clean up previous URL if exists
                  if (fileUrlRef.current) {
                    URL.revokeObjectURL(fileUrlRef.current);
                  }
                  fileUrlRef.current = fileUrl;
                  setSharedFileUrl(fileUrl);
                } else {
                  setSharedFileUrl(null);
                }
              } else {
                setSharedQuestionFile(null);
                setSharedFileUrl(null);
              }
              toast.success(`Questions updated by ${data.username}`);
              break;

            case "user_joined":
              setOnlineUsers(prev => [...prev, { user_id: data.user_id, username: data.username, role: data.role }]);
              if (data.role === 'candidate') {
                setCandidateJoined(true);
                toast.success(`${data.username} joined!`);
              }
              break;

            case "user_left":
              setOnlineUsers(prev => prev.filter(u => u.user_id !== data.user_id));
              setCollaboratorCursors(prev => {
                const newC = { ...prev };
                delete newC[data.user_id];
                return newC;
              });
              if (data.role === 'candidate') setCandidateJoined(false);
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      socket.onclose = () => {
        clearInterval(heartbeatIntervalRef.current);
        toast.error('Disconnected. Reconnecting...');
        setTimeout(connectWebSocket, 3000);
      };

      socketRef.current = socket;
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [sessionId, currentUser.role, isValidating, validationError]);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const sendMessage = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  // Run Code Handler
  const handleRunCode = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setOutput(`[${new Date().toLocaleTimeString()}] Running ${language.toUpperCase()}...
> Sending to backend...

This may take up to 30 seconds. If you don't see output:
1. Check your internet connection
2. The code execution service might be temporarily unavailable
3. Try a simpler code example first`);

    try {
      // Clear any existing timeout
      if (window.currentExecutionTimeout) {
        clearTimeout(window.currentExecutionTimeout);
      }

      // Set a timeout for the request
      const timeoutId = setTimeout(() => {
        setIsRunning(false);
        setOutput(prev => prev + '\n\n> Timeout: No response from server after 30 seconds.\n\nPossible causes:\n1. Internet connectivity issues\n2. Code execution service is temporarily unavailable\n3. The code might be too complex or contain errors\n\nPlease check your connection and try a simpler example.');
      }, 30000);

      // Store timeout ID so we can clear it if we get a response
      window.currentExecutionTimeout = timeoutId;

      // Make API call to execute code
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/execute/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language,
        }),
      });

      // Clear the timeout since we got a response
      clearTimeout(window.currentExecutionTimeout);
      window.currentExecutionTimeout = null;

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setOutput(result.output);
        } else {
          setOutput(`Error: ${result.message || result.error || 'Unknown error occurred'}`);
        }
      } else {
        setOutput(`Error: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      // Clear the timeout since we got an error
      if (window.currentExecutionTimeout) {
        clearTimeout(window.currentExecutionTimeout);
        window.currentExecutionTimeout = null;
      }
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Editor Handlers
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      const pos = { lineNumber: e.position.lineNumber, column: e.position.column };
      setCursorPosition(pos);
      sendMessage({
        type: "cursor_move",
        line: pos.lineNumber,
        column: pos.column
      });
    });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    sendMessage({
      type: "code_change",
      content: value,
      language: language
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    sendMessage({
      type: "language_change",
      language: newLanguage
    });
  };

  const sendQuestionUpdate = (content, fileData = null) => {
    sendMessage({
      type: "question_update",
      content,
      file_data: fileData
    });
  };

  const sendVideoToggle = (type, enabled) => {
    // Placeholder if you implement video toggle
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Invitation Validation Overlay */}
      {(isValidating || validationError) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            {isValidating ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Validating Invitation</h3>
                <p className="text-gray-600">Please wait while we validate your invitation...</p>
              </div>
            ) : validationError ? (
              <div className="text-center">
                <div className="mx-auto mb-4 text-red-500">
                  <X className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Invitation Error</h3>
                <p className="text-gray-600 mb-4">{validationError}</p>
                <button
                  onClick={() => {
                    setValidationError('');
                    // Redirect to interview sessions page
                    window.location.href = '/interview';
                  }}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
                >
                  Back to Interview Sessions
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Video className="w-6 h-6 text-indigo-600" />
            Interview Session
            <span className="text-sm font-normal bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
              {currentUser.role} • {sessionId?.substring(0, 8)}
            </span>
          </h1>

          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-blue-700" />
            <span className="font-semibold text-blue-900">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${socketRef.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium">
              {socketRef.current?.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <span className="text-sm text-gray-600">
            {onlineUsers.length} online
          </span>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden">
        <InterviewLayout
          // Layout
          isVideoOpen={isVideoOpen}
          setIsVideoOpen={setIsVideoOpen}
          showQuestions={showQuestions}
          setShowQuestions={setShowQuestions}
          questionsPanelCollapsed={questionsPanelCollapsed}
          setQuestionsPanelCollapsed={setQuestionsPanelCollapsed}

          // Video
          candidateJoined={candidateJoined}
          isInterviewerVideoOn={isInterviewerVideoOn}
          setIsInterviewerVideoOn={setIsInterviewerVideoOn}
          isCandidateVideoOn={isCandidateVideoOn}
          setIsCandidateVideoOn={setIsCandidateVideoOn}

          // Questions
          sharedQuestionFile={sharedQuestionFile}
          setSharedQuestionFile={setSharedQuestionFile}
          sharedQuestionContent={sharedQuestionContent}
          setSharedQuestionContent={setSharedQuestionContent}
          sharedFileUrl={sharedFileUrl}
          setSharedFileUrl={setSharedFileUrl}

          // Code
          code={code}
          setCode={setCode}
          output={output}
          setOutput={setOutput}
          cursorPosition={cursorPosition}
          collaboratorCursors={collaboratorCursors}
          language={language}
          setLanguage={setLanguage}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          codeVersion={codeVersion}
          setCodeVersion={setCodeVersion}

          // Session
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          sessionId={sessionId}
          invitationSent={invitationSent}
          setShowInvitePopup={setShowInvitePopup}

          // Refs & Handlers
          socketRef={socketRef}
          editorRef={editorRef}
          handleRunCode={handleRunCode}
          handleEditorDidMount={handleEditorDidMount}
          handleEditorChange={handleEditorChange}
          handleLanguageChange={handleLanguageChange}
          sendVideoToggle={sendVideoToggle}
          sendQuestionUpdate={sendQuestionUpdate}
        />
      </div>
    </div>
  );
};

export default InterviewSession;