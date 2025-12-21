import React, { useState, useRef } from 'react';
import { FileText, ChevronLeft, ChevronRight, X, Upload, Download, Maximize2, File } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PDFViewer = ({ fileUrl, fileName }) => {
  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner">
      <iframe 
        src={`${fileUrl}#view=FitH&toolbar=1&navpanes=0`}
        className="w-full h-full border-0"
        title={`PDF Viewer - ${fileName}`}
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
  currentUser,
  sessionId,
  socketRef,
  onQuestionUpdate
}) => {
  const [showQuestionUploadPopup, setShowQuestionUploadPopup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF or DOCX files are allowed');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64File = e.target.result.split(',')[1];
        const fileData = {
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_blob: base64File,
          uploaded_by: currentUser.username,
          uploaded_at: new Date().toISOString()
        };

        // Create content for sharing
        const content = `File: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Uploaded by: ${currentUser.username}
Time: ${new Date().toLocaleTimeString()}

${file.type === 'application/pdf' ? 'PDF Document - Open to view content' : 'DOCX Document - Download to view content'}`;

        const blob = await fetch(`data:${file.type};base64,${base64File}`).then(res => res.blob());
        const fileUrl = URL.createObjectURL(blob);

        onQuestionUpdate(content, fileData, fileUrl);
        setShowQuestionUploadPopup(false);
        toast.success('File uploaded and shared!');
      } catch (error) {
        toast.error('Failed to process file');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
c) Design a URL shortening service.

2. Behavioral Questions:
------------------------
a) Tell me about a challenging project.
b) How do you handle conflicting priorities?
c) Describe your experience with agile methodologies.`;
    onQuestionUpdate(content, null, null);
    setShowQuestionUploadPopup(false);
    toast.success('Sample questions added!');
  };

  if (!showQuestions) return null;

  return (
    <>
      <div className={`flex flex-col bg-white transition-all duration-300 ${questionsPanelCollapsed ? 'w-12' : 'w-3/4'} border-l border-gray-300`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Shared Questions</h3>
          </div>
          <div className="flex items-center gap-2">
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
          {sharedQuestionContent ? (
            sharedQuestionFile && sharedQuestionFile.file_type === 'application/pdf' ? (
              sharedFileUrl ? (
                <div className="h-full flex flex-col gap-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <File className="w-6 h-6 text-blue-700" />
                      <div>
                        <p className="font-semibold text-blue-900">{sharedQuestionFile.file_name}</p>
                        <p className="text-sm text-blue-700">
                          {(sharedQuestionFile.file_size / 1024).toFixed(1)} KB • by {sharedQuestionFile.uploaded_by}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                        <Download className="w-4 h-4" /> Download
                      </button>
                      <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                        <Maximize2 className="w-4 h-4" /> Full Screen
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <PDFViewer fileUrl={sharedFileUrl} fileName={sharedQuestionFile.file_name} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading PDF...</p>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
                <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                  {sharedQuestionContent}
                </pre>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No questions shared yet</h3>
              <p className="text-gray-500 mb-6">Upload a question set to begin</p>
              <button 
                onClick={() => setShowQuestionUploadPopup(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Questions
              </button>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="p-5 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => setShowQuestionUploadPopup(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            <Upload className="w-5 h-5" />
            Update Shared Questions
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">Changes are instantly visible to all participants</p>
        </div>
      </div>

      {/* Upload Popup */}
      {showQuestionUploadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <FileText className="w-7 h-7 text-indigo-600" />
              Update Questions
            </h2>
            <p className="text-gray-600 mb-6">Share a PDF/DOCX or use sample questions</p>

            <div className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition">
                <Upload className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                <p className="font-medium text-gray-700 mb-2">Drop PDF or DOCX here</p>
                <label className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg cursor-pointer">
                  <Upload className="w-5 h-5 inline mr-2" />
                  Choose File
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx" className="hidden" disabled={isUploading} />
                </label>
                <p className="text-xs text-gray-500 mt-3">PDF or DOCX only</p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Or quickly add sample questions</p>
                <button 
                  onClick={handleManualQuestion}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg font-medium"
                >
                  Use Sample Questions
                </button>
              </div>

              <button 
                onClick={() => setShowQuestionUploadPopup(false)}
                className="w-full border border-gray-300 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
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