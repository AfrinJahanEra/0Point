// QuestionPanel.jsx - UPDATED for real-time sync
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Upload, 
  Download, 
  Maximize2, 
  File,
  Save,
  RefreshCw,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PDFViewer = ({ fileUrl, fileName }) => {
  if (!fileUrl) return null;
  
  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner">
      <iframe 
        src={`${fileUrl}#view=FitH&toolbar=1&navpanes=0`}
        className="w-full h-full border-0"
        title={`PDF Viewer - ${fileName}`}
        type="application/pdf"
      />
    </div>
  );
};

const QuestionPanel = ({ 
  showQuestions, 
  setShowQuestions,
  questionsPanelCollapsed,
  setQuestionsPanelCollapsed,
  sharedQuestionContent,
  sharedQuestionFile,
  sharedFileUrl,
  setSharedFileUrl,
  currentUser,
  sessionId,
  socketRef,
  onQuestionUpdate
}) => {
  const [showQuestionUploadPopup, setShowQuestionUploadPopup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);
  
  // Fetch document from server
  const fetchDocument = async () => {
    if (!sessionId) return;
    
    setIsSyncing(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/document/?session_id=${sessionId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          if (result.content !== sharedQuestionContent) {
            setSharedQuestionContent(result.content);
            setDocumentVersion(result.document_version || 0);
            setLastUpdatedAt(result.uploaded_at || '');
            
            if (result.file_data) {
              setSharedQuestionFile(result);
              // Create blob URL if needed
              if (result.file_data && result.file_type) {
                try {
                  const byteCharacters = atob(result.file_data);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: result.file_type });
                  const fileUrl = URL.createObjectURL(blob);
                  setSharedFileUrl(fileUrl);
                } catch (error) {
                  console.error('Error creating file URL:', error);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching document:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial fetch and periodic sync
  useEffect(() => {
    if (sessionId && showQuestions) {
      fetchDocument();
      
      // Sync every 30 seconds
      const interval = setInterval(fetchDocument, 30000);
      return () => clearInterval(interval);
    }
  }, [sessionId, showQuestions]);

  // Listen for WebSocket document updates
  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'question_update') {
          // Document was updated by another user
          setSharedQuestionContent(data.content);
          if (data.file_data) {
            setSharedQuestionFile(data.file_data);
          }
          setLastUpdatedBy(data.username);
          setLastUpdatedAt(data.timestamp);
          setDocumentVersion(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socketRef.current.addEventListener('message', handleMessage);
    return () => {
      if (socketRef.current) {
        socketRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, [socketRef.current]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Accept PDF and DOCX files
    if (!file.type.includes('pdf') && !file.type.includes('wordprocessingml')) {
      toast.error('Only PDF or DOCX files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // Convert to base64 for storage
          const base64Data = e.target.result.split(',')[1];
          
          // Create file data object
          const fileData = {
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_blob: base64Data,
            uploaded_by: currentUser.username,
            uploaded_at: new Date().toISOString()
          };

          // Create content for display
          const content = `File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Uploaded by: ${currentUser.username}
Time: ${new Date().toLocaleTimeString()}`;

          // Send via WebSocket for real-time update
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: "question_update",
              content: content,
              file_data: fileData
            }));
          }

          // Also update via API for persistence
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          await fetch(`${backendUrl}/interview/api/sessions/document/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId,
              content: content,
              file_data: fileData
            }),
          });

          // Create blob URL for display
          const blob = new Blob([file], { type: file.type });
          const fileUrl = URL.createObjectURL(blob);
          
          // Update state
          setSharedQuestionContent(content);
          setSharedQuestionFile(fileData);
          setSharedFileUrl(fileUrl);
          setLastUpdatedBy(currentUser.username);
          setLastUpdatedAt(new Date().toISOString());
          setDocumentVersion(prev => prev + 1);
          
          setShowQuestionUploadPopup(false);
          toast.success('Document uploaded and shared with all participants!');
          
        } catch (error) {
          console.error('File processing error:', error);
          toast.error('Failed to process file');
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      setIsUploading(false);
    }
  };

  const handleManualQuestion = () => {
    const content = `Manual Questions
Uploaded by: ${currentUser.username}
Time: ${new Date().toLocaleTimeString()}

Interview Questions:
1. Explain your experience with React.
2. What is your approach to debugging?
3. Describe a challenging project you worked on.
4. How do you handle conflicts in a team?
5. What are your thoughts on testing methodologies?`;
    
    // Send via WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "question_update",
        content: content,
        file_data: null
      }));
    }

    // Also save via API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    fetch(`${backendUrl}/interview/api/sessions/document/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        content: content,
        file_data: null
      }),
    });

    // Update state
    setSharedQuestionContent(content);
    setSharedQuestionFile(null);
    setSharedFileUrl(null);
    setLastUpdatedBy(currentUser.username);
    setLastUpdatedAt(new Date().toISOString());
    setDocumentVersion(prev => prev + 1);
    
    setShowQuestionUploadPopup(false);
    toast.success('Questions shared with all participants!');
  };

  const handleSyncNow = () => {
    fetchDocument();
    toast.success('Syncing document...');
  };

  if (!showQuestions) return null;

  return (
    <>
      <div className={`flex flex-col bg-white transition-all duration-300 ${questionsPanelCollapsed ? 'w-12' : 'w-96'} border-l border-gray-300 h-full`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-800">Shared Questions</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  Session: {sessionId?.substring(0, 8)}
                </span>
                {lastUpdatedBy && (
                  <span className="text-gray-500">
                    Last by {lastUpdatedBy}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
              title="Sync now"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setQuestionsPanelCollapsed(!questionsPanelCollapsed)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              {questionsPanelCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setShowQuestions(false)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {sharedQuestionContent || sharedFileUrl ? (
            sharedFileUrl && sharedQuestionFile?.file_type?.includes('pdf') ? (
              <div className="h-full flex flex-col gap-5">
                {/* File info bar */}
                {sharedQuestionFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <File className="w-6 h-6 text-blue-700" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 truncate">{sharedQuestionFile.file_name}</p>
                        <div className="flex justify-between items-center text-sm text-blue-700">
                          <span>{(sharedQuestionFile.file_size / 1024).toFixed(1)} KB</span>
                          <span>v{documentVersion}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={sharedFileUrl}
                        download={sharedQuestionFile.file_name}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                      <button 
                        onClick={() => window.open(sharedFileUrl, '_blank')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
                      >
                        <Maximize2 className="w-4 h-4" /> Fullscreen
                      </button>
                    </div>
                  </div>
                )}
                
                {/* PDF Viewer */}
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <PDFViewer fileUrl={sharedFileUrl} fileName={sharedQuestionFile?.file_name} />
                </div>
              </div>
            ) : sharedFileUrl && sharedQuestionFile?.file_type?.includes('wordprocessingml') ? (
              <div className="h-full flex flex-col gap-5">
                {/* DOCX file info */}
                {sharedQuestionFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-6 h-6 text-blue-700" />
                      <div>
                        <p className="font-semibold text-blue-900">{sharedQuestionFile.file_name} (DOCX)</p>
                        <p className="text-sm text-blue-700">
                          {(sharedQuestionFile.file_size / 1024).toFixed(1)} KB • v{documentVersion}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={sharedFileUrl}
                      download={sharedQuestionFile.file_name}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" /> Download DOCX File
                    </a>
                  </div>
                )}
                
                {/* Text content */}
                {sharedQuestionContent && (
                  <div className="bg-gray-50 border rounded-xl p-6">
                    <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                      {sharedQuestionContent}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              // Text-only content
              <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Text Questions</span>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">v{documentVersion}</span>
                </div>
                <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                  {sharedQuestionContent}
                </pre>
                {lastUpdatedAt && (
                  <p className="text-xs text-gray-500 mt-4 text-right">
                    Updated: {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )
          ) : (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-20 h-20 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No questions shared yet</h3>
              <p className="text-gray-500 mb-6">Upload a PDF/DOCX or add questions for the interview</p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowQuestionUploadPopup(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload Questions File
                </button>
                <button 
                  onClick={handleManualQuestion}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Add Text Questions
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => setShowQuestionUploadPopup(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            <Upload className="w-5 h-5" />
            {sharedQuestionContent ? 'Update Questions' : 'Upload Questions'}
          </button>
          <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
            <span>Document Version: {documentVersion}</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Real-time sync
            </span>
          </div>
        </div>
      </div>

      {/* Upload Popup */}
      {showQuestionUploadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <FileText className="w-7 h-7 text-indigo-600" />
              Share Questions
            </h2>
            <p className="text-gray-600 mb-6">Upload a file or add questions. Changes sync to all participants.</p>

            <div className="space-y-5">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition">
                <Upload className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                <p className="font-medium text-gray-700 mb-2">Upload PDF or DOCX (Max 10MB)</p>
                <label className={`inline-block ${isUploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-6 py-3 rounded-lg cursor-pointer transition`}>
                  {isUploading ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 inline mr-2" />
                      Choose File
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf,.docx,.doc" 
                    className="hidden" 
                    disabled={isUploading}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-3">Will sync to all users in session</p>
              </div>

              {/* Or Text Questions */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Or add questions manually</p>
                <button 
                  onClick={handleManualQuestion}
                  disabled={isUploading}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Text Questions
                </button>
              </div>

              <button 
                onClick={() => setShowQuestionUploadPopup(false)}
                disabled={isUploading}
                className="w-full border border-gray-300 py-3 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionPanel;