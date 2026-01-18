import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Users, Trophy, Search, Play, Eye, Edit, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjk0NTYwMTY5MjM3MWFmMGU5OWMyYWZjIiwiZW1haWwiOiJlcmFAZ29vZ2xlLmNvbSIsInJvbGUiOiJ1c2VyIn0.zwibsApLmoW3oQ-Aq9OXw6g56gPqaWr2piZMQypVrew";

  // Normalize external contest → unified shape
  const normalizeExternalContest = (c) => ({
    id: `${c.platform}-${c.external_id}`,
    title: c.title,
    description: `${getPlatformName(c.platform)} Contest`,
    platform: c.platform,                    // 'cf', 'lc', 'cc', 'ac'
    start_time: c.start_time,
    duration_seconds: c.duration_seconds,
    duration_formatted: c.duration_formatted, // preferred
    status: c.status === 'finished' ? 'past' : c.status,
    type: 'individual',
    participants: c.participants || 0,
    url: c.url,
    external: true
  });

  // Fetch all contests (manual + all external platforms)
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Manual contests (your platform)
      const manualRes = await axios.get('http://localhost:8000/contests/', {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      const manualContests = (manualRes.data.contests || []).map(c => ({
        ...c,
        external: false,
        platform: c.platform || 'IUT',           // fallback
        id: c.id || `manual-${c._id || Math.random()}`
      }));

      // 2. All external contests in one call
      const externalRes = await axios.get('http://localhost:8000/external/contests/?platform=all', {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      const externalContests = (externalRes.data || []).map(normalizeExternalContest);

      const allContests = [...manualContests, ...externalContests];
      setContests(allContests);

      // 3. Registrations (only for manual contests)
      try {
        const regRes = await axios.get('http://localhost:8000/contests/registrations/', {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        setRegisteredContests(regRes.data.registered_contests || []);
      } catch (regErr) {
        console.warn('Registrations fetch failed', regErr);
        setRegisteredContests([]);
      }

      setError(null);
    } catch (err) {
      console.error('Contests fetch failed:', err);
      setError(err.response?.data?.error || 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket – only refresh manual contests
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/contest/global/");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "contest_list_update") {
          setContests(prev => {
            const external = prev.filter(c => c.external);
            const updatedManual = data.contests || [];
            return [...updatedManual, ...external];
          });
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };
    return () => ws.close();
  }, []);

  // Filtering
  useEffect(() => {
    let result = [...contests];

    // Status filter
    if (activeTab !== 'all') {
      if (activeTab === 'draft') {
        result = result.filter(c => c.status === 'draft' && !c.external);
      } else {
        result = result.filter(c => c.status === activeTab);
      }
    }

    // Platform filter
    if (activePlatform !== 'all') {
      result = result.filter(c => c.platform === activePlatform);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }

    setFilteredContests(result);
    // Reset to first page when filters change
    setCurrentPage(1);
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

  const getPlatformName = (p) => {
    const map = {
      'cf': 'Codeforces',
      'lc': 'LeetCode',
      'cc': 'CodeChef',
      'ac': 'AtCoder',
      'IUT': 'IUT Platform',
    };
    return map[p] || p || 'Unknown';
  };

  const getStatusBadge = (status) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold border";
    const styles = {
      live:     "bg-red-50 text-red-800 border-red-200",
      upcoming: "bg-blue-50 text-blue-800 border-blue-200",
      past:     "bg-green-50 text-green-800 border-green-200",
      draft:    "bg-yellow-50 text-yellow-800 border-yellow-200",
      test:     "bg-purple-50 text-purple-800 border-purple-200",
    };
    return `${base} ${styles[status] || "bg-gray-50 text-gray-800 border-gray-200"}`;
  };

  const formatHourDuration = (c) => {
    if (c.duration_formatted) return c.duration_formatted;
    if (c.duration_seconds) {
      const totalMin = Math.floor(c.duration_seconds / 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    if (c.duration) { // manual fallback
      const h = Math.floor(c.duration);
      const m = Math.round((c.duration - h) * 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    return '—';
  };

  const formatDateTime = (iso) => {
    if (!iso) return 'Not scheduled';
    try {
      const d = new Date(iso);
      if (isNaN(d)) return 'Invalid date';
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleContestEntry = async (contest, e) => {
    e?.stopPropagation?.();
    const { id, status, external, url } = contest;

    if (external && url) {
      window.open(url, '_blank');
      return;
    }

    if (status === 'draft') {
      navigate(`/contests/${id}/edit`);
      return;
    }

    if (status === 'upcoming' || status === 'live' || status === 'past') {
      try {
        const res = await axios.get(
          `http://localhost:8000/contests/${id}/problems/`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        if ((res.data.problems || []).length === 0 && status !== 'past') {
          alert('No problems available yet.');
          return;
        }
        navigate(`/contests/${id}`);
      } catch (err) {
        if (err.response?.status === 403 && err.response.data?.can_register) {
          const ok = window.confirm(`Register for this ${status} contest?`);
          if (ok) {
            try {
              await axios.post(
                `http://localhost:8000/contests/${id}/register/`,
                {},
                { headers: { Authorization: `Bearer ${TOKEN}` } }
              );
              setRegisteredContests(prev => [...prev, id]);
              navigate(`/contests/${id}`);
            } catch (regErr) {
              alert('Registration failed.');
            }
          }
        } else {
          alert(err.response?.data?.message || 'Cannot access contest.');
        }
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
    { value: 'all',     label: 'All Contests' },
    { value: 'live',    label: 'Live Now' },
    { value: 'upcoming',label: 'Upcoming' },
    { value: 'past',    label: 'Past' },
    { value: 'draft',   label: 'My Drafts' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading contests...</div>
    </div>
  );
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Error Loading Contests</h3>
          <p className="text-gray-600 text-sm text-center">{error}</p>
          <button
            onClick={fetchData}
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
                      placeholder="Search contests..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
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
              {paginatedContests.length === 0 ? (
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
                paginatedContests.map(c => (
                  <div
                    key={c.id}
                    className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
                    style={{
                      cursor: c.status === 'upcoming' ? 'default' : 'pointer'
                    }}
                    onClick={() => {
                      if (c.status !== 'upcoming' && c.status !== 'draft') {
                        handleContestEntry(c);
                      }
                    }}
                  >
                    <div className="p-4 flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-xs font-semibold truncate text-gray-900">{c.title}</h3>
                          <span className={getStatusBadge(c.status)}>
                            {c.status.toUpperCase()}
                          </span>
                          {/* REMOVED: External platform badge since platform name is shown below */}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {getPlatformName(c.platform)} • {c.type === 'individual' ? 'Individual' : 'Team'}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(c.start_time)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatHourDuration(c)}</span>
                          </span>
                          {!c.external && (
                            <span className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{c.participants || 0} participants</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 ml-4" onClick={e => e.stopPropagation()}>
                        {c.external ? (
                          <button
                            onClick={() => window.open(c.url, '_blank')}
                            className={`px-3 py-1.5 rounded text-xs font-medium hover:transition-colors duration-200 flex items-center space-x-1 ${
                              c.status === 'live'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{c.status === 'live' ? 'Join' : 'View Details'}</span>
                          </button>
                        ) : c.status === 'draft' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => handleDraftEdit(c.id, e)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : c.status === 'upcoming' ? (
                          registeredContests.includes(c.id) ? (
                            <span className="px-3 py-1.5 bg-gray-300 text-gray-600 rounded text-xs font-medium">Registered</span>
                          ) : (
                            <button
                              onClick={() => navigate(`/contests/${c.id}/register`)}
                              className="bg-blue-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Register</span>
                            </button>
                          )
                        ) : c.status === 'live' ? (
                          registeredContests.includes(c.id) ? (
                            <button
                              onClick={() => handleContestEntry(c)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>Enter</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/contests/${c.id}/register`)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Live</span>
                            </button>
                          )
                        ) : c.status === 'past' ? (
                          <button
                            onClick={() => handleContestEntry(c)}
                            className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-900 transition-colors duration-200"
                          >
                            View
                          </button>
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

          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-3">Filter by Platform</h2>
                <div className="space-y-1">
                  {['all', 'IUT', 'cf', 'cc', 'ac', 'lc'].map(p => (
                    <button
                      key={p}
                      onClick={() => setActivePlatform(p)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-xs rounded-lg transition-colors duration-200 ${
                        activePlatform === p
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{p === 'all' ? 'All Platforms' : getPlatformName(p)}</span>
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