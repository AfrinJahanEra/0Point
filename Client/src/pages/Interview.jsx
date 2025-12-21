// Interview.jsx - COMPLETELY UPDATED
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Video, Clock, PlusCircle, Copy, Calendar, RefreshCw, Zap, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Interview = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch active sessions
  const fetchActiveSessions = async () => {
    setRefreshing(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/active/`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setSessions(result.sessions);
        } else {
          toast.error('Failed to fetch sessions');
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const createNewSession = async () => {
    try {
      const sessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
      const username = 'Interviewer'; // Default username
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      // Join session first
      const joinResponse = await fetch(`${backendUrl}/interview/api/sessions/join/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          username: username,
          role: 'interviewer'
        }),
      });
      
      const joinResult = await joinResponse.json();
      
      if (joinResponse.ok && joinResult.status === 'success') {
        // Also create session for compatibility
        await fetch(`${backendUrl}/interview/api/sessions/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            title: `${username}'s Interview Session`,
            duration: 3600
          }),
        });
        
        // Navigate to the interview session
        const url = `/interview-session?session=${sessionId}&role=interviewer&username=${encodeURIComponent(username)}`;
        window.open(url, '_blank');
        
        // Refresh session list
        setTimeout(fetchActiveSessions, 1000);
        
        toast.success('Session created successfully!');
      } else {
        throw new Error(joinResult.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const joinSession = (sessionId, role, username = 'User') => {
    const url = `/interview-session?session=${sessionId}&role=${role}&username=${encodeURIComponent(username)}`;
    window.open(url, '_blank');
  };

  const copyInviteLink = (sessionId) => {
    const link = `${window.location.origin}/interview-session?session=${sessionId}&role=candidate`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
  };

  const getSessionStatus = (session) => {
    if (session.is_live) {
      return {
        text: 'Live Now',
        color: 'bg-red-100 text-red-800',
        dot: 'bg-red-500'
      };
    } else if (session.active_participants > 0) {
      return {
        text: 'Active',
        color: 'bg-green-100 text-green-800',
        dot: 'bg-green-500'
      };
    } else {
      return {
        text: 'Ended',
        color: 'bg-gray-100 text-gray-800',
        dot: 'bg-gray-500'
      };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Interview Sessions</h1>
          <p className="text-gray-600">Real-time collaborative interview platform</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchActiveSessions}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={createNewSession}
            className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Session
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
        </div>
      ) : sessions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sessions.map((session) => {
              const status = getSessionStatus(session);
              return (
                <div key={session.session_id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold truncate">{session.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} flex items-center gap-1`}>
                          <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                          {status.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block truncate">
                        ID: {session.session_id}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Participants</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium flex items-center gap-1">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          {session.interviewer_count} interviewer{session.interviewer_count !== 1 ? 's' : ''}
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          {session.candidate_count} candidate{session.candidate_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Active</span>
                      </div>
                      <span className="font-medium">{session.active_participants} online</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Last Activity</span>
                      </div>
                      <span className="font-medium text-sm">
                        {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => joinSession(session.session_id, 'interviewer', 'Interviewer')}
                      className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Join as Interviewer
                    </button>
                    <button
                      onClick={() => joinSession(session.session_id, 'candidate', 'Candidate')}
                      className="w-full bg-green-800 hover:bg-green-900 text-white py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Join as Candidate
                    </button>
                    <button
                      onClick={() => copyInviteLink(session.session_id)}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Candidate Invite
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Showing {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No active interview sessions</h3>
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
        <h3 className="text-xl font-semibold mb-4 text-blue-800">Real-time Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">1</div>
              <h4 className="font-medium">Live Participant Tracking</h4>
            </div>
            <p className="text-sm text-gray-600">See who's online, track interviewer/candidate counts in real-time.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">2</div>
              <h4 className="font-medium">Document Sync</h4>
            </div>
            <p className="text-sm text-gray-600">Upload PDF/DOCX files that sync across all participants instantly.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">3</div>
              <h4 className="font-medium">Collaborative IDE</h4>
            </div>
            <p className="text-sm text-gray-600">Code together with real-time cursor tracking and live updates.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-semibold mb-4">Quick Test Sessions</h4>
          <div className="space-y-3">
            <button
              onClick={() => joinSession('test_session_1', 'interviewer', 'Test Interviewer')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Join Test Session (Interviewer)</div>
              <div className="text-sm text-gray-500">Session ID: test_session_1</div>
            </button>
            <button
              onClick={() => joinSession('test_session_1', 'candidate', 'Test Candidate')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Join Test Session (Candidate)</div>
              <div className="text-sm text-gray-500">Session ID: test_session_1</div>
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
              <span>Live participant tracking</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Document sharing & sync</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Multi-cursor support</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Version control & conflict resolution</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Interview;