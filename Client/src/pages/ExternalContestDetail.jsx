import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Trophy, ArrowLeft, ExternalLink, UserPlus } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../utils/api';

const ExternalContestDetail = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [contestData, setContestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token from localStorage
  const TOKEN = localStorage.getItem('token');

  useEffect(() => {
    const fetchExternalContest = async () => {
      try {
        setLoading(true);
        
        // Decode the contest ID to get platform and external ID
        const decodedId = decodeURIComponent(contestId);
        const idParts = decodedId.split('_');
        
        if (idParts.length < 3 || idParts[0] !== 'external') {
          throw new Error('Invalid external contest ID');
        }
        
        const platform = idParts[1];
        const externalId = idParts[2];
        
        console.log('🔍 Fetching external contest:', { platform, externalId });
        
        // Fetch external contest details
        const response = await axios.get(
          `${BACKEND_URL}/external/contests/?platform=${platform}`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` }
          }
        );
        
        // Find the specific contest
        const contest = response.data.find(c => 
          String(c.external_id) === String(externalId) && c.platform === platform
        );
        
        if (!contest) {
          throw new Error('External contest not found');
        }
        
        // Transform to match our display format
        const transformedContest = {
          id: decodedId,
          title: contest.title,
          platform: contest.platform,
          status: contest.status === 'finished' ? 'past' : contest.status,
          start_time: contest.start_time,
          duration_seconds: contest.duration_seconds,
          duration_formatted: contest.duration_formatted,
          participants: contest.participants || 0,
          type: 'individual',
          is_external: true,
          external_url: contest.url,
          description: `External contest from ${getPlatformDisplayName(contest.platform)}`
        };
        
        setContestData(transformedContest);
        setError(null);
        
      } catch (err) {
        console.error('❌ Error fetching external contest:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load contest details');
      } finally {
        setLoading(false);
      }
    };

    if (TOKEN) {
      fetchExternalContest();
    } else {
      setError('Please log in to view contest details');
      setLoading(false);
    }
  }, [contestId, TOKEN]);

  const getPlatformDisplayName = (platform) => {
    const platformNames = {
      'cf': 'Codeforces',
      'cc': 'CodeChef', 
      'ac': 'AtCoder',
      'lc': 'LeetCode'
    };
    return platformNames[platform] || platform;
  };

  const getPlatformColor = (platform) => {
    const colors = {
      'cf': 'bg-orange-100 text-orange-800',
      'cc': 'bg-green-100 text-green-800',
      'ac': 'bg-purple-100 text-purple-800',
      'lc': 'bg-yellow-100 text-yellow-800'
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const base = "px-3 py-1 rounded-full text-sm font-semibold";
    switch (status) {
      case 'live': return `${base} bg-red-100 text-red-800`;
      case 'upcoming': return `${base} bg-blue-100 text-blue-800`;
      case 'past': return `${base} bg-green-100 text-green-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '—';
  };

  const handleVisitContest = () => {
    if (contestData?.external_url) {
      window.open(contestData.external_url, '_blank');
    }
  };

  const handleRegister = () => {
    // For external contests, registration happens on the original platform
    if (confirm(`You will be redirected to ${getPlatformDisplayName(contestData.platform)} to register for this contest. Continue?`)) {
      handleVisitContest();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contest details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Contest Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/contests')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Contests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contest Details</h2>
          <p className="text-gray-600">No contest data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/contests')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contests
          </button>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Contest Title and Status */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {contestData.title}
                  </h1>
                  <span className={`${getPlatformColor(contestData.platform)} px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                    {getPlatformDisplayName(contestData.platform)}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    EXTERNAL
                  </span>
                </div>
                <span className={getStatusBadge(contestData.status)}>
                  {contestData.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Contest Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Start Time</p>
                    <p className="text-sm">{formatDateTime(contestData.start_time)}</p>
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Duration</p>
                    <p className="text-sm">{formatDuration(contestData.duration_seconds)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Participants</p>
                    <p className="text-sm">{contestData.participants || 0} registered</p>
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Trophy className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Type</p>
                    <p className="text-sm capitalize">{contestData.type}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-gray-700">{contestData.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleVisitContest}
                className="flex-1 min-w-[140px] bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Contest
              </button>
              
              {contestData.status === 'upcoming' && (
                <button
                  onClick={handleRegister}
                  className="flex-1 min-w-[140px] bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Register
                </button>
              )}
              
              {contestData.status === 'live' && (
                <button
                  onClick={handleVisitContest}
                  className="flex-1 min-w-[140px] bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Enter Contest
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About This Contest</h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>This is an external contest hosted on {getPlatformDisplayName(contestData.platform)}. 
               All registration and participation will take place on their official platform.</p>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2">Important Notes:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Registration and participation happen on the original platform</li>
                <li>• Contest rules and format follow the host platform's guidelines</li>
                <li>• Results and standings are managed by {getPlatformDisplayName(contestData.platform)}</li>
                <li>• Click "Visit Contest" to go to the official contest page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalContestDetail;