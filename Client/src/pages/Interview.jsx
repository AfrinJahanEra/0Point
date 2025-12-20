import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Video, Clock, PlusCircle, Copy, Calendar } from 'lucide-react';

const Interview = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([
    {
      id: 'test123',
      title: 'Technical Interview - Frontend',
      date: '2024-01-20',
      time: '10:00 AM',
      duration: '60 mins',
      participants: 2,
      role: 'interviewer'
    },
    {
      id: 'test456',
      title: 'System Design Interview',
      date: '2024-01-22',
      time: '2:00 PM',
      duration: '90 mins',
      participants: 1,
      role: 'candidate'
    }
  ]);

  const createNewSession = () => {
    const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
    const role = 'interviewer';
    
    // Navigate to the interview session
    window.open(`/interview-session?session=${sessionId}&role=${role}`, '_blank');
    
    // Add to sessions list
    setSessions(prev => [...prev, {
      id: sessionId,
      title: `New Interview Session`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '60 mins',
      participants: 1,
      role: 'interviewer'
    }]);
  };

  const joinAsInterviewer = (sessionId) => {
    window.open(`/interview-session?session=${sessionId}&role=interviewer`, '_blank');
  };

  const joinAsCandidate = (sessionId) => {
    window.open(`/interview-session?session=${sessionId}&role=candidate`, '_blank');
  };

  const copyInviteLink = (sessionId) => {
    const link = `${window.location.origin}/interview-session?session=${sessionId}&role=candidate`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Interview Sessions</h1>
          <p className="text-gray-600">Manage your interview sessions and create new ones.</p>
        </div>
        <button
          onClick={createNewSession}
          className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Session
        </button>
      </div>

      {sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{session.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{session.date} at {session.time}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  session.role === 'interviewer' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {session.role === 'interviewer' ? 'Interviewer' : 'Candidate'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Duration</span>
                  </div>
                  <span className="font-medium">{session.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Participants</span>
                  </div>
                  <span className="font-medium">{session.participants}/2</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Session ID</span>
                  </div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{session.id}</code>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {session.role === 'interviewer' ? (
                  <>
                    <button
                      onClick={() => joinAsInterviewer(session.id)}
                      className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Join as Interviewer
                    </button>
                    <button
                      onClick={() => copyInviteLink(session.id)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Invite Link
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => joinAsCandidate(session.id)}
                    className="w-full bg-green-800 hover:bg-green-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Join as Candidate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No interview sessions yet</h3>
          <p className="text-gray-500 mb-6">Create your first interview session to get started</p>
          <button
            onClick={createNewSession}
            className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Session
          </button>
        </div>
      )}

      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-blue-800">How to use the Interview Platform</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">1</div>
              <h4 className="font-medium">Create Session</h4>
            </div>
            <p className="text-sm text-gray-600">Click "Create New Session" to generate a unique interview room.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">2</div>
              <h4 className="font-medium">Invite Candidate</h4>
            </div>
            <p className="text-sm text-gray-600">Copy the invite link and share it with the candidate.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">3</div>
              <h4 className="font-medium">Collaborate</h4>
            </div>
            <p className="text-sm text-gray-600">Code together, ask questions, and conduct the interview in real-time.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-semibold mb-4">Quick Start Links</h4>
          <div className="space-y-3">
            <button
              onClick={() => window.open('/interview-session?session=test123&role=interviewer', '_blank')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Join Test Session (Interviewer)</div>
              <div className="text-sm text-gray-500">Session ID: test123</div>
            </button>
            <button
              onClick={() => window.open('/interview-session?session=test123&role=candidate', '_blank')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Join Test Session (Candidate)</div>
              <div className="text-sm text-gray-500">Session ID: test123</div>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-semibold mb-4">Features</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time code collaboration</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Video conferencing</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Question file sharing</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live chat</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Synchronized timer</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Interview;