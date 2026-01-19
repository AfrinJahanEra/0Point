import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Users, Trophy, Search, Play, Eye, Edit, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

const Contests = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [activePlatform, setActivePlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContests, setFilteredContests] = useState([]);
  const [registeredContests, setRegisteredContests] = useState([]);

  const navigate = useNavigate();

  const TOKEN = localStorage.getItem('token');

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📡 Fetching initial contests data...');
        
        // Fetch contests
        const contestsRes = await axios.get('http://localhost:8000/contests/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        console.log('✅ Contests loaded:', contestsRes.data.contests?.length || 0);
        setContests(contestsRes.data.contests || []);
        
        // Fetch user's registrations
        try {
          const registrationsRes = await axios.get('http://localhost:8000/contests/registrations/', {
            headers: { Authorization: `Bearer ${TOKEN}` }
          });
          
          console.log('✅ Registrations loaded:', registrationsRes.data.registered_contests?.length || 0);
          setRegisteredContests(registrationsRes.data.registered_contests || []);
        } catch (regErr) {
          console.warn('⚠️ Could not fetch registrations:', regErr);
          // Don't fail the whole page if registrations fail
        }
        
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching contests:', err);
        setError(err.response?.data?.error || 'Failed to load contests');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Run once on mount

  // WebSocket connection for real-time updates
  useEffect(() => {
    console.log('🔌 [WebSocket] Initializing connection...');
    
    const ws = new WebSocket("ws://localhost:8000/ws/contest/global/");
    
    ws.onopen = () => {
      console.log('✅ [WebSocket] Connected to real-time contest updates');
    };

    ws.onerror = (err) => {
      console.error('❌ [WebSocket] Error:', err);
    };

    ws.onclose = (event) => {
      console.log('⚠️ [WebSocket] Disconnected');
      console.log('📊 Close code:', event.code);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 [WebSocket] Message received:', data.event);
        
        if (data.event === "contest_list_update") {
          console.log('🔄 [WebSocket] Updating contest list:', data.contests?.length || 0);
          setContests(data.contests || []);
        }
      } catch (error) {
        console.error('❌ [WebSocket] Error parsing message:', error);
      }
    };

    // Cleanup on unmount
    return () => {
      console.log('🔌 [WebSocket] Cleaning up connection...');
      ws.close();
    };
  }, []); // Only run once

  // Filter contests based on tab, platform, search query
  useEffect(() => {
    let filtered = [...contests];

    if (activeTab !== 'all') {
      if (activeTab === 'draft') {
        filtered = filtered.filter(c => c.status === 'draft');
      } else {
        filtered = filtered.filter(c => c.status === activeTab);
      }
    }

    if (activePlatform !== 'all') {
      filtered = filtered.filter(c => c.platform === activePlatform);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
    }

    setFilteredContests(filtered);
  }, [contests, activeTab, activePlatform, searchQuery]);

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'IUT': return 'IUT Platform';
      case 'cf': return 'Codeforces';
      case 'codechef': return 'CodeChef';
      case 'atcoder': return 'AtCoder';
      case 'hackerrank': return 'HackerRank';
      case 'leetcode': return 'LeetCode';
      default: return platform || 'Unknown';
    }
  };

  const handlePublishDraft = async (contestId) => {
    if (window.confirm("Publish this draft contest? Once published, it will be visible to users.")) {
      try {
        await axios.post(
          `http://localhost:8000/contests/${contestId}/publish/`,
          { type: "final" },
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        alert("Contest published successfully!");
        
        // Refresh contests list
        const contestsRes = await axios.get('http://localhost:8000/contests/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        setContests(contestsRes.data.contests || []);
      } catch (err) {
        console.error('Failed to publish contest:', err);
        alert(err.response?.data?.error || "Failed to publish contest");
      }
    }
  };

  const getStatusBadge = (status) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold border";
    switch (status) {
      case 'live': return `${base} bg-red-50 text-red-800 border-red-200`;
      case 'upcoming': return `${base} bg-blue-50 text-blue-800 border-blue-200`;
      case 'past': return `${base} bg-green-50 text-green-800 border-green-200`;
      case 'draft': return `${base} bg-yellow-50 text-yellow-800 border-yellow-200`;
      case 'test': return `${base} bg-purple-50 text-purple-800 border-purple-200`;
      default: return `${base} bg-gray-50 text-gray-800 border-gray-200`;
    }
  };

  const formatHourDuration = (hours) => {
    if (!hours) return 'Not set';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatDateTime = (date) => {
    if (!date) return 'Not scheduled';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
             ' ' + 
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const refreshRegisteredContests = async () => {
  try {
    const registrationsRes = await axios.get('http://localhost:8000/contests/registrations/', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('✅ Updated registrations:', registrationsRes.data.registered_contests?.length || 0);
    setRegisteredContests(registrationsRes.data.registered_contests || []);
  } catch (regErr) {
    console.warn('⚠️ Could not refresh registrations:', regErr);
  }
};


const handleContestEntry = async (contestId, contestStatus) => {
  if (contestStatus === 'draft') {
    navigate(`/contests/${contestId}/edit`);
    return;
  }
  
  try {
    const problemsRes = await axios.get(
      `http://localhost:8000/contests/${contestId}/problems/`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    
    const problems = problemsRes.data.problems || [];
    
    if (problems.length === 0) {
      alert('This contest has no problems yet.');
      return;
    }
    
    navigate(`/contests/${contestId}`);
    
  } catch (error) {
    console.error('Error fetching contest problems:', error);
    
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      
      if (errorData.can_register) {
        const shouldRegister = window.confirm(
          `You need to register for this ${contestStatus} contest. Register now?`
        );
        
        if (shouldRegister) {
          try {
            await axios.post(
              `http://localhost:8000/contests/${contestId}/register/`,
              {},
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            // Refresh the registered contests list after successful registration
            await refreshRegisteredContests();
            
            alert('Successfully registered! You can now enter the contest.');
            navigate(`/contests/${contestId}`);
            
          } catch (registerError) {
            console.error('Registration error:', registerError);
            navigate(`/contests/${contestId}/register`);
          }
        }
      } else {
        alert(errorData.message || 'Access denied to this contest.');
      }
    } else {
      alert('Failed to load contest. Please try again.');
    }
  }
};

  const handleDraftEdit = (contestId, e) => {
    e.stopPropagation();
    navigate(`/contests/${contestId}/edit`);
  };

  const handleDraftPublish = async (contestId, e) => {
    e.stopPropagation();
    handlePublishDraft(contestId);
  };

  const statusTabs = [
    { value: 'all', label: 'All Contests' },
    { value: 'live', label: 'Live Now' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'draft', label: 'My Drafts' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading contests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Error Loading Contests</h3>
          <p className="text-gray-600 text-sm text-center">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Contests</h1>
                  <p className="text-xs text-gray-600 mt-1">
                    {contests.length} contest{contests.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
                {statusTabs.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${
                      activeTab === tab.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredContests.length > 0 ? (
                filteredContests.map(contest => (
                  <div 
                    key={contest.id} 
                    className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                    style={{ 
                      cursor: contest.status === 'upcoming' ? 'default' : 'pointer'
                    }}
                  >
                    <div className="p-4 flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-xs font-semibold truncate text-gray-900">{contest.title}</h3>
                          <span className={getStatusBadge(contest.status)}>
                            {contest.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {getPlatformName(contest.platform)} • {contest.type === 'individual' ? 'Individual' : 'Team'}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(contest.start_time)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatHourDuration(contest.duration)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{contest.participants || 0} participants</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        {contest.status === 'draft' ? (
                          // Draft contest buttons: Edit and Publish
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => handleDraftEdit(contest.id, e)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : contest.status === 'upcoming' ? (
                          // Upcoming contest buttons
                          registeredContests.includes(contest.id) ? (
                            <span className="px-3 py-1.5 bg-gray-300 text-gray-600 rounded text-xs font-medium">Registered</span>
                          ) : (
                            <button
                              onClick={() => navigate(`/contests/${contest.id}/register`)}
                              className="bg-blue-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Register</span>
                            </button>
                          )
                        ) : contest.status === 'live' ? (
                          // Live contest buttons
                          registeredContests.includes(contest.id) ? (
                            <button
                              onClick={() => handleContestEntry(contest.id, 'live')}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Enter</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/contests/${contest.id}/register`)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-orange-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Live</span>
                            </button>
                          )
                        ) : contest.status === 'past' ? (
                          // Past contest buttons
                          <button 
                            onClick={() => handleContestEntry(contest.id, 'past')}
                            className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200"
                          >
                            View
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No contests found</h3>
                  <p className="text-gray-600 text-xs">
                    {activeTab === 'draft' 
                      ? "You don't have any draft contests." 
                      : activeTab !== 'all'
                      ? `No ${activeTab} contests found. Try a different filter.`
                      : "Try adjusting your filters to find more contests."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-3">Filter by Platform</h2>
                <div className="space-y-1">
                  {['all','IUT','cf','codechef','atcoder','hackerrank','leetcode'].map(platform => (
                    <button
                      key={platform}
                      onClick={() => setActivePlatform(platform)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors duration-200 ${
                        activePlatform === platform
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{platform === 'all' ? 'All Platforms' : getPlatformName(platform)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contests;