import React from 'react';
import VideoPanel from './VideoPanel';
import QuestionPanel from './QuestionPanel';
import CodeEditorPanel from './CodeEditorPanel';

const InterviewLayout = ({ 
  isVideoOpen,
  setIsVideoOpen,
  showQuestions,
  setShowQuestions,
  questionsPanelCollapsed,
  setQuestionsPanelCollapsed,
  candidateJoined,
  isInterviewerVideoOn,
  setIsInterviewerVideoOn,
  isCandidateVideoOn,
  setIsCandidateVideoOn,
  sharedQuestionFile,
  setSharedQuestionFile,
  sharedQuestionContent,
  setSharedQuestionContent,
  sharedFileUrl,
  setSharedFileUrl,
  code,
  setCode,
  output,
  setOutput,
  cursorPosition,
  collaboratorCursors,
  language,
  setLanguage,
  isRunning,
  setIsRunning,
  codeVersion,
  currentUser,
  onlineUsers,
  sessionId,
  invitationSent,
  setShowInvitePopup,
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
        <div className="w-1/2 flex border-r border-gray-300 bg-gray-100 transition-all duration-300">
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
            onQuestionUpdate={(content, fileData, fileUrl) => {
              setSharedQuestionContent(content);
              if (fileData) {
                setSharedQuestionFile(fileData);
                setSharedFileUrl(fileUrl);
              }
              sendQuestionUpdate(content, fileData);
            }}
          />
        </div>
      )}

      {/* Right Panel: Code Editor */}
      <div className={`${isVideoOpen ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
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
          codeVersion={codeVersion}
          isVideoOpen={isVideoOpen}
          setIsVideoOpen={setIsVideoOpen}
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