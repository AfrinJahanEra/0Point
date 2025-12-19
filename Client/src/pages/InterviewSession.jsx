import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import { Video, Mail, Send, User, CameraOff } from 'lucide-react';

const InterviewSession = () => {
  const [showQuestions, setShowQuestions] = useState(false);
  const [questionFile, setQuestionFile] = useState(null);
  const [candidateJoined, setCandidateJoined] = useState(false);
  const [code, setCode] = useState('// Write your code here...\nfunction solution() {\n  \n}\n');
  const [output, setOutput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [collaboratorCursor, setCollaboratorCursor] = useState(null);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const editorRef = useRef(null);
  const socketRef = useRef(null);

  // Simulate candidate joining after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setCandidateJoined(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleQuestions = () => {
    setShowQuestions(!showQuestions);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setQuestionFile(file);
    } else {
      alert('Please upload a PDF or DOCX file');
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
      
      // In a real implementation, we would send cursor position to other collaborators
      // socket.emit('cursor-move', { 
      //   lineNumber: e.position.lineNumber,
      //   column: e.position.column 
      // });
    });
  };

  const handleRunCode = () => {
    // Simulate code execution
    setOutput(`> Running code...
> Code executed successfully
> No output returned

Process exited with code 0`);
  };

  const handleEditorChange = (value, event) => {
    setCode(value);
    // In a real implementation, we would send this change to other collaborators via WebSocket
    // socket.emit('code-change', { code: value });
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

  const handleInviteClick = () => {
    setShowInvitePopup(true);
  };

  const handleSendInvite = () => {
    // Simulate sending invite
    if (inviteEmail) {
      // Close popup
      setShowInvitePopup(false);
      
      // Show success toast with dark blue theme
      toast.success('Invitation sent successfully!', {
        style: {
          background: '#1e40af', // Dark blue color
          color: '#ffffff',
        },
        iconTheme: {
          primary: '#ffffff',
          secondary: '#1e40af',
        },
      });
      
      // Reset email
      setInviteEmail('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Video className="w-5 h-5" />
          Interview Session
        </h1>
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
          <div className="text-sm text-gray-600">
            Cursor: Line {cursorPosition.lineNumber}, Column {cursorPosition.column}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Section - Video Panel */}
        <div className={`${showQuestions ? 'w-1/3' : 'w-1/2'} flex flex-col p-4 border-r`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Panel
            </h2>
            <button 
              onClick={toggleQuestions}
              className="bg-blue-800 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              {showQuestions ? 'Hide Questions' : 'Show Questions'}
            </button>
          </div>

          {/* 1 column, 2 row layout for videos */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Interviewer (Host) Video */}
            <div className="bg-gray-200 rounded-lg flex items-center justify-center relative flex-1">
              <span className="text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Interviewer
              </span>
              {!candidateJoined && (
                <div className="absolute bottom-2 right-2">
                  <button 
                    onClick={handleInviteClick}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    Invite via Email
                  </button>
                </div>
              )}
            </div>

            {/* Candidate Video */}
            <div className="bg-gray-300 rounded-lg flex items-center justify-center flex-1">
              {candidateJoined ? (
                <span className="text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Candidate
                </span>
              ) : (
                <div className="text-center">
                  <CameraOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <span className="text-gray-500 block mb-2">No one joined yet</span>
                  <button 
                    onClick={handleInviteClick}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 mx-auto"
                  >
                    <Mail className="w-3 h-3" />
                    Invite Candidate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Code Editor / IDE */}
        <div className={`${showQuestions ? 'w-2/3' : 'w-1/2'} flex flex-col`}>
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Code Editor</h2>
            <div className="flex space-x-2">
              <button 
                onClick={handleRunCode}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
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
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
              {/* Collaborator cursor indicator */}
              {collaboratorCursor && (
                <div 
                  className="absolute w-0.5 h-6 bg-yellow-400 animate-pulse"
                  style={{
                    top: `${(collaboratorCursor.lineNumber - 1) * 20}px`,
                    left: `${(collaboratorCursor.column - 1) * 8}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-1 rounded">
                    {collaboratorCursor.username}
                  </div>
                </div>
              )}
            </div>
            
            {/* Output Panel */}
            <div className="h-1/3 bg-black text-green-400 p-4 font-mono text-sm overflow-auto">
              <div className="mb-2">Interview Compiler v1.0</div>
              <div className="whitespace-pre-wrap">{output || '$ Ready to execute code'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Panel (slides in when toggled) */}
      {showQuestions && (
        <div className="absolute right-0 top-16 bottom-0 w-1/3 bg-white shadow-lg border-l p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Interview Questions
          </h2>
          {questionFile ? (
            <div>
              <p className="mb-2">Uploaded Question File:</p>
              <div className="bg-gray-100 p-3 rounded">
                <p className="font-medium">{questionFile.name}</p>
                <p className="text-sm text-gray-600">{(questionFile.size / 1024).toFixed(2)} KB</p>
              </div>
              <div className="mt-4">
                <p className="text-gray-700">Question content would be displayed here...</p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="mb-4">No question file uploaded yet</p>
              <label className="bg-blue-800 text-white px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Upload Question File
                <input 
                  type="file" 
                  accept=".pdf,.docx" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">Supports PDF and DOCX formats</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Candidate Popup */}
      {showInvitePopup && (
        <div className="fixed inset-0 bg-transparent bg-opacity-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite Candidate
            </h2>
            <p className="text-gray-600 mb-4">Enter the candidate's email address to send an invitation</p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="w-full p-3 border border-gray-300 rounded mb-4"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSendInvite}
                className="flex-1 bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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