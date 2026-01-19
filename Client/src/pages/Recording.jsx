// Recording.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Filter, Calendar, User, Video, 
  Clock, Download, Eye, Play, Pause,
  ChevronLeft, ChevronRight, Loader2,
  AlertCircle, X, Maximize2, Volume2,
  Settings, ArrowLeft, ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const Recordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [contestInfo, setContestInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    user: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  const navigate = useNavigate();
  const { contestId, userId } = useParams();
  const perPage = 20;

  const TOKEN = localStorage.getItem('token');

  const getHeaders = () => ({
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  });

  const fetchRecordings = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pageNum,
        per_page: perPage,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.user && { user: filters.user }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo })
      });

      let url;
      if (userId) {
        // User-specific recordings (if still needed for direct navigation)
        url = `http://localhost:8000/contests/${contestId}/recordings/user/${userId}/`;
      } else {
        // All recordings
        url = `http://localhost:8000/contests/${contestId}/recordings/?${params}`;
      }

      const response = await axios.get(url, { headers: getHeaders() });

      setRecordings(response.data.recordings || []);
      setContestInfo(response.data.contest_info || null);
      
      if (userId && response.data.user_info) {
        setUserInfo(response.data.user_info);
      } else {
        setUserInfo(null);
      }
      
      setTotalCount(response.data.total_count || 0);
      setTotalPages(response.data.total_pages || 1);
      setPage(response.data.page || 1);
      
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err.response?.data?.error || 'Failed to load recordings');
      setRecordings([]);
      setContestInfo(null);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contestId) {
      fetchRecordings();
    }
  }, [contestId, page, userId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecordings(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
    fetchRecordings(1);
  };

  const clearFilters = () => {
    setFilters({
      user: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
    fetchRecordings(1);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePlayRecording = (recording) => {
    setSelectedRecording(recording);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedRecording(null);
    setVideoPlaying(false);
  };

  const handleDownload = async (recording) => {
    try {
      const response = await axios.get(recording.video_url, {
        responseType: 'blob',
        headers: getHeaders()
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${recording.contest_title}_${recording.user_name}_${recording.start_time}.${recording.video_format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download recording');
    }
  };

  const goBack = () => {
    if(userId){
      navigate(`/contests/${contestId}/recordings`);
    } else {
      navigate(-1);
    }
  };

  const getStatusBadge = (status) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold border";
    switch (status) {
      case 'completed': return `${base} bg-green-50 text-green-800 border-green-200`;
      case 'recording': return `${base} bg-blue-50 text-blue-800 border-blue-200`;
      case 'error': return `${base} bg-red-50 text-red-800 border-red-200`;
      case 'stopped': return `${base} bg-yellow-50 text-yellow-800 border-yellow-200`;
      default: return `${base} bg-gray-50 text-gray-800 border-gray-200`;
    }
  };

  if (loading && recordings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Contest Info */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {userInfo 
                    ? `${contestInfo?.title} - ${userInfo.name}'s Recordings`
                    : `${contestInfo?.title} - Screen Recordings`
                  }
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  {totalCount} recording{totalCount !== 1 ? 's' : ''} found
                  {contestInfo?.created_by?.name && ` • Created by ${contestInfo.created_by.name}`}
                </p>
              </div>
            </div>
            
            {/* Search Bar - Only show when NOT viewing a specific user */}
            {!userId && (
              <form onSubmit={handleSearch} className="w-full max-w-xs">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by user name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Filter Toggle Button - Only show when NOT viewing a specific user */}
          {!userId && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                    fetchRecordings(1);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {!userId && showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  User
                </label>
                <input
                  type="text"
                  value={filters.user}
                  onChange={(e) => handleFilterChange('user', e.target.value)}
                  placeholder="User name or email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Status</option>
                  <option value="recording">Recording</option>
                  <option value="stopped">Stopped</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800 text-sm">Error Loading Recordings</h3>
                <p className="text-red-600 text-xs mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-2">No Recordings Found</h3>
            <p className="text-gray-600 text-xs">
              {userId 
                ? "No recordings found for this user"
                : searchQuery || Object.values(filters).some(f => f) 
                  ? "Try adjusting your search or filters" 
                  : "No screen recordings available for this contest yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Recordings Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Size
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recorded
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recordings.map((recording) => (
                      <tr 
                        key={recording.id} 
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{recording.user_name}</div>
                              <div className="text-xs text-gray-500">{recording.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDuration(recording.duration)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(recording.file_size || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDateTime(recording.start_time)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={getStatusBadge(recording.recording_status)}>
                            {recording.recording_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePlayRecording(recording)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Watch
                            </button>
                            {recording.video_url && (
                              <button
                                onClick={() => handleDownload(recording)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination - Only show when NOT viewing a specific user */}
              {!userId && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-xs text-gray-700">
                    Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} recordings
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs ${
                              page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compact Fullscreen Video Player */}
      {isFullscreen && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeFullscreen}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
                <div>
                  <h2 className="font-bold text-gray-100 text-sm">{selectedRecording.contest_title}</h2>
                  <p className="text-xs text-gray-400">
                    {selectedRecording.user_name} • {formatDateTime(selectedRecording.start_time)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleDownload(selectedRecording)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            
            {/* Video Player */}
            <div className="flex-1 flex items-center justify-center p-4">
              {selectedRecording.video_url ? (
                <div className="relative w-full max-w-3xl">
                  <video
                    key={selectedRecording.video_url}
                    src={selectedRecording.video_url}
                    className="w-full h-auto rounded-lg"
                    controls
                    autoPlay
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Video Unavailable</h3>
                  <p className="text-gray-400 text-xs">
                    The recording file could not be loaded.
                  </p>
                </div>
              )}
            </div>
            
            {/* Video Info */}
            <div className="px-6 py-4 border-t border-gray-800 bg-gray-900 rounded-b-xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="font-medium text-gray-100 text-sm">{formatDuration(selectedRecording.duration)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">File Size</p>
                  <p className="font-medium text-gray-100 text-sm">{formatFileSize(selectedRecording.file_size || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Format</p>
                  <p className="font-medium text-gray-100 text-sm uppercase">{selectedRecording.video_format}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="font-medium text-gray-100 text-sm capitalize">{selectedRecording.recording_status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recordings;