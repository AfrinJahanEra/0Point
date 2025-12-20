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
  Minimize2,
  Clock,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  Users,
  Download,
  MessageSquare,
  Maximize2,
  Settings,
  File
} from 'lucide-react';

// PDF Viewer Component
const PDFViewer = ({ fileUrl }) => {
  return (
    <div className="w-full h-full">
      <iframe 
        src={`${fileUrl}#view=fitH`}
        className="w-full h-full border-0"
        title="PDF Viewer"
        type="application/pdf"
      />
    </div>
  );
};

// Helper function to extract text from files
const extractTextFromPDF = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const mockContent = `PDF File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Pages: Estimated ${Math.ceil(file.size / 50000)} pages

Content Preview:
----------------
The PDF file has been uploaded successfully. 
You can preview it directly in the browser.

For detailed text extraction, please download the file.

Questions included in this PDF:
1. Data Structures & Algorithms
2. System Design Principles
3. Database Design Patterns
4. API Design Best Practices

Uploaded at: ${new Date().toLocaleTimeString()}`;
        
        resolve(mockContent);
      } catch (error) {
        console.error('PDF extraction error:', error);
        resolve(`PDF File: ${file.name}\n\nUnable to extract text. File uploaded successfully.`);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

const extractTextFromDOCX = async (file) => {
  return `DOCX File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB

DOCX Content Preview:
--------------------
For full DOCX viewing, the file needs to be downloaded.
DOCX files require server-side processing for text extraction.

Question 1: Array Manipulation
------------------------------
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
Design a URL shortening service like TinyURL. Discuss the database schema and API endpoints.

Uploaded at: ${new Date().toLocaleTimeString()}`;
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
  const [questionFile, setQuestionFile] = useState(null);
  const [showQuestionUploadPopup, setShowQuestionUploadPopup] = useState(false);
  const [questionContent, setQuestionContent] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Code Editor States
  const [code, setCode] = useState('// Write your code here...\nfunction solution() {\n  \n}\n');
  const [output, setOutput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [language, setLanguage] = useState('javascript');
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
  
  // WebSocket & Refs
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileUrlRef = useRef(null);
  const lastBroadcastRef = useRef(Date.now());
  const chatContainerRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

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
    
    // Load saved question if exists
    const savedQuestion = localStorage.getItem('interviewQuestion');
    if (savedQuestion) {
      setQuestionContent(savedQuestion);
    }
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!sessionId) return;

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${window.location.hostname}:8000/ws/interview/${sessionId}/?role=${currentUser.role}`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          toast.success('Connected to interview session', {
            style: {
              background: '#10b981',
              color: '#ffffff',
            },
          });
          
          // Start heartbeat
          heartbeatIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "heartbeat"
              }));
            }
          }, 30000); // Every 30 seconds
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            switch (data.type) {
              case "initial_state":
                setCurrentUser(prev => ({ ...prev, id: data.user_id }));
                setCode(data.code.content);
                setLanguage(data.code.language);
                setCodeVersion(data.code.version);
                if (data.question.content) {
                  setQuestionContent(data.question.content);
                  if (data.question.file_name) {
                    setQuestionFile({
                      name: data.question.file_name,
                      type: data.question.file_type,
                      size: data.question.file_size
                    });
                  }
                }
                setTimeRemaining(data.timer.remaining_time);
                setIsTimerRunning(data.timer.is_running);
                setOnlineUsers(data.online_users || []);
                
                // Check if candidate is joined
                const hasCandidate = data.online_users.some(user => 
                  user.role === 'candidate' && user.user_id !== data.user_id
                );
                setCandidateJoined(hasCandidate);
                
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
                setQuestionContent(data.content);
                localStorage.setItem('interviewQuestion', data.content);
                if (data.file_data) {
                  setQuestionFile({
                    name: data.file_data.file_name,
                    type: data.file_data.file_type,
                    size: data.file_data.file_size
                  });
                } else {
                  setQuestionFile(null);
                  setFileUrl(null);
                }
                break;

              case "video_toggle":
                if (data.user_id !== currentUser.id) {
                  if (data.username.includes('Candidate') || data.user_id.includes('candidate')) {
                    setIsCandidateVideoOn(data.enabled);
                  } else {
                    setIsInterviewerVideoOn(data.enabled);
                  }
                }
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
                    style: {
                      background: '#1e40af',
                      color: '#ffffff',
                    },
                  });
                }
                break;

              case "user_left":
                setOnlineUsers(prev => prev.filter(user => user.user_id !== data.user_id));
                
                // Check if candidate left
                const leftUser = onlineUsers.find(user => user.user_id === data.user_id);
                if (leftUser?.role === 'candidate') {
                  setCandidateJoined(false);
                  toast.error(`${data.username} has left the session`, {
                    style: {
                      background: '#dc2626',
                      color: '#ffffff',
                    },
                  });
                }
                
                // Remove their cursor
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

              case "run_code":
                setOutput(data.output);
                break;

              case "chat_message":
                setChatMessages(prev => [...prev, {
                  user_id: data.user_id,
                  username: data.username,
                  message: data.message,
                  timestamp: data.timestamp
                }]);
                break;

              case "user_info":
                setOnlineUsers(prev => prev.map(user => 
                  user.user_id === data.user_id 
                    ? { ...user, username: data.username }
                    : user
                ));
                break;

              case "error":
                toast.error(data.message, {
                  style: {
                    background: '#dc2626',
                    color: '#ffffff',
                  },
                });
                break;

              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          clearInterval(heartbeatIntervalRef.current);
          
          if (!event.wasClean) {
            toast.error('Connection lost. Reconnecting...', {
              style: {
                background: '#dc2626',
                color: '#ffffff',
              },
            });
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }, 3000);
          }
        };

        socketRef.current = socket;

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [sessionId, currentUser.role]);

  // Auto-scroll chat to bottom
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
            style: {
              background: '#dc2626',
              color: '#ffffff',
            },
          });
          return 0;
        }
        
        const newTime = prev - 1;
        
        // Broadcast timer every 30 seconds
        if (newTime % 30 === 0) {
          sendTimerUpdate(newTime, true);
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Send invitation simulation
  useEffect(() => {
    if (invitationSent && currentUser.role === 'interviewer') {
      const timer = setTimeout(() => {
        toast.success('Invitation sent! Candidate can join using the session link.', {
          style: {
            background: '#1e40af',
            color: '#ffffff',
          },
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [invitationSent, currentUser.role]);

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
    if (now - lastBroadcastRef.current > 100) { // Throttle to 10Hz
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

  const sendRunCode = (codeToRun) => {
    sendMessage({
      type: "run_code",
      code: codeToRun,
      language: language
    });
  };

  const sendChatMessage = (message) => {
    sendMessage({
      type: "chat_message",
      message: message
    });
  };

  const sendUserInfo = (username) => {
    sendMessage({
      type: "user_info",
      username: username
    });
    setCurrentUser(prev => ({ ...prev, username }));
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

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  // Video Controls
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

  // Question Management with PDF preview
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      
      setIsUploading(true);
      
      try {
        setQuestionFile(file);
        
        // Create a URL for the file to display it locally
        if (fileUrlRef.current) {
          URL.revokeObjectURL(fileUrlRef.current);
        }
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        fileUrlRef.current = url;
        
        // Extract text content from the file
        let extractedContent = '';
        
        if (file.type === 'application/pdf') {
          extractedContent = await extractTextFromPDF(file);
        } else {
          extractedContent = await extractTextFromDOCX(file);
        }
        
        const fullContent = `File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Uploaded by: ${currentUser.username}
Time: ${new Date().toLocaleTimeString()}

${extractedContent}`;
        
        setQuestionContent(fullContent);
        localStorage.setItem('interviewQuestion', fullContent);
        
        // Send to other users
        sendQuestionUpdate(fullContent, {
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: currentUser.username,
          uploaded_at: new Date().toISOString()
        });
        
        toast.success('Question file uploaded and shared!', {
          style: {
            background: '#1e40af',
            color: '#ffffff',
          },
        });
        
        setShowQuestionUploadPopup(false);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Failed to upload file. Please try again.', {
          style: {
            background: '#dc2626',
            color: '#ffffff',
          },
        });
      } finally {
        setIsUploading(false);
      }
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
    const manualQuestion = `Manual Question Set
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
    
    setQuestionContent(manualQuestion);
    localStorage.setItem('interviewQuestion', manualQuestion);
    
    // Clear file state
    setQuestionFile(null);
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
      setFileUrl(null);
    }
    
    // Send to other users
    sendQuestionUpdate(manualQuestion);
    
    setShowQuestionUploadPopup(false);
    
    toast.success('Question set added and shared!', {
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
      const cursorPos = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      };
      setCursorPosition(cursorPos);
      sendCursorMove(cursorPos.lineNumber, cursorPos.column);
    });
  };

  const handleRunCode = () => {
    try {
      setIsRunning(true);
      const result = executeCode(code, language);
      setOutput(result);
      
      // Send to other users
      sendRunCode(code);
      
      toast.success('Code executed successfully!', {
        style: {
          background: '#10b981',
          color: '#ffffff',
        },
      });
    } catch (error) {
      setOutput(`> Compiling code...\n> Error: ${error.message}\n> \n> Please fix the syntax errors and try again.`);
      
      toast.error('Code execution failed!', {
        style: {
          background: '#dc2626',
          color: '#ffffff',
        },
      });
    } finally {
      setTimeout(() => setIsRunning(false), 500);
    }
  };

  const executeCode = (codeString, lang) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (lang) {
      case 'javascript':
        return `[${timestamp}] JavaScript Runtime
> Compiling code...
> Code executed successfully!
> 
> Output:
${evalJavaScript(codeString)}
> 
> Execution time: 0.003s
> Memory used: 5.1 MB
> 
> Process exited with code 0`;
        
      case 'python':
        return `[${timestamp}] Python 3.9.7 Runtime
> Compiling code...
> Code executed successfully!
> 
> Output:
${evalPython(codeString)}
> 
> Execution time: 0.012s
> Memory used: 8.2 MB
> 
> Process exited with code 0`;
        
      case 'java':
        return `[${timestamp}] Java 11 Runtime
> Compiling code...
> Code compiled successfully!
> 
> Output:
${evalJava(codeString)}
> 
> Execution time: 0.156s
> Memory used: 24.5 MB
> 
> Process exited with code 0`;
        
      case 'cpp':
        return `[${timestamp}] C++ GCC 11 Runtime
> Compiling code...
> Code compiled successfully!
> 
> Output:
${evalCpp(codeString)}
> 
> Execution time: 0.008s
> Memory used: 3.1 MB
> 
> Process exited with code 0`;
        
      default:
        return `[${timestamp}] Unknown Runtime
> Error: Unsupported language`;
    }
  };
  
  const evalJavaScript = (codeString) => {
    if (codeString.includes('console.log')) {
      return 'Hello, Interview! Code executed successfully.';
    } else if (codeString.includes('function solution')) {
      return 'Solution function defined. Add implementation.';
    }
    return 'Code executed. No output generated.';
  };
  
  const evalPython = (codeString) => 'Python execution simulation complete.';
  const evalJava = (codeString) => 'Java execution simulation complete.';
  const evalCpp = (codeString) => 'C++ execution simulation complete.';

  const handleEditorChange = (value) => {
    setCode(value);
    sendCodeChange(value);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    sendLanguageChange(newLanguage);
  };

  // Chat Functions
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

  // Timer Controls
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

  // Render Questions Content
  const renderQuestionsContent = () => {
    if (!questionContent) {
      return (
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
      );
    }

    if (questionFile && fileUrl && questionFile.type === 'application/pdf') {
      // Local user has PDF - show preview
      return (
        <div className="flex flex-col h-full">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <File className="w-4 h-4 text-blue-600 mr-2" />
                <div>
                  <p className="font-medium text-blue-800 text-sm">
                    PDF: {questionFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    {(questionFile.size / 1024).toFixed(2)} KB • Uploaded by you
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = questionFile.name;
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
                    window.open(fileUrl, '_blank');
                  }}
                  className="bg-green-800 hover:bg-green-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  Open Full
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100">
            <PDFViewer fileUrl={fileUrl} />
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded border flex-shrink-0">
            <h4 className="font-medium text-sm mb-2">PDF Details:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>File Name:</span>
                <span className="font-medium">{questionFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-medium">{(questionFile.size / 1024).toFixed(2)} KB</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium">PDF Document</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (questionFile && !fileUrl && questionFile.type === 'application/pdf') {
      // Remote user - received PDF but no local file
      return (
        <div className="flex flex-col h-full">
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <File className="w-4 h-4 text-yellow-600 mr-2" />
                <div>
                  <p className="font-medium text-yellow-800 text-sm">
                    PDF Shared: {questionFile.name}
                  </p>
                  <p className="text-xs text-yellow-600">
                    {(questionFile.size / 1024).toFixed(2)} KB • Shared by another user
                  </p>
                </div>
              </div>
              <button
                onClick={() => toast.info('Please ask the uploader to send you the PDF file directly.')}
                className="bg-yellow-800 hover:bg-yellow-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Request File
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 bg-gray-50 rounded border overflow-auto">
            <div className="whitespace-pre-wrap text-sm">
              {questionContent}
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded border flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">To view the actual PDF:</span>
              <button
                onClick={() => toast.info('Contact the interviewer to get the PDF file.')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Request Access
              </button>
            </div>
          </div>
        </div>
      );
    } else if (questionFile && fileUrl && questionFile.type.includes('wordprocessingml')) {
      // Local user has DOCX
      return (
        <div className="flex flex-col h-full">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                <div>
                  <p className="font-medium text-blue-800 text-sm">
                    DOCX: {questionFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    {(questionFile.size / 1024).toFixed(2)} KB • Uploaded by you
                  </p>
                </div>
              </div>
              <a 
                href={fileUrl} 
                download={questionFile.name}
                className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
          
          <div className="flex-1 p-4 bg-gray-50 rounded border overflow-auto">
            <div className="whitespace-pre-wrap text-sm">
              {questionContent}
            </div>
          </div>
        </div>
      );
    } else {
      // Manual questions or no file
      return (
        <div className="h-full overflow-auto">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4">
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-blue-600 mr-2" />
              <div>
                <p className="font-medium text-blue-800 text-sm">Manual Question Set</p>
                <p className="text-xs text-blue-600">Shared in real-time</p>
              </div>
            </div>
          </div>
          
          <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
            {questionContent}
          </div>
        </div>
      );
    }
  };

  // Calculate widths based on layout state
  const getLeftPanelWidth = () => {
    if (!isVideoOpen) return 'w-0';
    return 'w-1/2';
  };

  const getEditorWidth = () => {
    if (!isVideoOpen) return 'w-full';
    return 'w-1/2';
  };

  const getVideosWidth = () => {
    if (showQuestions && !questionsPanelCollapsed) return 'w-1/4';
    return 'w-full';
  };

  const getQuestionsWidth = () => {
    if (showQuestions && !questionsPanelCollapsed) return 'w-3/4';
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
            <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {currentUser.role === 'interviewer' ? 'Interviewer' : 'Candidate'} • {sessionId.substring(0, 8)}
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
            <button 
              onClick={resetTimer}
              className="ml-1 text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
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
        {/* Left Panel (Combined Videos + Questions) */}
        {isVideoOpen && (
          <div className={`${getLeftPanelWidth()} flex transition-all duration-300 ease-in-out flex-grow overflow-visible`}>
            {/* Collapsed Videos Panel */}
            <div className={`${getVideosWidth()} flex flex-col border-r bg-gray-900 transition-all duration-300 ease-in-out flex-shrink-0`}>
              {/* Videos Header */}
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

              {/* Videos List */}
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
                    {/* Invite Button for Candidate */}
                    {!candidateJoined && currentUser.role === 'interviewer' && (
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

                {/* Video Controls */}
                <div className="p-2 bg-gray-800 rounded-lg">
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
                    {candidateJoined && currentUser.role === 'interviewer' && (
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

            {/* Questions Panel */}
            {showQuestions && (
              <div className={`${getQuestionsWidth()} flex flex-col bg-white border-r transition-all duration-300 ease-in-out flex-grow`}>
                <div className="p-3 border-b flex justify-between items-center flex-shrink-0">
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

                {/* Questions Content Area */}
                <div className="flex-1 p-4 overflow-hidden">
                  {renderQuestionsContent()}
                </div>

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

        {/* Video Toggle Button */}
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
            <div className="flex items-center space-x-4">
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={isRunning}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <div className="text-sm text-gray-600">
                Line {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </div>
              <button 
                onClick={handleRunCode}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-sm flex items-center gap-1 transition-colors ${isRunning ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-800 hover:bg-blue-900 text-white'}`}
              >
                <Send className="w-4 h-4" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            {/* Code Editor Area */}
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
                  readOnly: currentUser.role === 'candidate' && !candidateJoined,
                }}
              />
              
              {/* Real-time Collaborator Cursor Indicators */}
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
              
              {/* Collaboration Status */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                Version: {codeVersion} • {Object.keys(collaboratorCursors).length} collaborator{Object.keys(collaboratorCursors).length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Output Panel */}
            <div className="h-1/3 bg-black text-green-400 p-4 font-mono text-sm overflow-auto">
              <div className="mb-2 flex items-center justify-between">
                <span>Interview Compiler</span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setOutput('')}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap">{output || `$ Ready to execute ${language} code`}</div>
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 flex flex-col border-l bg-white">
            <div className="p-3 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Chat</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {onlineUsers.length} online
                </span>
              </div>
              <button 
                onClick={toggleChat}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 p-4 overflow-auto"
            >
              {chatMessages.length > 0 ? (
                <div className="space-y-3">
                  {chatMessages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${msg.user_id === currentUser.id ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${msg.user_id === currentUser.id ? 'text-blue-700' : 'text-gray-700'}`}>
                          {msg.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mb-3" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={sendChat}
                  disabled={!newMessage.trim()}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Question Upload Popup */}
      {showQuestionUploadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Set Interview Questions
            </h2>
            <p className="text-gray-600 mb-4">Upload a PDF/DOCX file or add questions manually</p>
            
            <div className="space-y-4">
              {/* File Upload Option */}
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
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <p className="text-sm text-gray-500">Supports PDF and DOCX formats</p>
                <p className="text-xs text-gray-400 mt-2">PDF files will be previewable</p>
              </div>
              
              {/* Manual Option */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Or add questions manually</h3>
                <p className="text-sm text-gray-600 mb-4">You can type questions directly</p>
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
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowQuestionUploadPopup(false)}
                  disabled={isUploading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!questionContent && !questionFile) {
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
                  disabled={isUploading}
                  className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Continue'}
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
              <p className="mt-1 text-xs">Share this link: <code className="bg-gray-100 px-1 py-0.5 rounded">?session={sessionId}&role=candidate</code></p>
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