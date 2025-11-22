import React, { useState } from 'react';

const ContestCard = ({ contest }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

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

  const handleRegister = () => {
    setIsRegistered(true);
    setShowPopup(true);
    // In a real app, you would make an API call here to register the user
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const getActionButton = () => {
    if (contest.status === 'upcoming') {
      if (isRegistered) {
        return (
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold cursor-not-allowed"
            disabled
          >
            Registered
          </button>
        );
      } else {
        return (
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors duration-300"
            onClick={handleRegister}
          >
            Register
          </button>
        );
      }
    } else if (contest.status === 'live') {
      return (
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors duration-300">
          Participate
        </button>
      );
    } else {
      // Assuming 'finished' or any other status
      return (
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors duration-300">
          Practice
        </button>
      );
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
        {getActionButton()}
      </div>

      {/* Registration Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Registration Successful!</h3>
              <p className="mt-2 text-sm text-gray-500">
                You've been successfully registered for {contest.title}. We'll notify you when the contest starts.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 sm:text-sm"
                  onClick={closePopup}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestCard;