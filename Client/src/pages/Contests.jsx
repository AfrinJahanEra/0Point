import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Users, Trophy, Search, Play, Eye, Edit, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Video } from 'lucide-react';
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedContests, setPaginatedContests] = useState([]);

  // Get token from localStorage (from successful login)
  const TOKEN = localStorage.getItem('token');

  // Initial data fetch
  useEffect(() => {
    // Check if user is logged in
    if (!TOKEN) {
      console.log('⚠️ User not logged in, redirecting to login');
      // In a real app, this would redirect to login
      // For now, we'll show an error
      setError('Please log in to view contests');
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📡 Fetching initial contests data...');
        
        // ========== Fetch ONLY regular contests ==========  
        const contestsRes = await axios.get('http://localhost:8000/contests/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        // IMPORTANT: Filter out test contests that might be included
        const regularContests = (contestsRes.data.contests || []).filter(contest => 
          !contest.is_test_contest && contest.visibility !== 'test'
        );
        
        // Fetch test contests separately
        const testContestsRes = await axios.get('http://localhost:8000/test-contests/my/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        
        console.log('✅ Regular contests loaded:', regularContests.length);
        console.log('✅ Test contests loaded:', testContestsRes.data.test_contests?.length || 0);
        
        // Combine regular and test contests
        const allContests = [
          ...regularContests,
          ...(testContestsRes.data.test_contests || [])
        ];
        
        setContests(allContests);
        
        // Fetch user's registrations
        try {
          const registrationsRes = await axios.get('http://localhost:8000/contests/registrations/', {
            headers: { Authorization: `Bearer ${TOKEN}` }
          });
          console.log('✅ Registrations loaded:', registrationsRes.data.registered_contests?.length || 0);
          setRegisteredContests(registrationsRes.data.registered_contests || []);
        } catch (regErr) {
          console.warn('⚠️ Could not fetch registrations:', regErr);
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
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    console.log('🔌 [WebSocket] Initializing connection...');
    
    let ws;
    
    try {
      ws = new WebSocket("ws://localhost:8000/ws/contest/global/");
      
      ws.onopen = () => {
        console.log('✅ [WebSocket] Connected to real-time contest updates');
      };

      ws.onerror = (err) => {
        console.warn('⚠️ [WebSocket] Connection failed (Redis may not be running):', err);
        // WebSocket failure shouldn't break the app functionality
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
    } catch (error) {
      console.warn('⚠️ [WebSocket] Failed to initialize connection (Redis may not be running):', error);
    }

    // Cleanup on unmount
    return () => {
      console.log('🔌 [WebSocket] Cleaning up connection...');
      if (ws) {
        ws.close();
      }
    };
  }, []);

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

  // Pagination effect
  useEffect(() => {
    // Calculate total pages
    const total = Math.ceil(filteredContests.length / itemsPerPage);
    setTotalPages(total || 1);
    
    // Adjust current page if it's beyond total pages
    if (currentPage > total && total > 0) {
      setCurrentPage(1);
    }
    
    // Calculate paginated contests
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredContests.slice(startIndex, endIndex);
    setPaginatedContests(paginated);
  }, [filteredContests, currentPage, itemsPerPage]);

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

  const getStatusBadge = (status, isTestContest) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold border";
    
    // If it's a test contest and status is upcoming/live/past, show test badge
    if (isTestContest && ['upcoming', 'live', 'past'].includes(status)) {
      return `${base} bg-purple-50 text-purple-800 border-purple-200`;
    }
    
    switch (status) {
      case 'live': return `${base} bg-red-50 text-red-800 border-red-200`;
      case 'upcoming': return `${base} bg-blue-50 text-blue-800 border-blue-200`;
      case 'past': return `${base} bg-green-50 text-green-800 border-green-200`;
      case 'draft': return `${base} bg-yellow-50 text-yellow-800 border-yellow-200`;
      case 'test': return `${base} bg-purple-50 text-purple-800 border-purple-200`;
      default: return `${base} bg-gray-50 text-gray-800 border-gray-200`;
    }
  };

  const formatHourDuration = (contest) => {
    if (contest.duration_formatted) return contest.duration_formatted;
    if (contest.duration_seconds) {
      const totalMin = Math.floor(contest.duration_seconds / 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    if (contest.duration) { // manual fallback
      const h = Math.floor(contest.duration);
      const m = Math.round((contest.duration - h) * 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    return '—';
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

  const handleContestEntry = async (contestId, contestStatus, contestData) => {
    console.log('🎯 Contest entry:', { contestId, contestStatus, contestData });
    
    // If it's a draft, navigate to edit page
    if (contestStatus === 'draft') {
      navigate(`/contests/${contestId}/edit`);
      return;
    }
    
    // Check if it's a test contest by looking for specific fields
    const isTestContest = contestData && (
      contestData.is_test_contest || 
      contestData.visibility === 'test' || 
      contestData.original_contest_id !== undefined
    );
    
    console.log('🔍 Contest type check:', { 
      isTestContest, 
      contestId,
      hasIsTestField: contestData?.is_test_contest,
      visibility: contestData?.visibility,
      hasOriginalId: contestData?.original_contest_id !== undefined
    });
    
    // If it's a test contest, navigate to test contest page
    if (isTestContest) {
      console.log('🔧 Navigating to test contest page:', contestId);
      navigate(`/test-contests/${contestId}/problems`);
      return;
    }
    
    // Regular contest flow...
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

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (e) => {
    const value = parseInt(e.target.value);
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = end - maxVisiblePages + 1;
      }
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
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

          {/* Main content */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Contests</h1>
                  <p className="text-xs text-gray-600 mt-1">
                    {filteredContests.length} contest{filteredContests.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Items per page selector */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="itemsPerPage" className="text-xs text-gray-600">
                      Show:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
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

            {/* Contest list */}
            <div className="grid gap-4">
              {filteredContests.length === 0 ? (
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
              ) : (
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
                          <h3 className="text-xs font-semibold truncate text-gray-900">{contest.title}
                            {(contest.visibility === 'test' || contest.is_test_contest) && (
                              <span className="ml-2 bg-purple-100 text-purple-900 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                TEST
                              </span>
                            )}
                          </h3>

                          <span className={getStatusBadge(contest.status, contest.visibility === 'test' || contest.is_test_contest)}>
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
                            <span>{formatHourDuration(contest)}</span>
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
                        ) : contest.visibility === 'test' || contest.is_test_contest ? (
                          // TEST CONTEST BUTTONS (no registration needed)
                          contest.status === 'live' ? (
                            <button
                              onClick={() => handleContestEntry(contest.id, 'live', contest)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Enter</span>
                            </button>
                          ) : contest.status === 'upcoming' ? (
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">
                              Upcoming
                            </span>
                          ) : contest.status === 'past' ? (
                            <button 
                              onClick={() => handleContestEntry(contest.id, 'past', contest)}
                              className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          ) : null
                        ) : contest.status === 'upcoming' ? (
                          // REGULAR CONTEST - Upcoming (needs registration)
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
                          // REGULAR CONTEST - Live
                          registeredContests.includes(contest.id) ? (
                            <button
                              onClick={() => handleContestEntry(contest.id, 'live', contest)}
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
                          <div className="flex flex-col space-y-2">
                            <button 
                              onClick={() => handleContestEntry(contest.id, 'past', contest)}
                              className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                             <Eye className="w-3 h-3" />
                             <span>View</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/contests/${contest.id}/recordings`)}
                              className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <Video className="w-3 h-3" />
                              <span>Recordings</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls - Only show if we have more than 1 page */}
            {totalPages > 1 && filteredContests.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 mt-4 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-600">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredContests.length)} to {Math.min(currentPage * itemsPerPage, filteredContests.length)} of {filteredContests.length} contests
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* First Page */}
                    <button
                      onClick={goToFirstPage}
                      disabled={currentPage === 1}
                      className={`p-1.5 rounded border ${
                        currentPage === 1
                          ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    
                    {/* Previous Page */}
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`p-1.5 rounded border ${
                        currentPage === 1
                          ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center text-xs rounded border ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>
                    
                    {/* Next Page */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 rounded border ${
                        currentPage === totalPages
                          ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    {/* Last Page */}
                    <button
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 rounded border ${
                        currentPage === totalPages
                          ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Page info */}
                  <div className="text-xs text-gray-600">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </div>
                </div>
              </div>
            )}
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