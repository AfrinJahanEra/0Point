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

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  // Fetch contests and registrations
  useEffect(() => {
    const fetchContests = async () => {
      try {
        console.log('Fetching contests...');
        const res = await axios.get('http://localhost:8000/contests/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        console.log('Contests API Response:', res.data);
        console.log('Number of contests:', res.data.contests?.length || 0);
        
        // Log all contests with their status
        if (res.data.contests) {
          res.data.contests.forEach((contest, index) => {
            console.log(`Contest ${index + 1}:`, {
              id: contest.id,
              title: contest.title,
              status: contest.status,
              is_creator: contest.is_creator,
              platform: contest.platform,
              start_time: contest.start_time
            });
          });
          
          // Count drafts
          const drafts = res.data.contests.filter(c => c.status === 'draft');
          console.log(`Found ${drafts.length} draft contests`);
          drafts.forEach(draft => {
            console.log('Draft contest:', {
              title: draft.title,
              is_creator: draft.is_creator,
              created_by: draft.created_by
            });
          });
        }
        
        setContests(res.data.contests || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch contests:', err);
        setError(err.response?.data?.error || 'Failed to load contests');
      }
    };

    const fetchRegistrations = async () => {
      try {
        const res = await axios.get('http://localhost:8000/contests/registrations/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        setRegisteredContests(res.data.registered_contests || []);
      } catch (err) {
        console.error('Failed to fetch registrations:', err);
      }
    };

    Promise.all([fetchContests(), fetchRegistrations()])
      .finally(() => {
        setLoading(false);
        console.log('Finished loading contests');
      });
  }, []);

  // Filter contests based on tab, platform, search query
  useEffect(() => {
    console.log('Filtering contests:', {
      totalContests: contests.length,
      activeTab,
      activePlatform,
      searchQuery
    });

    let filtered = [...contests];

    if (activeTab !== 'all') {
      if (activeTab === 'draft') {
        // For drafts tab, show ALL drafts regardless of creator
        filtered = filtered.filter(c => c.status === 'draft');
        console.log(`Filtered to ${filtered.length} drafts`);
      } else {
        filtered = filtered.filter(c => c.status === activeTab);
        console.log(`Filtered to ${filtered.length} contests with status: ${activeTab}`);
      }
    }

    if (activePlatform !== 'all') {
      filtered = filtered.filter(c => c.platform === activePlatform);
      console.log(`After platform filter (${activePlatform}): ${filtered.length}`);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
      console.log(`After search filter: ${filtered.length}`);
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
        const res = await axios.post(
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


const handleContestEntry = async (contestId, contestStatus) => {
  console.log('Handling contest entry:', { contestId, contestStatus });
  
  // For drafts, go directly to edit page
  if (contestStatus === 'draft') {
    navigate(`/contests/${contestId}/edit`);
    return;
  }
  
  try {
    // Fetch problems to check access
    const problemsRes = await axios.get(
      `http://localhost:8000/contests/${contestId}/problems/`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    
    console.log('Problems API Response:', problemsRes.data);
    
    const problems = problemsRes.data.problems || [];
    
    if (problems.length === 0) {
      alert('This contest has no problems yet.');
      return; // Don't navigate anywhere
    }
    
    // Get the FIRST problem's index dynamically
    const firstProblem = problems[0];
    const firstProblemIndex = firstProblem.problem_id || firstProblem.index || firstProblem.code || 'A';
    
    console.log('Navigating to problem:', { contestId, firstProblemIndex, contestStatus });
    
    // Navigate to the problem
    navigate(`/contests/${contestId}`);
    
  } catch (error) {
    console.error('Error fetching contest problems:', error);
    
    // Handle registration required
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      
      if (errorData.can_register) {
        // Show registration prompt
        const shouldRegister = window.confirm(
          `You need to register for this ${contestStatus} contest. Register now?`
        );
        
        if (shouldRegister) {
          try {
            // Try to register
            await axios.post(
              `http://localhost:8000/contests/${contestId}/register/`,
              {},
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            alert('Successfully registered! You can now enter the contest.');
            
            // Try to enter contest again
            const problemsRes = await axios.get(
              `http://localhost:8000/contests/${contestId}/problems/`,
              { headers: { Authorization: `Bearer ${TOKEN}` } }
            );
            
            const problems = problemsRes.data.problems || [];
            if (problems.length > 0) {
              const firstProblem = problems[0];
              const firstProblemIndex = firstProblem.problem_id || firstProblem.index || firstProblem.code || 'A';
              navigate(`/contests/${contestId}`);
            }
            
          } catch (registerError) {
            console.error('Registration error:', registerError);
            
            if (registerError.response?.status === 400) {
              alert(registerError.response.data.error || 'Registration failed');
            } else {
              // Navigate to registration page
              navigate(`/contests/${contestId}/register`);
            }
          }
        }
      } else {
        alert(errorData.message || 'Access denied to this contest.');
      }
    } else {
      // Other errors
      alert('Failed to load contest. Please try again.');
    }
  }
  // REMOVE THIS LINE: navigate(`/contests/${contestId}`);
};

  // Handle contest title click
  const handleTitleClick = (contest, e) => {
    if (contest.status === 'upcoming') {
    return;

    if (contest.status === 'draft') {
      // For drafts, go to edit page
      navigate(`/contests/${contest.id}/edit`);
    } 
  }
    
    handleContestEntry(contest.id, contest.status);
  };

  // Handle contest card click
  const handleCardClick = (contest) => {
    console.log('Card clicked for contest:', contest);
    handleContestEntry(contest.id, contest.status);
  };

const handleDraftEdit = (contestId, e) => {
  e.stopPropagation();
  console.log('Edit draft:', contestId);
  navigate(`/contests/${contestId}/edit`);
};
  // Handle draft publish button
  const handleDraftPublish = async (contestId, e) => {
    e.stopPropagation();
    console.log('Publish draft:', contestId);
    handlePublishDraft(contestId);
  };

  // Define status tabs
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
                    {activeTab === 'draft' && ` • ${contests.filter(c => c.status === 'draft').length} draft${contests.filter(c => c.status === 'draft').length !== 1 ? 's' : ''}`}
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
                  console.log('Contest data:', {
      id: contest.id,
      title: contest.title,
      duration: contest.duration,
      duration_type: typeof contest.duration
    }),
                  <div 
                    key={contest.id} 
                    className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                    onClick={() => handleCardClick(contest)}
                    style={{ 
                      cursor: contest.status === 'upcoming' ? 'default' : 'pointer'
                    }}
                  >
                    <div className="p-4 flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
<h3 
  className={`text-xs font-semibold truncate ${
    contest.status === 'upcoming' 
      ? 'text-gray-900' 
      : 'text-gray-900 hover:text-blue-800 cursor-pointer'
  }`}
  onClick={(e) => {
    e.stopPropagation();
    
    // Handle different statuses
    if (contest.status === 'upcoming') {
      return; // No action for upcoming contests
    }
    
    if (contest.status === 'draft') {
      // For drafts, go to edit page
      navigate(`/contests/${contest.id}/edit`);
    } else {
      // For other statuses, use the contest entry logic
      handleContestEntry(contest.id, contest.status);
    }
  }}
>
  {contest.title}
</h3>
                          <span className={getStatusBadge(contest.status)}>
                            {contest.status === 'live' ? 'Live' : 
                             contest.status === 'upcoming' ? 'Upcoming' : 
                             contest.status === 'past' ? 'Past' :
                             contest.status === 'draft' ? 'Draft' :
                             contest.status === 'test' ? 'Test' : contest.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {getPlatformName(contest.platform)} • {contest.type === 'individual' ? 'Individual' : 'Team' || 'Individual'}
                          {contest.status === 'draft' && contest.is_creator && (
                            <span className="ml-2 text-yellow-600">(Your Draft)</span>
                          )}
                          {contest.status === 'draft' && !contest.is_creator && (
                            <span className="ml-2 text-gray-500">(Other User's Draft)</span>
                          )}
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

                        
                        {/* UPCOMING BUTTONS */}
                        {contest.status === 'upcoming' && (
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
                        )}
                        
{/* LIVE BUTTONS */}
{contest.status === 'live' && (
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
)}
                        
                        {/* PAST BUTTONS */}
                        {contest.status === 'past' && (
                          <button 
                            onClick={() => handleContestEntry(contest.id, 'past')}
                            className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200"
                          >
                            View
                          </button>
                        )}
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

          {/* Sidebar */}
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