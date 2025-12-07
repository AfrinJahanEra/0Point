// ContestLeaderboard.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  Loader
} from 'lucide-react';

const ContestLeaderboard = () => {
  const { contestId } = useParams();
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [contestStatus, setContestStatus] = useState('live');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch leaderboard data from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/contests/${contestId}/leaderboard/`);
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        setLeaderboardData(data.leaderboard || []);
        
        // Set initial time remaining if provided by backend
        if (data.time_remaining) {
          setTimeRemaining(data.time_remaining);
        }
        
        // Set contest status if provided
        if (data.status) {
          setContestStatus(data.status);
        }
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchLeaderboard();
    }
  }, [contestId]);

  useEffect(() => {
    if (contestStatus === 'live') {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [contestStatus]);

  const formatTime = (seconds) => {
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

  const getStatusIcon = (status) => {
    if (status === 'AC') return <CheckCircle className="w-3 h-3 text-green-600" />;
    if (status === 'WA') return <XCircle className="w-3 h-3 text-red-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error Loading Leaderboard</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 w-16">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 w-64">Participant</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 w-20">Score</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 w-24">Solved</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 w-24">Penalty</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900 w-24">Rating</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Problem Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboardData.map((participant) => (
                  <tr 
                    key={participant.rank} 
                    className={`border-b border-gray-100 transition-colors ${
                      participant.isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded ${getRankBadge(participant.rank)}`}>
                        {getRankIcon(participant.rank)}
                        <span className="font-bold">{participant.rank}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {participant.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {participant.username}
                            {participant.isCurrentUser && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">You</span>
                            )}
                          </div>
                          <div className="text-gray-600 text-xs mt-0.5">{participant.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-500 text-xs">{participant.country}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-500 text-xs truncate max-w-[120px]">{participant.institution}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-gray-900">{participant.score}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-green-600">{participant.problemsSolved}</span>
                        <span className="text-gray-500">/6</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-gray-700">{participant.penalty}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-gray-900">{participant.rating}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${participant.ratingChange > 0 ? 'bg-green-100 text-green-800' : participant.ratingChange < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {getRatingChangeIcon(participant.ratingChange)}
                          {participant.ratingChange > 0 ? '+' : ''}{participant.ratingChange}
                        </span>
                      </div>
                    </td>
<td className="py-3 px-4">
  <div className="flex gap-1 justify-center">
    {participant.submissions.map((submission, idx) => (
      <div 
        key={idx} 
        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${submission.status === 'AC' ? 'text-green-700' : submission.status === 'WA' ? 'text-red-700' : 'text-gray-400'}`}
        title={`Problem ${submission.problem}: ${submission.status === 'AC' ? 'Accepted' : submission.status === 'WA' ? 'Wrong Answer' : 'Not Attempted'}`}
      >
        {submission.problem}
      </div>
    ))}
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Showing <span className="font-semibold">1-10</span> of <span className="font-semibold">{leaderboardData.length}</span> participants
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs disabled:opacity-50">
                  ← Previous
                </button>
                <button className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs">
                  1
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs">
                  2
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs">
                  3
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs">
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestLeaderboard;