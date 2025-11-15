import React from 'react';
import { LEADERBOARD_DATA } from '../utils/constants';

const Leaderboard = () => {
  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400 text-gray-900';
      case 2:
        return 'bg-gray-300 text-gray-900';
      case 3:
        return 'bg-orange-400 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-4 text-center">
        <h4 className="text-lg font-semibold">IUT Leaderboard</h4>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-200">
        {LEADERBOARD_DATA.map((user) => (
          <li 
            key={user.id} 
            className="p-4 hover:bg-gray-50 transition-colors duration-200 flex items-center"
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-4 ${getRankClass(user.rank)}`}>
              {user.rank}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                {user.avatar}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{user.name}</div>
                <div className="text-xs text-gray-500">{user.details}</div>
              </div>
            </div>

            {/* Score */}
            <div className="font-bold text-blue-900">{user.score}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;