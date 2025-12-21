import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Code2, LogOut, User, BarChart2, Video, Monitor } from 'lucide-react';

const Header = () => {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isCreateLinkModalOpen, setIsCreateLinkModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareRole, setShareRole] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [interviewerLink, setInterviewerLink] = useState('');
  const [candidateLink, setCandidateLink] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const profileRef = useRef(null);

  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleInterviewClick = () => {
    setIsInterviewModalOpen(true);
  };

  const handleCreateInterview = async () => {
    setIsCreating(true);
    try {
      // Generate a new session ID
      const newSessionId = `session_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a new session in the backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: newSessionId,
          title: 'Interview Session',
          duration: 3600
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        setSessionId(newSessionId);
        
        // Generate links
        const baseURL = window.location.origin;
        const interviewerURL = `${baseURL}/interview-session?session=${newSessionId}&role=interviewer`;
        const candidateURL = `${baseURL}/interview-session?session=${newSessionId}&role=candidate`;
        
        setInterviewerLink(interviewerURL);
        setCandidateLink(candidateURL);
        
        // Close current modal and open create link modal
        setIsInterviewModalOpen(false);
        setIsCreateLinkModalOpen(true);
      } else {
        throw new Error(result.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareClick = (role) => {
    setShareRole(role);
    setEmail('');
    setIsShareModalOpen(true);
  };

  const handleSendInvitation = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsSending(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/interview/api/sessions/send-invitation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          email: email,
          role: shareRole
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        alert(`Invitation sent successfully to ${email}`);
        setIsShareModalOpen(false);
      } else {
        alert(`Failed to send invitation: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const openLink = (url) => {
    window.open(url, '_blank');
  };


  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">

          {/* Logo */}
          <Link to={user ? "/home" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg 
              flex items-center justify-center text-white text-lg shadow-lg shadow-blue-800/20 
              group-hover:shadow-xl group-hover:shadow-blue-800/30 transition-all duration-300 
              transform group-hover:-translate-y-1">
              <Code2 className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            </div>

            <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300">
              0<span className="text-blue-800 group-hover:text-blue-900 transition-colors duration-300">Point</span>
            </div>
          </Link>

          {/* Navigation */}
          {(!isPublicPage || location.pathname === '/home') && (
            <nav className="flex-1 flex justify-center">
              <ul className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
                {['Home', 'Contests', 'Practice', 'Community', 'Leaderboard'].map((item) => {
                  const path = `/${item.toLowerCase()}`;

                  return (
                    <li key={item}>
                      <Link
                        to={path}
                        className={`px-5 py-2 rounded-full font-medium transition-all duration-300 border 
                          ${isActive(path)
                            ? "bg-white border-blue-700 text-blue-700 shadow-md scale-105"
                            : "bg-transparent border-transparent text-gray-700 hover:bg-gray-100 hover:text-blue-800"
                          }
                        `}
                      >
                        {item}
                      </Link>
                    </li>
                  );
                })}

                {/* Visualizer */}
                <li>
                  <a
                    href="/visualizer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-5 py-2 rounded-full font-medium transition-all duration-300 border
                      ${isActive("/visualizer")
                        ? "bg-white border-blue-700 text-blue-700 shadow-md scale-105"
                        : "bg-transparent border-transparent text-gray-700 hover:bg-gray-100 hover:text-blue-800"
                      }
                    `}
                  >
                    Visualizer
                  </a>
                </li>

                {/* Interview Tab */}
                <li>
                  <button
                    onClick={handleInterviewClick}
                    className={`px-5 py-2 rounded-full font-medium transition-all duration-300 border flex items-center gap-2
                      ${isActive("/interview")
                        ? "bg-white border-blue-700 text-blue-700 shadow-md scale-105"
                        : "bg-transparent border-transparent text-gray-700 hover:bg-gray-100 hover:text-blue-800"
                      }
                    `}
                  >
                    <Video className="w-4 h-4" />
                    Interview
                  </button>
                </li>
              </ul>
            </nav>
          )}

          {/* Avatar & Dropdown */}
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-900 
              hover:text-blue-800 transition-all duration-300 transform hover:scale-105">
              <BarChart2 className="w-5 h-5" />
              <span className="font-medium">{user ? user.name : 'era97'}</span>
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                onClick={handleProfileClick}
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-800 to-blue-900 
                  flex items-center justify-center text-white text-sm shadow-lg 
                  shadow-blue-800/20 overflow-hidden hover:opacity-90 transition-all duration-300 
                  transform hover:scale-110 hover:shadow-xl hover:shadow-blue-800/30 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isProfileOpen ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : ''
                  }`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-md 
                  border border-gray-200 py-2 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 
                      hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interview Modal Popup */}
      {isInterviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Interview Options
            </h2>
            <button
              onClick={handleCreateInterview}
              disabled={isCreating}
              className="w-full bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Interview Link'}
            </button>
            <button
              onClick={() => setIsInterviewModalOpen(false)}
              className="w-full mt-2 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Link Modal Popup */}
      {isCreateLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Interview Links
            </h2>
            <p className="text-gray-600 mb-4">Session ID: {sessionId.substring(0, 8)}</p>
            
            <div className="space-y-4">
              {/* Interviewer Link */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-blue-800">Interviewer Link</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(interviewerLink)}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={() => openLink(interviewerLink)}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => handleShareClick('interviewer')}
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                    >
                      Share
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate">{interviewerLink}</p>
              </div>
              
              {/* Candidate Link */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-green-800">Candidate Link</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(candidateLink)}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={() => openLink(candidateLink)}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => handleShareClick('candidate')}
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                    >
                      Share
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate">{candidateLink}</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCreateLinkModalOpen(false)}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Share Email Modal Popup */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Share {shareRole === 'interviewer' ? 'Interviewer' : 'Candidate'} Link
            </h2>
            <p className="text-gray-600 mb-4">Enter email to send invitation:</p>
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={isSending}
                className="flex-1 bg-purple-800 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;