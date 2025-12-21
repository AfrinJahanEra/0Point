// InterviewLayout.jsx - UPDATED
import React from 'react';
import VideoPanel from './VideoPanel';
import QuestionPanel from './QuestionPanel';
import CodeEditorPanel from './CodeEditorPanel';

const InterviewLayout = ({ 
  // Layout
  isVideoOpen,
  setIsVideoOpen,
  showQuestions,
  setShowQuestions,
  questionsPanelCollapsed,
  setQuestionsPanelCollapsed,
  
  // Video
  candidateJoined,
  isInterviewerVideoOn,
  setIsInterviewerVideoOn,
  isCandidateVideoOn,
  setIsCandidateVideoOn,
  
  // Questions
  sharedQuestionFile,
  setSharedQuestionFile,
  sharedQuestionContent,
  setSharedQuestionContent,
  sharedFileUrl,
  setSharedFileUrl,
  
  // Code
  code,
  setCode,
  output,
  setOutput,
  cursorPosition,
  collaboratorCursors,
  collaboratorSelections,
  language,
  setLanguage,
  isRunning,
  setIsRunning,
  codeVersion,
  setCodeVersion,
  
  // Session
  currentUser,
  onlineUsers,
  participants,
  sessionId,
  sessionTitle,
  invitationSent,
  setShowInvitePopup,
  
  // Refs & Handlers
  socketRef,
  editorRef,
  handleRunCode,
  handleEditorDidMount,
  handleEditorChange,
  handleLanguageChange,
  sendVideoToggle,
  sendQuestionUpdate
}) => {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left Panel: Video + Questions */}
      {isVideoOpen && (
        <div className="flex border-r border-gray-300 bg-gray-100 transition-all duration-300">
          <VideoPanel
            isVideoOpen={isVideoOpen}
            setIsVideoOpen={setIsVideoOpen}
            showQuestions={showQuestions}
            setShowQuestions={setShowQuestions}
            questionsPanelCollapsed={questionsPanelCollapsed}
            setQuestionsPanelCollapsed={setQuestionsPanelCollapsed}
            candidateJoined={candidateJoined}
            isInterviewerVideoOn={isInterviewerVideoOn}
            setIsInterviewerVideoOn={setIsInterviewerVideoOn}
            isCandidateVideoOn={isCandidateVideoOn}
            setIsCandidateVideoOn={setIsCandidateVideoOn}
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            participants={participants}
            invitationSent={invitationSent}
            setShowInvitePopup={setShowInvitePopup}
            onVideoToggle={sendVideoToggle}
          />
          
          <QuestionPanel
            showQuestions={showQuestions}
            setShowQuestions={setShowQuestions}
            questionsPanelCollapsed={questionsPanelCollapsed}
            setQuestionsPanelCollapsed={setQuestionsPanelCollapsed}
            sharedQuestionContent={sharedQuestionContent}
            sharedQuestionFile={sharedQuestionFile}
            sharedFileUrl={sharedFileUrl}
            currentUser={currentUser}
            sessionId={sessionId}
            socketRef={socketRef}
            onQuestionUpdate={(content, fileData) => {
              setSharedQuestionContent(content);
              if (fileData) {
                setSharedQuestionFile(fileData);
              }
              sendQuestionUpdate(content, fileData);
            }}
          />
        </div>
      )}

      {/* Right Panel: Code Editor */}
      <div className={`${isVideoOpen ? 'flex-1' : 'w-full'} transition-all duration-300`}>
        <CodeEditorPanel
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={setLanguage}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
          output={output}
          setOutput={setOutput}
          cursorPosition={cursorPosition}
          collaboratorCursors={collaboratorCursors}
          collaboratorSelections={collaboratorSelections}
          codeVersion={codeVersion}
          isVideoOpen={isVideoOpen}
          setIsVideoOpen={setIsVideoOpen}
          onlineUsers={onlineUsers}
          onRunCode={handleRunCode}
          onEditorDidMount={handleEditorDidMount}
          onEditorChange={handleEditorChange}
          onLanguageChange={handleLanguageChange}
        />
      </div>
    </div>
  );
};

export default InterviewLayout;