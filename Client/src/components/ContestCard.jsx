import React from 'react';

const ContestCard = ({ contest }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-600';
      case 'upcoming':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:-translate-y-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-4">
        <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
          <i className={`fas fa-${contest.platformIcon}`}></i>
          {contest.platform}
        </div>
        <h3 className="text-xl font-semibold mb-2">{contest.title}</h3>
        <div className="flex items-center gap-2 text-sm">
          <i className="far fa-calendar"></i>
          {contest.date}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-gray-600 mb-4">{contest.description}</p>
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <i className="far fa-clock"></i>
            {contest.duration}
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-users"></i>
            {contest.type}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(contest.status)}`}>
          {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
        </span>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-300">
          {contest.status === 'upcoming' ? 'Register' : 'View'}
        </button>
      </div>
    </div>
  );
};

export default ContestCard;