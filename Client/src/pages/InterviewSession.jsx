import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import { 
  Video, Mail, Send, User, CameraOff, Camera, X, ChevronLeft, ChevronRight,
  FileText, Minimize2, Clock, Upload, Eye, EyeOff, Users, Download,
  MessageSquare, Maximize2, File, Play
} from 'lucide-react';



// PDF Viewer Component
const PDFViewer = ({ fileUrl, fileName }) => {
  return (
    <div className="w-full h-full">
      <iframe 
        src={`${fileUrl}#view=fitH&toolbar=1`}
        className="w-full h-full border-0"
        title={`PDF Viewer - ${fileName}`}
        type="application/pdf"
      />
    </div>
  );
};

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
  const [showQuestionUploadPopup, setShowQuestionUploadPopup] = useState(false);
  const [sharedQuestionContent, setSharedQuestionContent] = useState('');
  const [sharedFileUrl, setSharedFileUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileBlobCache, setFileBlobCache] = useState({});  
  // Code Editor States
  const [code, setCode] = useState('# Write your code here\ndef solution():\n    print("Hello from Python!")\n    return 0\n\nsolution()');
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
  
  // Invitation States
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitationSent, setInvitationSent] = useState(false);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  // API Endpoint
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:8000');
  
  // WebSocket & Refs
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastBroadcastRef = useRef(Date.now());
  const chatContainerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const fileUrlsCache = useRef({});



  // Initialize session from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session') || `session_${Math.random().toString(36).substr(2, 9)}`;
    const role = urlParams.get('role') || 'interviewer';
    
    setSessionId(session);
    setCurrentUser({
      id: '',
      username: role === 'interviewer' ? 'Interviewer' : 'Candidate',
      role: role
    });
    
    // Try to detect backend URL
    const detectedApi = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : `${window.location.protocol}//${window.location.host}`;
    setApiEndpoint(detectedApi);
    
    console.log(`Session initialized: ${session}, Role: ${role}, API: ${detectedApi}`);
    
    // Load initial shared question
    const savedQuestion = localStorage.getItem(`interviewQuestion_${session}`);
    if (savedQuestion) {
      try {
        const parsed = JSON.parse(savedQuestion);
        setSharedQuestionContent(parsed.content);
        if (parsed.fileData) {
          setSharedQuestionFile(parsed.fileData);
        }
      } catch (e) {
        console.error(`Error parsing saved question: ${e.message}`);
      }
    }
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!sessionId) return;

    const connectWebSocket = () => {
      try {
        // Build WebSocket URL correctly
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        const wsPort = window.location.hostname === 'localhost' ? ':8000' : '';
        const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws/interview/${sessionId}/?role=${currentUser.role}`;
        
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          toast.success('Connected to interview session', {
            style: { background: '#10b981', color: '#ffffff' },
          });
          
          // Start heartbeat
          heartbeatIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "heartbeat" }));
            }
          }, 30000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`WebSocket message received: ${data.type}`);
            
            switch (data.type) {
              case "initial_state":
                setCurrentUser(prev => ({ ...prev, id: data.user_id }));
                setCode(data.code?.content || code);
                setLanguage(data.code?.language || language);
                setCodeVersion(data.code?.version || 0);
                
                if (data.question?.content) {
                  setSharedQuestionContent(data.question.content);
                }
                
                setTimeRemaining(data.timer?.remaining_time || 3600);
                setIsTimerRunning(data.timer?.is_running || true);
                setOnlineUsers(data.online_users || []);
                
                // Set initial cursors
                const cursors = {};
                (data.cursors || []).forEach(cursor => {
                  if (cursor.user_id !== data.user_id) {
                    cursors[cursor.user_id] = {
                      lineNumber: cursor.line,
                      column: cursor.column,
                      username: cursor.username
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

              case "run_code":
                // Handle code execution result from backend
                console.log(`Received code execution result from ${data.username}`);
                setOutput(data.output);
                
                // Show success/error toast
                if (data.output?.includes('Error:')) {
                  toast.error('Code execution failed', {
                    style: { background: '#dc2626', color: '#ffffff' },
                  });
                } else if (data.output) {
                  toast.success('Code executed successfully', {
                    style: { background: '#10b981', color: '#ffffff' },
                  });
                }
                break;

              case "question_update":
                setSharedQuestionContent(data.content);
                
                // Handle file data if present
                if (data.file_data) {
                  setSharedQuestionFile(data.file_data);
                  
                  // Create and cache the file URL for all users
                  if (data.file_data.file_content) {
                    try {
                      // Convert base64 to blob
                      const byteString = atob(data.file_data.file_content);
                      const ab = new ArrayBuffer(byteString.length);
                      const ia = new Uint8Array(ab);
                      for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                      }
                      const blob = new Blob([ab], { type: data.file_data.file_type });
                      const fileUrl = URL.createObjectURL(blob);
                      fileUrlsCache.current[data.file_data.file_name] = fileUrl;
                      setSharedFileUrl(fileUrl);
                      
                      // Store in file blob cache
                      setFileBlobCache(prev => ({
                        ...prev,
                        [data.file_data.file_name]: blob
                      }));
                    } catch (error) {
                      console.error('Error processing file data:', error);
                    }
                  }
                } else {
                  // Clear file data if not present in update
                  setSharedQuestionFile(null);
                  setSharedFileUrl(null);
                }
                
                toast.success(`Questions updated by ${data.username}`, {
                  style: { background: '#1e40af', color: '#ffffff' },
                });
                break;
              case "timer_update":
                setTimeRemaining(data.remaining_time);
                setIsTimerRunning(data.is_running);
                break;

              case "user_joined":
                setOnlineUsers(prev => {
                  const exists = prev.find(user => user.user_id === data.user_id);
                  if (!exists) {
                    return [...prev, {
                      user_id: data.user_id,
                      username: data.username,
                      role: data.role
                    }];
                  }
                  return prev;
                });
                
                if (data.role === 'candidate' && data.user_id !== currentUser.id) {
                  setCandidateJoined(true);
                  toast.success(`${data.username} has joined the session!`, {
                    style: { background: '#1e40af', color: '#ffffff' },
                  });
                }
                break;

              case "user_left":
                setOnlineUsers(prev => prev.filter(user => user.user_id !== data.user_id));
                const leftUser = onlineUsers.find(user => user.user_id === data.user_id);
                if (leftUser?.role === 'candidate') {
                  setCandidateJoined(false);
                  toast.error(`${data.username} has left the session`, {
                    style: { background: '#dc2626', color: '#ffffff' },
                  });
                }
                setCollaboratorCursors(prev => {
                  const newCursors = { ...prev };
                  delete newCursors[data.user_id];
                  return newCursors;
                });
                break;

              case "language_change":
                if (data.user_id !== currentUser.id) {
                  setLanguage(data.language);
                }
                break;

              case "chat_message":
                setChatMessages(prev => [...prev, {
                  user_id: data.user_id,
                  username: data.username,
                  message: data.message,
                  timestamp: data.timestamp
                }]);
                break;

              case "error":
                toast.error(data.message, {
                  style: { background: '#dc2626', color: '#ffffff' },
                });
                addDebugLog(`Server error: ${data.message}`, 'error');
                break;

              default:
                addDebugLog(`Unknown message type: ${data.type}`, 'warning');
            }
          } catch (error) {
            addDebugLog(`Error parsing WebSocket message: ${error.message}`, 'error');
          }
        };

        socket.onerror = (error) => {
          console.error(`WebSocket error: ${error}`);
        };

        socket.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
          clearInterval(heartbeatIntervalRef.current);
          
          if (!event.wasClean) {
            toast.error('Connection lost. Reconnecting...', {
              style: { background: '#dc2626', color: '#ffffff' },
            });
            
            setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 3000);
          }
        };

        socketRef.current = socket;

      } catch (error) {
        console.error(`Failed to connect WebSocket: ${error.message}`);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      clearInterval(heartbeatIntervalRef.current);
      
      // Clean up file URLs
      Object.values(fileUrlsCache.current).forEach(url => {
        if (typeof url === 'string') {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [sessionId, currentUser.role]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          toast('Interview time has ended!', {
            icon: '⏰',
            style: { background: '#dc2626', color: '#ffffff' },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Helper functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // WebSocket send functions
  const sendMessage = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      console.log(`Sent WebSocket message: ${data.type}`);
    } else {
      console.error('WebSocket not connected, cannot send message');
      toast.error('Not connected to server', {
        style: { background: '#dc2626', color: '#ffffff' },
      });
    }
  };

  const sendCodeChange = (content) => {
    sendMessage({
      type: "code_change",
      content: content,
      language: language
    });
  };

  const sendCursorMove = (line, column) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current > 100) {
      sendMessage({
        type: "cursor_move",
        line: line,
        column: column
      });
      lastBroadcastRef.current = now;
    }
  };

  const sendQuestionUpdate = (content, fileData = null) => {
    sendMessage({
      type: "question_update",
      content: content,
      file_data: fileData
    });
  };

  const sendVideoToggle = (enabled) => {
    sendMessage({
      type: "video_toggle",
      enabled: enabled
    });
  };

  const sendTimerUpdate = (remainingTime, isRunning) => {
    sendMessage({
      type: "timer_update",
      remaining_time: remainingTime,
      is_running: isRunning
    });
  };

  const sendLanguageChange = (newLanguage) => {
    sendMessage({
      type: "language_change",
      language: newLanguage
    });
  };

  const sendChatMessage = (message) => {
    sendMessage({
      type: "chat_message",
      message: message
    });
  };

  // CORRECTED: Send code to backend via WebSocket
  const sendRunCode = () => {
    if (!code.trim()) {
      toast.error('Please write some code first', {
        style: { background: '#dc2626', color: '#ffffff' },
      });
      return;
    }

    setIsRunning(true);
    console.log(`Sending code for execution: ${language}`);
    
    // Send code to backend via WebSocket
    sendMessage({
      type: "run_code",
      code: code,
      language: language,
      user_id: currentUser.id,
      username: currentUser.username
    });
    
    // Show loading message immediately
    const timestamp = new Date().toLocaleTimeString();
    const loadingMessage = `[${timestamp}] ${language.toUpperCase()} Runtime\n> Sending code to backend for execution...\n> Waiting for server response...`;
    setOutput(loadingMessage);
    
    // Set timeout for response
    setTimeout(() => {
      if (isRunning) {
        console.warn('No response from server, checking connection...');
        setOutput(prev => prev + '\n> Still waiting for server response...');
      }
    }, 5000);
  };

  // Alternative: Direct REST API call to backend
  const runCodeViaRestAPI = async () => {
    try {
      setIsRunning(true);
      const timestamp = new Date().toLocaleTimeString();
      setOutput(`[${timestamp}] ${language.toUpperCase()} Runtime\n> Sending code to backend via REST API...`);
      
      // Try direct API endpoint
      const apiUrl = `${apiEndpoint}/interview/api/execute/`;
      console.log(`Calling REST API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language,
          input_data: "",
          session_id: sessionId,
          user_id: currentUser.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`API response received: ${result.status}`);
      
      const formattedOutput = `[${timestamp}] ${language.toUpperCase()} Runtime
> Compiling code...
> Code ${result.status === 'success' ? 'executed successfully' : 'execution failed'}!
> 
> Output:
${result.output || 'No output'}
> 
> Process completed`;
      
      setOutput(formattedOutput);
      
      // Broadcast to other users via WebSocket
      sendMessage({
        type: "run_code",
        output: formattedOutput,
        language: language,
        user_id: currentUser.id,
        username: currentUser.username
      });
      
      toast.success('Code executed via REST API', {
        style: { background: '#10b981', color: '#ffffff' },
      });
      
    } catch (error) {
      const errorMessage = `[${new Date().toLocaleTimeString()}] ${language.toUpperCase()} Runtime\n> Error: ${error.message}\n> Please check backend connection`;
      setOutput(errorMessage);
      console.error(`REST API error: ${error.message}`);
      
      toast.error('Failed to execute code', {
        style: { background: '#dc2626', color: '#ffffff' },
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Handle run code button click
  const handleRunCode = () => {
    // First try WebSocket, fallback to REST API
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      sendRunCode();
    } else {
      addDebugLog('WebSocket not connected, trying REST API', 'warning');
      runCodeViaRestAPI();
    }
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const response = await fetch(`${apiEndpoint}/interview/api/health/`);
      const data = await response.json();
      console.log(`Backend health: ${data.status}`);
      toast.success(`Backend is ${data.status}`, {
        style: { background: '#10b981', color: '#ffffff' },
      });
      return data.status === 'healthy';
    } catch (error) {
      console.error(`Backend connection failed: ${error.message}`);
      toast.error('Cannot connect to backend', {
        style: { background: '#dc2626', color: '#ffffff' },
      });
      return false;
    }
  };

  // Editor functions
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    editor.onDidChangeCursorPosition((e) => {
      const cursorPos = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      };
      setCursorPosition(cursorPos);
      sendCursorMove(cursorPos.lineNumber, cursorPos.column);
    });
  };

  const handleEditorChange = (value) => {
    setCode(value);
    sendCodeChange(value);
  };

  const handleLanguageChange = (newLanguage) => {
    const oldLanguage = language;
    setLanguage(newLanguage);
    sendLanguageChange(newLanguage);
    
    // Update code to default template for new language
    const defaultCode = getDefaultCode(newLanguage);
    if (code === getDefaultCode(oldLanguage) || codeVersion === 0) {
      setCode(defaultCode);
      sendCodeChange(defaultCode);
    }
  };

  const sendChat = () => {
    if (newMessage.trim()) {
      sendChatMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or DOCX file', {
        style: {
          background: '#dc2626',
          color: '#ffffff',
        },
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64File = e.target.result.split(',')[1]; // Remove data URL prefix
          
          // Create file data object
          const fileData = {
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_content: base64File,
            uploaded_by: currentUser.username,
            uploaded_at: new Date().toISOString()
          };

          // Store file blob in cache for sharing
          setFileBlobCache(prev => ({
            ...prev,
            [file.name]: file
          }));
          
          // Create file URL for uploader
          const blob = await fetch(`data:${file.type};base64,${base64File}`).then(res => res.blob());
          const fileUrl = URL.createObjectURL(blob);
          fileUrlsCache.current[file.name] = fileUrl;
          setSharedFileUrl(fileUrl);

          // Update state
          setSharedQuestionFile(fileData);
          setSharedQuestionContent(`File: ${file.name}`);
          
          // Send to other users via WebSocket
          sendQuestionUpdate(`File: ${file.name}`, fileData);
          
          // Save to localStorage
          localStorage.setItem(`interviewQuestion_${sessionId}`, JSON.stringify({
            content: `File: ${file.name}`,
            fileData: fileData
          }));

          // Close popup
          setShowQuestionUploadPopup(false);
          
          // Show success message
          toast.success('File uploaded successfully!', {
            style: {
              background: '#10b981',
              color: '#ffffff',
            },
          });
        } catch (error) {
          console.error('File processing error:', error);
          toast.error('Failed to process file. Please try again.', {
            style: {
              background: '#dc2626',
              color: '#ffffff',
            },
          });
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file. Please try again.', {
          style: {
            background: '#dc2626',
            color: '#ffffff',
          },
        });
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file. Please try again.', {
        style: {
          background: '#dc2626',
          color: '#ffffff',
        },
      });
      setIsUploading(false);
    }
  };

  // Manual question handler
  const handleManualQuestion = () => {
    const content = `Manual Question Set
Uploaded by: ${currentUser.username}
Time: ${new Date().toLocaleTimeString()}

Interview Questions
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
    
    setSharedQuestionContent(content);
    setSharedQuestionFile(null);
    setSharedFileUrl(null);
    
    // Save to localStorage
    localStorage.setItem(`interviewQuestion_${sessionId}`, JSON.stringify({
      content: content,
      fileData: null
    }));
    
    // Send to all users
    sendQuestionUpdate(content);
    
    setShowQuestionUploadPopup(false);
    
    toast.success('Question set added and shared with all participants!', {
      style: {
        background: '#1e40af',
        color: '#ffffff',
      },
    });
  };

  // Layout toggle functions
  const toggleQuestions = () => {
    if (!sharedQuestionContent && !sharedQuestionFile) {
      setShowQuestionUploadPopup(true);
      return;
    }
    setShowQuestions(!showQuestions);
  };
  const toggleVideoPanel = () => setIsVideoOpen(!isVideoOpen);
  const toggleQuestionsPanel = () => setQuestionsPanelCollapsed(!questionsPanelCollapsed);
  const toggleChat = () => setShowChat(!showChat);
  const toggleInterviewerVideo = () => {
    const newStatus = !isInterviewerVideoOn;
    setIsInterviewerVideoOn(newStatus);
    sendVideoToggle(newStatus);
  };
  
  const toggleCandidateVideo = () => {
    if (candidateJoined) {
      const newStatus = !isCandidateVideoOn;
      setIsCandidateVideoOn(newStatus);
      sendVideoToggle(newStatus);
    }
  };

  // Timer functions
  const toggleTimer = () => {
    const newStatus = !isTimerRunning;
    setIsTimerRunning(newStatus);
    sendTimerUpdate(timeRemaining, newStatus);
  };

  const resetTimer = () => {
    const newTime = 3600;
    setTimeRemaining(newTime);
    setIsTimerRunning(true);
    sendTimerUpdate(newTime, true);
  };

  // Default code templates
  const getDefaultCode = (lang) => {
    switch (lang) {
      case 'python':
        return '# Write your code here\ndef solution():\n    print("Hello from Python!")\n    return 0\n\nsolution()';
      case 'javascript':
        return '// Write your code here\nfunction solution() {\n    console.log("Hello from JavaScript!");\n    return 0;\n}\n\nsolution();';
      case 'java':
        return '// Write your code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}';
      case 'cpp':
        return '// Write your code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++!" << endl;\n    return 0;\n}';
      case 'c':
        return '// Write your code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}';
      default:
        return '// Write your code here...';
    }
  };

  // Layout width calculations
  const getLeftPanelWidth = () => !isVideoOpen ? 'w-0' : 'w-1/2';
  const getEditorWidth = () => !isVideoOpen ? 'w-full' : 'w-1/2';
  const getVideosWidth = () => showQuestions && !questionsPanelCollapsed ? 'w-1/4' : 'w-full';
  const getQuestionsWidth = () => showQuestions && !questionsPanelCollapsed ? 'w-3/4' : 'w-0';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5" />
            Interview Session
            <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {currentUser.role === 'interviewer' ? 'Interviewer' : 'Candidate'} • {sessionId?.substring(0, 8) || 'loading...'}
            </span>
          </h1>
          <div className="flex items-center bg-blue-50 px-3 py-1 rounded">
            <Clock className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-blue-700 font-medium">{formatTime(timeRemaining)}</span>
            <button 
              onClick={toggleTimer}
              className="ml-2 text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
            >
              {isTimerRunning ? 'Pause' : 'Resume'}
            </button>
          </div>
          <button 
            onClick={testBackendConnection}
            className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            Test Connection
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${socketRef.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {socketRef.current?.readyState === WebSocket.OPEN ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Online: {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}
          </div>
          <button 
            onClick={toggleChat}
            className={`p-2 rounded ${showChat ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-grow">
        {/* Left Panel */}
        {isVideoOpen && (
          <div className={`${getLeftPanelWidth()} flex transition-all duration-300 ease-in-out flex-grow overflow-visible`}>
            {/* Videos Panel */}
            <div className={`${getVideosWidth()} flex flex-col border-r bg-gray-900 transition-all duration-300 ease-in-out flex-shrink-0`}>
              <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Participants ({onlineUsers.length})</span>
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

              {/* Videos List - Simplified for now */}
              <div className="flex-1 p-2 flex flex-col space-y-3">
                {/* Interviewer Video Card */}
                <div className="bg-gray-800 rounded-lg flex flex-col h-[calc(50%-12px)]">
                  <div className="relative bg-gray-700 pt-2 pb-2 flex-grow">
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
                <div className="bg-gray-800 rounded-lg flex flex-col h-[calc(50%-12px)]">
                  <div className="relative bg-gray-700 pt-2 pb-2 flex-grow">
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
                    {!candidateJoined && currentUser.role === 'interviewer' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                        {!invitationSent ? (
                          <button 
                            onClick={() => setShowInvitePopup(true)}
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
                  </div>
                  <div className="p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs">
                        {candidateJoined ? 'Candidate' : 'Waiting...'}
                      </span>
                      {candidateJoined && currentUser.role === 'interviewer' && (
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
              </div>
            </div>

            {/* Questions Panel - Simplified for now */}
            {showQuestions && (
              <div className={`${getQuestionsWidth()} flex flex-col bg-white border-r transition-all duration-300 ease-in-out flex-grow`}>
                <div className="p-3 border-b flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Shared Questions</span>
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

                <div className="flex-1 p-4 overflow-auto">
                  {sharedQuestionContent ? (
                    sharedQuestionFile && sharedQuestionFile.file_type === 'application/pdf' ? (
                      // PDF File - now all users can view the PDF
                      sharedFileUrl ? (
                        <div className="flex flex-col h-full">
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <File className="w-4 h-4 text-blue-600 mr-2" />
                                <div>
                                  <p className="font-medium text-blue-800 text-sm">
                                    PDF: {sharedQuestionFile.file_name}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {(sharedQuestionFile.file_size / 1024).toFixed(2)} KB • Uploaded by {sharedQuestionFile.uploaded_by}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = sharedFileUrl;
                                    link.download = sharedQuestionFile.file_name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                                <button
                                  onClick={() => {
                                    window.open(sharedFileUrl, '_blank');
                                  }}
                                  className="bg-green-800 hover:bg-green-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                  Open Full
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-grow border rounded-lg overflow-hidden bg-gray-100">
                            <PDFViewer fileUrl={sharedFileUrl} fileName={sharedQuestionFile.file_name} />
                          </div>
                          
                          <div className="mt-4 p-4 bg-gray-50 rounded border flex-shrink-0">
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex justify-between">
                                <span>Uploaded by:</span>
                                <span className="font-medium">{sharedQuestionFile.uploaded_by}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Uploaded at:</span>
                                <span className="font-medium">{new Date(sharedQuestionFile.uploaded_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full">
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <File className="w-4 h-4 text-yellow-600 mr-2" />
                                <div>
                                  <p className="font-medium text-yellow-800 text-sm">
                                    PDF Shared: {sharedQuestionFile.file_name}
                                  </p>
                                  <p className="text-xs text-yellow-600">
                                    {(sharedQuestionFile.file_size / 1024).toFixed(2)} KB • Uploaded by {sharedQuestionFile.uploaded_by}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => toast.info(`Contact ${sharedQuestionFile.uploaded_by} to get the PDF file.`)}
                                className="bg-yellow-800 hover:bg-yellow-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Request File
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex-grow flex items-center justify-center">
                            <div className="text-center">
                              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 mb-4">Preparing PDF for viewing...</p>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // Regular text content
                      <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                        {sharedQuestionContent}
                      </div>
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                      <FileText className="w-12 h-12 mb-3" />
                      <p className="text-sm">No questions available</p>
                      <button 
                        onClick={() => setShowQuestionUploadPopup(true)}
                        className="mt-4 bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded text-sm"
                      >
                        Upload Questions
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t">
                  <button 
                    onClick={() => setShowQuestionUploadPopup(true)}
                    className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3 h-3" />
                    Update Shared Questions
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Updates will be visible to all participants
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Code Editor */}
        <div className={`${getEditorWidth()} flex flex-col transition-all duration-300 ease-in-out`}>
          <div className="p-4 border-b flex justify-between items-center bg-white">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Collaborative Code Editor</h2>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Connected to Backend
              </span>
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
            <div className="flex items-center space-x-4">
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={isRunning}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>
              <div className="text-sm text-gray-600">
                Line {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </div>
              <button 
                onClick={handleRunCode}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-sm flex items-center gap-1 transition-colors ${isRunning ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-900 text-white'}`}
              >
                <Play className="w-4 h-4" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
              
              {Object.values(collaboratorCursors).map((cursor, index) => (
                <div 
                  key={index}
                  className="absolute w-0.5 h-6 bg-yellow-400 animate-pulse z-10"
                  style={{
                    top: `${(cursor.lineNumber - 1) * 20}px`,
                    left: `${(cursor.column - 1) * 8}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {cursor.username}
                  </div>
                </div>
              ))}
              
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                Version: {codeVersion} • {Object.keys(collaboratorCursors).length} collaborator{Object.keys(collaboratorCursors).length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="h-1/3 bg-black text-green-400 p-4 font-mono text-sm overflow-auto">
              <div className="mb-2 flex items-center justify-between">
                <span>Backend Compiler Output</span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setOutput('')}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap">{output || `$ Ready to execute ${language} code\n$ Using backend WebSocket connection`}</div>
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
              Update Shared Questions
            </h2>
            <p className="text-gray-600 mb-4">Upload a file or add questions manually. Will be visible to all participants.</p>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Upload PDF or DOCX file</p>
                <label className={`px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2 transition-colors mb-2 ${
                  isUploading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-800 hover:bg-blue-900 text-white'
                }`}>
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Choose File'}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx"
                    disabled={isUploading}
                    className="hidden" 
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">Supported formats: PDF, DOCX</p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Or add questions manually</h3>
                <p className="text-sm text-gray-600 mb-4">Type questions that will be visible to all</p>
                <button 
                  onClick={handleManualQuestion}
                  disabled={isUploading}
                  className={`w-full py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${
                    isUploading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gray-800 hover:bg-gray-900 text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Use Sample Questions
                </button>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowQuestionUploadPopup(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Test Modal */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={testBackendConnection}
          className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
          title="Test Backend Connection"
        >
          <Play className="w-5 h-5" />
        </button>
      </div>    </div>
  );
};

export default InterviewSession;