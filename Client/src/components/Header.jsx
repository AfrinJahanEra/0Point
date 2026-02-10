// src/components/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Code2, LogOut, User, BarChart2, Video, Users, Copy, Send } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const extractEmailFromLink = (link, param) => {
  try {
    const url = new URL(link);
    return url.searchParams.get(param) || '';
  } catch (e) {
    console.error('Error parsing URL:', e);
    return '';
  }
};

const Header = () => {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isCreateLinkModalOpen, setIsCreateLinkModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareRole, setShareRole] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [joinRole, setJoinRole] = useState('candidate');
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch profile photo when user changes
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (user) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/account/profile/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setProfilePhoto(data.profile_photo);
          }
        } catch (error) {
          console.error('Error fetching profile photo:', error);
        }
      }
    };
    fetchProfilePhoto();
  }, [user, user?.name]); // Re-fetch when user changes

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const handleCreateInterview = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/mock-interview/create-session/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewer_email: 'interviewer@example.com',
          candidate_email: 'candidate@example.com',
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setSessionId(result.session_id);
        setInterviewerLink(result.interviewer_link);
        setCandidateLink(result.candidate_link);
        setIsInterviewModalOpen(false);
        setIsCreateLinkModalOpen(true);
      } else {
        throw new Error(result.error || 'Failed to create session');
      }
    } catch (error) {
      alert('Failed to create session: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinInterview = () => {
    if (!joinSessionId.trim()) return alert('Please enter a session ID');
    navigate(`/interview-room/${joinSessionId}?role=${joinRole}`);
    setIsJoinModalOpen(false);
  };

  const handleShareClick = (role) => {
    setShareRole(role);
    setEmail('');
    setIsShareModalOpen(true);
  };

  const handleSendInvitation = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) return alert('Please enter a valid email');

    setIsSending(true);
    try {
      const currentInterviewerEmail = extractEmailFromLink(interviewerLink, 'interviewer_email');
      const currentCandidateEmail = extractEmailFromLink(candidateLink, 'candidate_link', 'candidate_email');

      const response = await fetch(`${BACKEND_URL}/mock-interview/create-session/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewer_email: shareRole === 'interviewer' ? email : currentInterviewerEmail || 'interviewer@example.com',
          candidate_email: shareRole === 'candidate' ? email : currentCandidateEmail || 'candidate@example.com',
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setInterviewerLink(result.interviewer_link);
        setCandidateLink(result.candidate_link);
        alert(`Invitation sent to ${email} as ${shareRole}`);
        setIsShareModalOpen(false);
      } else {
        alert('Failed to send invitation');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const openLink = (url) => window.open(url, '_blank');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">

          {/* Logo - Unchanged */}
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

          {/* Navigation Tabs - Exactly as original */}
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

                <li>
                  <button
                    onClick={() => setIsInterviewModalOpen(true)}
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

          {/* User Section - Unchanged */}
          <div className="flex gap-3 items-center">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-900 
              hover:text-blue-800 transition-all duration-300 transform hover:scale-105">
              <BarChart2 className="w-5 h-5" />
              <span className="font-medium">{user ? user.name : 'Dashboard'}</span>
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-800 to-blue-900 
                  flex items-center justify-center text-white text-sm shadow-lg 
                  shadow-blue-800/20 overflow-hidden hover:opacity-90 transition-all duration-300 
                  transform hover:scale-110 hover:shadow-xl hover:shadow-blue-800/30 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isProfileOpen ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : ''
                  }`}
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg 
                  border border-gray-200 py-2 z-50">
                  {/* User Info Section */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span>{user?.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 
                      hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 
                      hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODALS WITH SMALL DARK BLUE BUTTONS ==================== */}
      {(isInterviewModalOpen || isJoinModalOpen || isCreateLinkModalOpen || isShareModalOpen) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 
            p-8 w-full max-w-lg">

            {/* Interview Options Modal */}
            {isInterviewModalOpen && (
              <>
                <h2 className="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                  <Video className="w-7 h-7 text-blue-800" />
                  Interview Options
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={handleCreateInterview}
                    disabled={isCreating}
                    className="w-full bg-blue-800 text-white py-2.5 px-6 rounded-xl font-medium 
                      hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Interview Session'}
                  </button>
                  <button
                    onClick={() => { setIsInterviewModalOpen(false); setIsJoinModalOpen(true); }}
                    className="w-full bg-blue-800 text-white py-2.5 px-6 rounded-xl font-medium 
                      hover:bg-blue-900 transition-colors"
                  >
                    Join Existing Session
                  </button>
                  <button
                    onClick={() => setIsInterviewModalOpen(false)}
                    className="w-full bg-gray-200 text-gray-700 py-2.5 px-6 rounded-xl font-medium 
                      hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Join Session Modal */}
            {isJoinModalOpen && (
              <>
                <h2 className="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                  <Users className="w-7 h-7 text-blue-800" />
                  Join Interview Session
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    placeholder="Enter session ID"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70"
                  />
                  <select
                    value={joinRole}
                    onChange={(e) => setJoinRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70"
                  >
                    <option value="candidate">Candidate</option>
                    <option value="interviewer">Interviewer</option>
                    <option value="observer">Observer</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setIsJoinModalOpen(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-300">
                    Cancel
                  </button>
                  <button onClick={handleJoinInterview} className="flex-1 bg-blue-800 text-white py-2.5 rounded-xl font-medium hover:bg-blue-900">
                    Join Session
                  </button>
                </div>
              </>
            )}

            {/* Session Created Modal */}
            {isCreateLinkModalOpen && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  Session Created!
                </h2>
                <p className="text-center text-gray-600 mb-6">
                  Session ID: <span className="font-mono font-bold text-blue-800">{sessionId}</span>
                </p>

                {[
                  { title: 'Interviewer Link', link: interviewerLink },
                  { title: 'Candidate Link', link: candidateLink }
                ].map(({ title, link }) => (
                  <div key={title} className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-gray-200 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-blue-800 text-sm">{title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(link)} className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => openLink(link)} className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition">
                          <Video className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleShareClick(title.includes('Interviewer') ? 'interviewer' : 'candidate')}
                          className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-gray-600 break-all bg-white/50 px-3 py-2 rounded-lg">{link}</p>
                  </div>
                ))}

                <button
                  onClick={() => setIsCreateLinkModalOpen(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </>
            )}

            {/* Share Email Modal */}
            {isShareModalOpen && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  Share {shareRole.charAt(0).toUpperCase() + shareRole.slice(1)} Link
                </h2>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 mb-5"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsShareModalOpen(false)}
                    disabled={isSending}
                    className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvitation}
                    disabled={isSending}
                    className="flex-1 bg-blue-800 text-white py-2.5 rounded-xl font-medium hover:bg-blue-900 disabled:opacity-60"
                  >
                    {isSending ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;