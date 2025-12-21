import React from 'react';
import { Users, Video, Minimize2, Camera, CameraOff, Mail, Eye, EyeOff } from 'lucide-react';

const VideoPanel = ({ 
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
  currentUser,
  onlineUsers,
  invitationSent,
  setShowInvitePopup,
  onVideoToggle
}) => {
  const toggleInterviewerVideo = () => {
    const newStatus = !isInterviewerVideoOn;
    setIsInterviewerVideoOn(newStatus);
    onVideoToggle('interviewer', newStatus);
  };

  const toggleCandidateVideo = () => {
    if (candidateJoined) {
      const newStatus = !isCandidateVideoOn;
      setIsCandidateVideoOn(newStatus);
      onVideoToggle('candidate', newStatus);
    }
  };

  if (!isVideoOpen) return null;

  return (
    <div className={`flex flex-col bg-gray-900 text-white ${showQuestions && !questionsPanelCollapsed ? 'w-1/4' : 'w-full'} transition-all duration-300`}>
      {/* Header */}
      <div className="px-5 py-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold">Participants ({onlineUsers.length})</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowQuestions(!showQuestions)}
            className="p-2 rounded-lg hover:bg-gray-700 transition"
            title={showQuestions ? "Hide Questions" : "Show Questions"}
          >
            {showQuestions ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsVideoOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-700 transition"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Feeds */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        {/* Interviewer */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-1/2">
          <div className="relative flex-1 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
            {isInterviewerVideoOn ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-10 h-10" />
                </div>
                <p className="text-sm">You (Interviewer)</p>
              </div>
            ) : (
              <CameraOff className="w-16 h-16 text-gray-500" />
            )}
          </div>
          <div className="p-4 bg-gray-750 flex justify-between items-center">
            <span className="text-sm font-medium">You</span>
            <button 
              onClick={toggleInterviewerVideo}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              {isInterviewerVideoOn ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* Candidate */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-1/2">
          <div className="relative flex-1 bg-gradient-to-br from-green-900 to-teal-900 flex items-center justify-center">
            {candidateJoined && isCandidateVideoOn ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-10 h-10" />
                </div>
                <p className="text-sm">Candidate</p>
              </div>
            ) : (
              candidateJoined ? (
                <CameraOff className="w-16 h-16 text-gray-500" />
              ) : (
                <div className="text-center">
                  <CameraOff className="w-16 h-16 text-gray-500 mb-3" />
                  <p className="text-sm">Waiting for candidate...</p>
                </div>
              )
            )}
            {!candidateJoined && currentUser.role === 'interviewer' && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <button 
                  onClick={() => setShowInvitePopup(true)}
                  disabled={invitationSent}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${
                    invitationSent 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  {invitationSent ? 'Invited' : 'Invite Candidate'}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-750 flex justify-between items-center">
            <span className="text-sm font-medium">
              {candidateJoined ? 'Candidate' : 'Not Joined'}
            </span>
            {candidateJoined && currentUser.role === 'interviewer' && (
              <button 
                onClick={toggleCandidateVideo}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                {isCandidateVideoOn ? 'Turn Off' : 'Turn On'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;