// InterviewSession.jsx - COMPLETELY UPDATED
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Video, Mail, Send, User, CameraOff, Camera, X, ChevronLeft, ChevronRight,
  FileText, Minimize2, Clock, Upload, Eye, EyeOff, Users, Download,
  MessageSquare, Maximize2, File, Play, Square, Copy, LogOut, Zap,
  ChevronDown, ChevronUp, Wifi, WifiOff
} from 'lucide-react';
import InterviewLayout from '../components/Interview/InterviewLayout';
import { useNavigate } from 'react-router-dom';

const InterviewSession = () => {
  const navigate = useNavigate();
  
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
  const [collaboratorSelections, setCollaboratorSelections] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [codeVersion, setCodeVersion] = useState(0);
  
  // Session & Users
  const [sessionId, setSessionId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('Interview Session');
  const [currentUser, setCurrentUser] = useState({ 
    id: '', 
    username: '', 
    role: '',
    isTyping: false
  });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [interviewerCount, setInterviewerCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  
  // Invitation States
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  
  // Refs
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileUrlRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  // Initialize session from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    const role = urlParams.get('role');
    const username = urlParams.get('username');
    const token = urlParams.get('token');
    
    if (session && role) {
      setSessionId(session);
      setCurrentUser({
        id: '',
        username: username || (role === 'interviewer' ? 'Interviewer' : 'Candidate'),
        role,
        isTyping: false
      });
      
      // Fetch initial session data
      fetchSessionData(session);
      
      toast.success(`Joining session: ${session.substring(0, 8)} as ${role}`, {
        duration: 3000,
      });
    } else if (token) {
      // Handle invitation token
      validateInvitationToken(token);
    } else {
      // Redirect to interview page if no session
      toast.error('No session specified. Redirecting...');
      setTimeout(() => navigate('/interview'), 2000);
    }
  }, []);

  // Fetch initial session data
  const fetchSessionData = async (sessionId) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      // Get session status
      const statusResponse = await fetch(`${backendUrl}/interview/api/sessions/status/?session_id=${sessionId}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.status === 'success') {
          setSessionTitle(statusData.title);
          setInterviewerCount(statusData.interviewer_count);
          setCandidateCount(statusData.candidate_count);
          setParticipants(statusData.active_participants || []);
          
          // Check if candidate has joined
          const hasCandidate = statusData.active_participants?.some(p => p.role === 'candidate');
          setCandidateJoined(hasCandidate);
        }
      }
      
      // Get document
      const docResponse = await fetch(`${backendUrl}/interview/api/sessions/document/?session_id=${sessionId}`);
      if (docResponse.ok) {
        const docData = await docResponse.json();
        if (docData.status === 'success' && docData.content) {
          setSharedQuestionContent(docData.content);
          if (docData.file_data) {
            setSharedQuestionFile(docData);
          }
        }
      }
      
      // Get code
      const codeResponse = await fetch(`${backendUrl}/interview/api/sessions/code/?session_id=${sessionId}`);
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        if (codeData.status === 'success') {
          setCode(codeData.content);
          setLanguage(codeData.language);
          setCodeVersion(codeData.version);
        }
      }
      
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  };

  const validateInvitationToken = async (token) => {
    // Implementation for token validation
    // This would call your backend API
    console.log('Validating token:', token);
  };

  // WebSocket Connection
  const connectWebSocket = () => {
    if (!sessionId || !currentUser.role) return;

    // Clear any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws/interview/${sessionId}/?role=${currentUser.role}&username=${encodeURIComponent(currentUser.username)}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setConnectionStatus('Connected');
      reconnectAttempts.current = 0;
      toast.success('Connected to interview session');
      
      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          sendSocketMessage({ type: "heartbeat" });
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type, data);

        switch (data.type) {
          case "initial_state":
            handleInitialState(data);
            break;
            
          case "presence_update":
            handlePresenceUpdate(data);
            break;
            
          case "code_change":
            handleCodeChange(data);
            break;
            
          case "code_sync":
            handleCodeSync(data);
            break;
            
          case "cursor_move":
            handleCursorMove(data);
            break;
            
          case "selection_change":
            handleSelectionChange(data);
            break;
            
          case "user_typing":
            handleUserTyping(data);
            break;
            
          case "question_update":
            handleQuestionUpdate(data);
            break;
            
          case "language_change":
            handleLanguageChangeWS(data);
            break;
            
          case "chat_message":
            handleChatMessage(data);
            break;
            
          case "timer_control":
            handleTimerControl(data);
            break;
            
          case "error":
            toast.error(data.message || 'An error occurred');
            break;
            
          case "heartbeat_ack":
            // Heartbeat acknowledged
            break;
            
          default:
            console.log('Unhandled message type:', data.type);
        }
      } catch (err) {
        console.error('WebSocket message error:', err, event.data);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      
      // Clear heartbeat
      clearInterval(heartbeatIntervalRef.current);
      
      // Clear typing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Show disconnect message
      if (event.code !== 1000) {
        toast.error('Disconnected from session. Reconnecting...');
        
        // Attempt reconnection with exponential backoff
        reconnectAttempts.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (reconnectAttempts.current < 5) {
            connectWebSocket();
          } else {
            toast.error('Failed to reconnect after multiple attempts');
          }
        }, delay);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error');
    };

    socketRef.current = socket;
  };

  // WebSocket message handlers
  const handleInitialState = (data) => {
    setCurrentUser(prev => ({ ...prev, id: data.user_id }));
    setCode(data.code?.content || '');
    setLanguage(data.code?.language || 'python');
    setCodeVersion(data.code?.version || 0);
    
    if (data.question?.content) {
      setSharedQuestionContent(data.question.content);
    }
    if (data.question?.file_data) {
      setSharedQuestionFile(data.question.file_data);
      // Handle file URL if needed
    }
    
    setTimeRemaining(data.timer?.remaining_time || 3600);
    setIsTimerRunning(data.timer?.is_running ?? true);
    
    // Update participants
    setParticipants(data.participants || []);
    setInterviewerCount(data.interviewer_count || 0);
    setCandidateCount(data.candidate_count || 0);
    
    // Update online users list
    const onlineUsersList = data.participants?.map(p => ({
      user_id: p.user_id,
      username: p.username,
      role: p.role
    })) || [];
    setOnlineUsers(onlineUsersList);
    
    // Check if candidate has joined
    const hasCandidate = data.participants?.some(p => p.role === 'candidate');
    setCandidateJoined(hasCandidate);
    
    // Initialize cursors
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
  };

  const handlePresenceUpdate = (data) => {
    // Update participants list
    setParticipants(data.participants || []);
    setInterviewerCount(data.interviewer_count || 0);
    setCandidateCount(data.candidate_count || 0);
    
    // Update online users
    const onlineUsersList = data.participants?.map(p => ({
      user_id: p.user_id,
      username: p.username,
      role: p.role
    })) || [];
    setOnlineUsers(onlineUsersList);
    
    // Check candidate status
    const hasCandidate = data.participants?.some(p => p.role === 'candidate');
    setCandidateJoined(hasCandidate);
    
    // Show toast for join/leave
    if (data.action === 'joined') {
      toast.success(`${data.username} (${data.role}) joined the session`);
    } else if (data.action === 'left') {
      toast.info(`${data.username} left the session`);
    }
  };

  const handleCodeChange = (data) => {
    if (data.user_id !== currentUser.id) {
      setCode(data.content);
      if (data.language) setLanguage(data.language);
      setCodeVersion(data.version || 0);
      
      // Show notification for significant changes
      if (data.content.length > 100) {
        toast.info(`Code updated by ${data.username}`);
      }
    }
  };

  const handleCodeSync = (data) => {
    // Server sent sync request due to version mismatch
    setCode(data.content);
    if (data.language) setLanguage(data.language);
    setCodeVersion(data.version);
    
    toast.info(`Synced with server version ${data.version}`);
  };

  const handleCursorMove = (data) => {
    if (data.user_id !== currentUser.id) {
      setCollaboratorCursors(prev => ({
        ...prev,
        [data.user_id]: {
          lineNumber: data.line,
          column: data.column,
          username: data.username,
          role: data.role,
          timestamp: data.timestamp
        }
      }));
      
      // Remove cursor after 3 seconds of inactivity
      setTimeout(() => {
        setCollaboratorCursors(prev => {
          const newCursors = { ...prev };
          if (newCursors[data.user_id]?.timestamp === data.timestamp) {
            delete newCursors[data.user_id];
          }
          return newCursors;
        });
      }, 3000);
    }
  };

  const handleSelectionChange = (data) => {
    if (data.user_id !== currentUser.id) {
      setCollaboratorSelections(prev => ({
        ...prev,
        [data.user_id]: {
          selection: data.selection,
          username: data.username,
          role: data.role,
          timestamp: data.timestamp
        }
      }));
    }
  };

  const handleUserTyping = (data) => {
    if (data.user_id !== currentUser.id) {
      setTypingUsers(prev => ({
        ...prev,
        [data.user_id]: {
          username: data.username,
          isTyping: data.is_typing,
          timestamp: data.timestamp
        }
      }));
      
      // Clear typing status after 2 seconds
      if (data.is_typing) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newTyping = { ...prev };
            if (newTyping[data.user_id]?.timestamp === data.timestamp) {
              delete newTyping[data.user_id];
            }
            return newTyping;
          });
        }, 2000);
      }
    }
  };

  const handleQuestionUpdate = (data) => {
    setSharedQuestionContent(data.content);
    if (data.file_data) {
      setSharedQuestionFile(data.file_data);
      
      // Create blob URL for display if needed
      if (data.file_data.file_blob && data.file_data.file_type) {
        try {
          // Convert base64 to blob
          const byteCharacters = atob(data.file_data.file_blob);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: data.file_data.file_type });
          const fileUrl = URL.createObjectURL(blob);
          
          // Clean up previous URL
          if (fileUrlRef.current) {
            URL.revokeObjectURL(fileUrlRef.current);
          }
          fileUrlRef.current = fileUrl;
          setSharedFileUrl(fileUrl);
        } catch (error) {
          console.error('Error creating file URL:', error);
        }
      }
    }
    
    toast.success(`Questions updated by ${data.username}`);
  };

  const handleLanguageChangeWS = (data) => {
    if (data.user_id !== currentUser.id) {
      setLanguage(data.language);
      toast.info(`Language changed to ${data.language} by ${data.username}`);
    }
  };

  const handleChatMessage = (data) => {
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      user_id: data.user_id,
      username: data.username,
      message: data.message,
      timestamp: data.timestamp,
      role: data.role
    }]);
  };

  const handleTimerControl = (data) => {
    if (data.action === 'start') {
      setIsTimerRunning(true);
    } else if (data.action === 'pause') {
      setIsTimerRunning(false);
    } else if (data.action === 'reset' && data.duration) {
      setTimeRemaining(data.duration);
      setIsTimerRunning(true);
    }
  };

  // Send WebSocket message
  const sendSocketMessage = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  };

  // Connect WebSocket when session is ready
  useEffect(() => {
    if (sessionId && currentUser.role) {
      connectWebSocket();
    }
    
    return () => {
      // Cleanup
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
      }
    };
  }, [sessionId, currentUser.role]);

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

  // Run Code Handler
  const handleRunCode = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setOutput(`[${new Date().toLocaleTimeString()}] Running ${language.toUpperCase()}...\n`);

    try {
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

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setOutput(result.output || 'Execution completed with no output.');
        } else {
          setOutput(`Error: ${result.message || result.error || 'Unknown error occurred'}`);
        }
      } else {
        setOutput(`Error: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
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
      
      // Send cursor position
      sendSocketMessage({
        type: "cursor_move",
        line: pos.lineNumber,
        column: pos.column
      });
    });
    
    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      if (e.selection) {
        sendSocketMessage({
          type: "selection_change",
          selection: {
            startLineNumber: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLineNumber: e.selection.endLineNumber,
            endColumn: e.selection.endColumn
          }
        });
      }
    });
    
    // Track typing
    let typingTimeout;
    editor.onDidChangeModelContent(() => {
      // Send typing status
      if (!currentUser.isTyping) {
        setCurrentUser(prev => ({ ...prev, isTyping: true }));
        sendSocketMessage({
          type: "user_typing",
          is_typing: true
        });
      }
      
      // Clear typing timeout
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        setCurrentUser(prev => ({ ...prev, isTyping: false }));
        sendSocketMessage({
          type: "user_typing",
          is_typing: false
        });
      }, 1000);
    });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    
    // Debounce sending code changes
    if (window.codeChangeTimeout) {
      clearTimeout(window.codeChangeTimeout);
    }
    
    window.codeChangeTimeout = setTimeout(() => {
      sendSocketMessage({
        type: "code_change",
        content: value,
        language: language,
        version: codeVersion
      });
      setCodeVersion(prev => prev + 1);
    }, 300);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    sendSocketMessage({
      type: "language_change",
      language: newLanguage
    });
  };

  const sendQuestionUpdate = (content, fileData = null) => {
    sendSocketMessage({
      type: "question_update",
      content: content,
      file_data: fileData
    });
  };

  const sendVideoToggle = (type, enabled) => {
    // Placeholder for video toggle
    console.log(`Video ${type} ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleSendChatMessage = () => {
    if (!newMessage.trim()) return;
    
    sendSocketMessage({
      type: "chat_message",
      message: newMessage
    });
    
    setNewMessage('');
  };

  const handleInviteCandidate = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/send-invitation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          email: inviteEmail,
          role: 'candidate'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInvitationSent(true);
        setShowInvitePopup(false);
        setInviteEmail('');
      } else {
        toast.error(result.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/interview-session?session=${sessionId}&role=candidate`;
    navigator.clipboard.writeText(link);
    toast.success('Session link copied to clipboard!');
  };

  const leaveSession = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    navigate('/interview');
  };

  const getTypingUsers = () => {
    return Object.values(typingUsers)
      .filter(user => user.isTyping)
      .map(user => user.username);
  };

  const typingUsersText = getTypingUsers();
  const isSomeoneTyping = typingUsersText.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Video className="w-6 h-6 text-indigo-600" />
            {sessionTitle}
            <span className="text-sm font-normal bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
              {currentUser.role} • {sessionId?.substring(0, 8)}
            </span>
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 text-blue-700" />
              <span className="font-semibold text-blue-900">{formatTime(timeRemaining)}</span>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">
                {interviewerCount} interviewer{interviewerCount !== 1 ? 's' : ''} • {candidateCount} candidate{candidateCount !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-500">
                {onlineUsers.length} online
              </div>
            </div>
            
            {isSomeoneTyping && (
              <div className="text-sm text-gray-600 italic">
                {typingUsersText.join(', ')} {typingUsersText.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
          </div>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2.5 rounded-lg ${showChat ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 hover:bg-gray-200'} transition`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          
          <button
            onClick={copySessionLink}
            className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            title="Copy invite link"
          >
            <Copy className="w-5 h-5" />
          </button>
          
          {currentUser.role === 'interviewer' && !candidateJoined && (
            <button
              onClick={() => setShowInvitePopup(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Mail className="w-4 h-4" />
              Invite Candidate
            </button>
          )}
          
          <button
            onClick={leaveSession}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            Leave
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
          collaboratorSelections={collaboratorSelections}
          language={language}
          setLanguage={setLanguage}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          codeVersion={codeVersion}
          setCodeVersion={setCodeVersion}

          // Session
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          participants={participants}
          sessionId={sessionId}
          sessionTitle={sessionTitle}
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

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute right-0 top-16 bottom-0 w-96 bg-white border-l border-gray-200 shadow-lg flex flex-col z-40">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-800">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-auto p-4 space-y-4"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div 
                  key={msg.id}
                  className={`p-3 rounded-lg ${msg.user_id === currentUser.id ? 'bg-blue-50 ml-auto' : 'bg-gray-50'} max-w-[80%]`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${msg.role === 'interviewer' ? 'text-blue-700' : 'text-green-700'}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-800">{msg.message}</p>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSendChatMessage}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Send className="w-5 h-5" />
              </button>
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
            
            <p className="text-gray-600 mb-4">Send an invitation email to a candidate:</p>
            
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowInvitePopup(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteCandidate}
                className="flex-1 bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Send Invitation
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Or share this link directly:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/interview-session?session=${sessionId}&role=candidate`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                />
                <button
                  onClick={copySessionLink}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;