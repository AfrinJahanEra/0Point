// ContestLeaderboard.jsx
import React, { useState, useEffect } from 'react';
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
  XCircle
} from 'lucide-react';

const ContestLeaderboard = () => {
  const [timeRemaining, setTimeRemaining] = useState(2 * 60 * 60 + 45 * 60 + 18);
  const [contestStatus, setContestStatus] = useState('live');

  // Mock leaderboard data
  const mockLeaderboard = [
    {
      rank: 1,
      username: 'pro_coder',
      name: 'Alex Johnson',
      score: 1850,
      problemsSolved: 6,
      penalty: 245,
      rating: 2200,
      ratingChange: +150,
      country: 'US',
      institution: 'MIT',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 5, status: 'AC' },
        { problem: 'B', time: 12, status: 'AC' },
        { problem: 'C', time: 45, status: 'AC' },
        { problem: 'D', time: 78, status: 'AC' },
        { problem: 'E', time: 120, status: 'AC' },
        { problem: 'F', time: 165, status: 'AC' }
      ]
    },
    {
      rank: 2,
      username: 'algo_master',
      name: 'Sarah Chen',
      score: 1700,
      problemsSolved: 5,
      penalty: 312,
      rating: 2050,
      ratingChange: +120,
      country: 'CA',
      institution: 'University of Toronto',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 7, status: 'AC' },
        { problem: 'B', time: 25, status: 'AC' },
        { problem: 'C', time: 50, status: 'AC' },
        { problem: 'D', time: 95, status: 'AC' },
        { problem: 'E', time: 140, status: 'WA' },
        { problem: 'F', time: 180, status: 'AC' }
      ]
    },
    {
      rank: 3,
      username: 'binary_wizard',
      name: 'Mohammed Ali',
      score: 1650,
      problemsSolved: 5,
      penalty: 356,
      rating: 1980,
      ratingChange: +95,
      country: 'EG',
      institution: 'Cairo University',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 8, status: 'AC' },
        { problem: 'B', time: 20, status: 'AC' },
        { problem: 'C', time: 65, status: 'AC' },
        { problem: 'D', time: 110, status: 'AC' },
        { problem: 'E', time: 155, status: 'AC' },
        { problem: 'F', time: 200, status: '-' }
      ]
    },
    {
      rank: 4,
      username: 'code_ninja',
      name: 'Kenji Tanaka',
      score: 1550,
      problemsSolved: 5,
      penalty: 412,
      rating: 1920,
      ratingChange: +80,
      country: 'JP',
      institution: 'University of Tokyo',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 10, status: 'AC' },
        { problem: 'B', time: 30, status: 'AC' },
        { problem: 'C', time: 75, status: 'AC' },
        { problem: 'D', time: 125, status: 'AC' },
        { problem: 'E', time: 170, status: 'WA' },
        { problem: 'F', time: 210, status: '-' }
      ]
    },
    {
      rank: 5,
      username: 'data_struct',
      name: 'Priya Sharma',
      score: 1420,
      problemsSolved: 4,
      penalty: 280,
      rating: 1850,
      ratingChange: +65,
      country: 'IN',
      institution: 'IIT Delhi',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 12, status: 'AC' },
        { problem: 'B', time: 35, status: 'AC' },
        { problem: 'C', time: 85, status: 'AC' },
        { problem: 'D', time: 140, status: 'AC' },
        { problem: 'E', time: 190, status: '-' },
        { problem: 'F', time: 220, status: '-' }
      ]
    },
    // Current user at rank 150
    {
      rank: 150,
      username: 'user123',
      name: 'Your Name',
      score: 450,
      problemsSolved: 2,
      penalty: 156,
      rating: 1450,
      ratingChange: +25,
      country: 'BD',
      institution: 'IUT',
      isCurrentUser: true,
      submissions: [
        { problem: 'A', time: 15, status: 'AC' },
        { problem: 'B', time: 40, status: 'AC' },
        { problem: 'C', time: 90, status: 'WA' },
        { problem: 'D', time: 150, status: '-' },
        { problem: 'E', time: 200, status: '-' },
        { problem: 'F', time: 240, status: '-' }
      ]
    },
    {
      rank: 249,
      username: 'java_dev',
      name: 'Roberto Silva',
      score: 320,
      problemsSolved: 2,
      penalty: 210,
      rating: 1380,
      ratingChange: -15,
      country: 'BR',
      institution: 'University of São Paulo',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 18, status: 'AC' },
        { problem: 'B', time: 60, status: 'AC' },
        { problem: 'C', time: 110, status: '-' },
        { problem: 'D', time: 180, status: '-' },
        { problem: 'E', time: 220, status: '-' },
        { problem: 'F', time: 260, status: '-' }
      ]
    },
    {
      rank: 350,
      username: 'python_newbie',
      name: 'Emma Wilson',
      score: 210,
      problemsSolved: 1,
      penalty: 145,
      rating: 1250,
      ratingChange: -25,
      country: 'GB',
      institution: 'Cambridge',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 25, status: 'AC' },
        { problem: 'B', time: 70, status: 'WA' },
        { problem: 'C', time: 130, status: '-' },
        { problem: 'D', time: 190, status: '-' },
        { problem: 'E', time: 230, status: '-' },
        { problem: 'F', time: 270, status: '-' }
      ]
    },
    {
      rank: 478,
      username: 'cpp_fan',
      name: 'Dmitri Ivanov',
      score: 100,
      problemsSolved: 1,
      penalty: 195,
      rating: 1180,
      ratingChange: -40,
      country: 'RU',
      institution: 'Moscow State',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 35, status: 'AC' },
        { problem: 'B', time: 85, status: '-' },
        { problem: 'C', time: 150, status: '-' },
        { problem: 'D', time: 210, status: '-' },
        { problem: 'E', time: 250, status: '-' },
        { problem: 'F', time: 280, status: '-' }
      ]
    },
    {
      rank: 531,
      username: 'beginner_coder',
      name: 'Ahmed Hassan',
      score: 0,
      problemsSolved: 0,
      penalty: 0,
      rating: 1050,
      ratingChange: -50,
      country: 'PK',
      institution: 'FAST',
      isCurrentUser: false,
      submissions: [
        { problem: 'A', time: 50, status: '-' },
        { problem: 'B', time: 100, status: '-' },
        { problem: 'C', time: 170, status: '-' },
        { problem: 'D', time: 230, status: '-' },
        { problem: 'E', time: 270, status: '-' },
        { problem: 'F', time: 300, status: '-' }
      ]
    }
  ];

  const [leaderboardData, setLeaderboardData] = useState(mockLeaderboard);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">IUT Winter Coding Challenge</h1>
            </div>
            
            {/* Timer at Top Right */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="text-right">
                <div className="text-sx text-gray-600">Time Remaining</div>
                <div className="font-mono font-bold text-lg text-gray-900">{formatTime(timeRemaining)}</div>
              </div>
            </div>
          </div>
        </div>

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