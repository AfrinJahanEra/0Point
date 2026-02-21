import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../utils/api';
import { 
  Trophy, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Medal,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Award
} from 'lucide-react';

const ContestLeaderboard = () => {
  const params = useParams(); 
  const navigate = useNavigate();
  const contestId = params.contestId;
  
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [contestStatus, setContestStatus] = useState('live');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contestProblems, setContestProblems] = useState([]);

  const TOKEN = localStorage.getItem('token');

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(
          `${BACKEND_URL}/contests/${contestId}/leaderboard/`,
          { 
            headers: { 
              'Authorization': `Bearer ${TOKEN}`
            },
          }
        );
        
        const data = response.data;
        
        if (!data) {
          throw new Error('No data received');
        }
        
        setLeaderboardData(data.leaderboard || []);
        
        if (data.problems) {
          setContestProblems(data.problems);
        }
        
        if (data.contest_status) {
          setContestStatus(data.contest_status);
        }
        
        if (data.contest_status === 'live' && data.contest_info?.end_time) {
          const endTime = new Date(data.contest_info.end_time);
          const now = new Date();
          const remainingSeconds = Math.max(0, (endTime - now) / 1000);
          setTimeRemaining(Math.floor(remainingSeconds));
        }
        
        setError(null);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError('Please login again');
          } else if (err.response?.status === 403) {
            setError('Access Denied');
          } else if (err.response?.status === 404) {
            setError('Contest not found');
          } else {
            setError(err.response?.data?.error || 'Server Error');
          }
        } else {
          setError(err.message || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchLeaderboard();
    }
  }, [contestId]);

  // Timer effect
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <Trophy className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Leaderboard Error</h3>
          <p className="text-gray-600 text-xs mb-3 text-center">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate(`/contests/${contestId}`)}
              className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
            >
              Back to Contest
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <h1 className="text-sm font-bold">Leaderboard</h1>
              <span className="text-xs bg-blue-800 text-blue-100 px-1.5 py-0.5 rounded">
                CONTEST
              </span>
            </div>
            
            {contestStatus === 'live' && timeRemaining > 0 && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3">
        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 font-medium text-gray-900 w-16">Rank</th>
                  <th className="text-left p-2 font-medium text-gray-900 min-w-[180px]">Participant</th>
                  <th className="text-left p-2 font-medium text-gray-900 w-16">Score</th>
                  <th className="text-left p-2 font-medium text-gray-900 w-20">Solved</th>
                  <th className="text-left p-2 font-medium text-gray-900 w-20">Rating</th>
                  <th className="text-left p-2 font-medium text-gray-900 w-24">Problem Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.length > 0 ? (
                  leaderboardData.map((participant) => (
                    <tr 
                      key={participant.rank} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        participant.isCurrentUser ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="p-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getRankBadge(participant.rank)}`}>
                          {getRankIcon(participant.rank)}
                          <span className="font-bold">{participant.rank}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {participant.username?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {participant.username || 'Anonymous'}
                              {participant.isCurrentUser && (
                                <span className="ml-1 px-1 py-0.5 bg-blue-600 text-white text-[10px] rounded">You</span>
                              )}
                            </div>
                            <div className="text-gray-600 truncate text-[10px]">
                              {participant.institution || participant.name || 'No institution'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-gray-900">{participant.score}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-green-600">{participant.problemsSolved || 0}</span>
                          <span className="text-gray-600">/ {contestProblems.length || 0}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-900">{participant.rating || 0}</span>
                          {participant.ratingChange && participant.ratingChange !== 0 && (
                            <span className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] ${
                              participant.ratingChange > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getRatingChangeIcon(participant.ratingChange)}
                              {participant.ratingChange > 0 ? '+' : ''}{participant.ratingChange}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {participant.submissions?.slice(0, 4).map((submission, idx) => (
                            <div 
                              key={idx} 
                              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${
                                submission.status === 'AC' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : submission.status === 'WA'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-gray-50 text-gray-400 border border-gray-200'
                              }`}
                              title={`Problem ${submission.problem}: ${
                                submission.status === 'AC' 
                                  ? `Accepted (${submission.points || 0} pts)` 
                                  : submission.status === 'WA'
                                  ? 'Wrong Answer'
                                  : 'Not Attempted'
                              }`}
                            >
                              {submission.problem}
                              {submission.status === 'AC' && submission.points && (
                                <div className="text-[8px] mt-[-2px]">{submission.points}</div>
                              )}
                            </div>
                          ))}
                          {participant.submissions?.length > 4 && (
                            <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                              +{participant.submissions.length - 4}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-6 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Trophy className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-gray-500 text-xs">No participants yet</p>
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

export default ContestLeaderboard;