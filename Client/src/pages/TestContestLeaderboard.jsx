// TestContestLeaderboard.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Trophy, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Medal,
  Star,
  Award,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Shield,
  TestTube
} from 'lucide-react';

const TestContestLeaderboard = () => {

  const params = useParams(); 
  const navigate = useNavigate();
  console.log('🎯 All route params:', params);
  console.log('🎯 testContestId from params:', params.testContestId);
  console.log('🎯 Full URL:', window.location.href);

  const testContestId = params.testContestId;


  // const { testContestId } = useParams();
  
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [contestStatus, setContestStatus] = useState('live');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contestProblems, setContestProblems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  useEffect(() => {
    if (!testContestId) {
      console.error('❌ testContestId is undefined!');
      console.error('❌ Current params:', params);
      console.error('❌ Route pattern should be: /test-contests/:testContestId/standings');
      setError('Contest ID is missing from URL');
      return;
    }
    
    console.log('✅ Valid testContestId:', testContestId);
  }, [testContestId, params]);


  // Fetch leaderboard data from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        console.log(`📡 Fetching test contest leaderboard for ID: ${testContestId}`);
        
        const response = await axios.get(
          `http://localhost:8000/test-contests/${testContestId}/standings/`,
          { 
            headers: { 
              'Authorization': `Bearer ${TOKEN}`
            },
          }
        );
        
        console.log('✅ Axios response:', response);
        
        // Axios stores data in response.data
        const data = response.data;
        
        if (!data) {
          throw new Error('No data received from server');
        }
        
        console.log('📊 Leaderboard data:', data);
        
        setLeaderboardData(data.leaderboard || []);
        
        // Store the actual problems from backend
        if (data.problems) {
          setContestProblems(data.problems);
        }
        
        // Set contest status if provided
        if (data.contest_status) {
          setContestStatus(data.contest_status);
        }
        
        // Calculate time remaining if contest is live
        if (data.contest_status === 'live' && data.contest_info?.end_time) {
          const endTime = new Date(data.contest_info.end_time);
          const now = new Date();
          const remainingSeconds = Math.max(0, (endTime - now) / 1000);
          setTimeRemaining(Math.floor(remainingSeconds));
        }
        
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching leaderboard:', err);
        
        // Axios specific error handling
        if (axios.isAxiosError(err)) {
          if (err.response) {
            // Server responded with error status
            console.error('Server Error:', err.response.status);
            console.error('Error Data:', err.response.data);
            
            if (err.response.status === 401) {
              setError('Unauthorized - Please login again');
            } else if (err.response.status === 403) {
              setError(`Access Denied - ${err.response.data?.message || 'You are not authorized to view this leaderboard'}`);
            } else if (err.response.status === 404) {
              setError('Test contest not found');
            } else {
              setError(err.response.data?.error || `Server Error: ${err.response.status}`);
            }
          } else if (err.request) {
            // No response received
            setError('No response from server. Please check if the backend is running.');
          } else {
            // Request setup error
            setError(`Request Error: ${err.message}`);
          }
        } else {
          // Non-axios error
          setError(err.message || 'Unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    if (testContestId) {
      fetchLeaderboard();
      // Refresh every 30 seconds if contest is live
      const interval = setInterval(() => {
        if (contestStatus === 'live') {
          fetchLeaderboard();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [testContestId, contestStatus]);

  useEffect(() => {
    if (contestStatus === 'live' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [contestStatus, timeRemaining]);

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200';
    if (rank <= 10) return 'bg-blue-50 text-blue-800 border border-blue-200';
    if (rank <= 100) return 'bg-green-50 text-green-800 border border-green-200';
    return 'bg-gray-50 text-gray-800 border border-gray-200';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Medal className="w-3 h-3 text-yellow-600" />;
    if (rank === 2) return <Medal className="w-3 h-3 text-gray-600" />;
    if (rank === 3) return <Medal className="w-3 h-3 text-amber-600" />;
    if (rank <= 10) return <Star className="w-3 h-3 text-blue-600" />;
    return null;
  };

  const getRatingChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex flex-col items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="w-6 h-6 text-purple-600" />
          <p className="text-gray-600 font-medium">Loading Test Contest Leaderboard...</p>
        </div>
        <p className="text-sm text-gray-500">Contest ID: {testContestId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <TestTube className="w-12 h-12 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Leaderboard Error</h3>
          <p className="text-gray-600 mb-4 text-center">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/test-contests/${testContestId}`)}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Back to Test Contest
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Test Contest ID: {testContestId}</p>
              <p>Token: {TOKEN.substring(0, 20)}...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Test Contest Leaderboard
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    TEST
                  </span>
                </h1>
                <p className="text-gray-600">
                  {contestProblems.length} problems • {leaderboardData.length} participants
                </p>
              </div>
            </div>
            
            {contestStatus === 'live' && timeRemaining > 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-600 flex items-center justify-end gap-1">
                  <Clock className="w-4 h-4" />
                  Time Remaining
                </div>
                <div className="font-mono font-bold text-xl text-red-600 animate-pulse">
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${
              contestStatus === 'live' ? 'bg-red-100 text-red-800' :
              contestStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
              contestStatus === 'past' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {contestStatus?.charAt(0).toUpperCase() + contestStatus?.slice(1)}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-600">Test version for contest organizers</span>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 w-20">Rank</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 min-w-[250px]">Participant</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 w-24">Score</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 w-28">Solved</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 w-28">Penalty</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900 w-32">Problem Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((participant) => (
                    <tr 
                      key={participant.rank} 
                      className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                        participant.isCurrentUser 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100' 
                          : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center">
                        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full ${getRankBadge(participant.rank)}`}>
                          {getRankIcon(participant.rank)}
                          <span className="font-bold text-sm">{participant.rank}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {participant.username?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              <span className="truncate">{participant.username || 'Anonymous'}</span>
                              {participant.isCurrentUser && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full whitespace-nowrap">You</span>
                              )}
                            </div>
                            <div className="text-gray-600 text-xs mt-1 truncate">
                              {participant.name || 'No name'} • {participant.institution || 'No institution'}
                            </div>
                            {participant.country && (
                              <div className="text-gray-500 text-xs mt-0.5">
                                {participant.country}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{participant.score}</div>
                          <div className="text-xs text-gray-600">points</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-green-600 text-lg">{participant.problemsSolved}</span>
                          <span className="text-xs text-gray-600">
                            of {contestProblems.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-medium text-gray-900">{participant.penalty}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-1.5 justify-center">
                          {participant.submissions?.map((submission, idx) => (
                            <div 
                              key={idx} 
                              className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg text-xs font-medium ${
                                submission.status === 'AC' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : submission.status === 'WA' 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : 'bg-gray-50 text-gray-400 border border-gray-200'
                              }`}
                              title={`Problem ${submission.problem}: ${submission.status === 'AC' ? `Accepted (${submission.points} pts)` : submission.status === 'WA' ? 'Wrong Answer' : 'Not Attempted'}`}
                            >
                              <div className="font-bold">{submission.problem}</div>
                              {submission.status === 'AC' && submission.points > 0 && (
                                <div className="text-[10px] font-semibold">{submission.points}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Trophy className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Participants Yet</h3>
                        <p className="text-gray-500 max-w-md">
                          No submissions have been made to this test contest yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestContestLeaderboard;