// VideoPanel.jsx - UPDATED
import React from 'react';
import { Users, Video, Minimize2, Camera, CameraOff, Mail, Eye, EyeOff, UserCheck, Wifi } from 'lucide-react';

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
  participants,
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

  const getParticipantByRole = (role) => {
    return participants?.find(p => p.role === role);
  };

  const interviewerParticipant = getParticipantByRole('interviewer');
  const candidateParticipant = getParticipantByRole('candidate');

  if (!isVideoOpen) return null;

  return (
    <div className={`flex flex-col bg-gray-900 text-white ${showQuestions && !questionsPanelCollapsed ? 'w-1/3' : 'w-96'} transition-all duration-300 border-r border-gray-800`}>
      {/* Header */}
      <div className="px-5 py-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Participants ({onlineUsers.length})</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{participants?.filter(p => p.role === 'interviewer').length || 0} interviewer</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{participants?.filter(p => p.role === 'candidate').length || 0} candidate</span>
              </div>
            </div>
          </div>
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
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-auto">
        {/* Interviewer */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="relative aspect-video bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
            {isInterviewerVideoOn ? (
              <div className="text-center p-4">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-10 h-10" />
                </div>
                <p className="text-sm font-medium">{interviewerParticipant?.username || 'You'}</p>
                <p className="text-xs text-gray-400">Interviewer</p>
              </div>
            ) : (
              <div className="text-center">
                <CameraOff className="w-16 h-16 text-gray-500 mb-3" />
                <p className="text-sm text-gray-400">Camera is off</p>
              </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black bg-opacity-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Live</span>
            </div>
          </div>
          <div className="p-4 bg-gray-750 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">{interviewerParticipant?.username || 'You'}</span>
              {currentUser.id === interviewerParticipant?.user_id && (
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">You</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleInterviewerVideo}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs flex items-center gap-1"
              >
                {isInterviewerVideoOn ? (
                  <>
                    <CameraOff className="w-3 h-3" />
                    Turn Off
                  </>
                ) : (
                  <>
                    <Camera className="w-3 h-3" />
                    Turn On
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Candidate */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="relative aspect-video bg-gradient-to-br from-green-900 to-teal-900 flex items-center justify-center">
            {candidateJoined && isCandidateVideoOn ? (
              <div className="text-center p-4">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-10 h-10" />
                </div>
                <p className="text-sm font-medium">{candidateParticipant?.username || 'Candidate'}</p>
                <p className="text-xs text-gray-400">Candidate</p>
              </div>
            ) : candidateJoined ? (
              <div className="text-center">
                <CameraOff className="w-16 h-16 text-gray-500 mb-3" />
                <p className="text-sm text-gray-400">Camera is off</p>
              </div>
            ) : (
              <div className="text-center p-6">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-gray-500" />
                </div>
                <p className="text-sm font-medium mb-2">Waiting for candidate...</p>
                <p className="text-xs text-gray-400 mb-4">Invite a candidate to join the session</p>
              </div>
            )}
            {candidateJoined && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black bg-opacity-50 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Joined</span>
              </div>
            )}
            {!candidateJoined && currentUser.role === 'interviewer' && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <button 
                  onClick={() => setShowInvitePopup(true)}
                  disabled={invitationSent}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition ${invitationSent 
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
            <div className="flex items-center gap-2">
              {candidateJoined ? (
                <>
                  <UserCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium">{candidateParticipant?.username || 'Candidate'}</span>
                  {currentUser.id === candidateParticipant?.user_id && (
                    <span className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded">You</span>
                  )}
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">Not Joined</span>
                </>
              )}
            </div>
            {candidateJoined && currentUser.role === 'interviewer' && (
              <button 
                onClick={toggleCandidateVideo}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs flex items-center gap-1"
              >
                {isCandidateVideoOn ? (
                  <>
                    <CameraOff className="w-3 h-3" />
                    Turn Off
                  </>
                ) : (
                  <>
                    <Camera className="w-3 h-3" />
                    Turn On
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Online Participants ({onlineUsers.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-auto">
            {participants?.length > 0 ? (
              participants.map((participant, index) => (
                <div 
                  key={participant.user_id || index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${participant.role === 'interviewer' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    <span className="text-sm">{participant.username}</span>
                    {participant.user_id === currentUser.id && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${participant.role === 'interviewer' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                      {participant.role}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(participant.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No other participants online</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;