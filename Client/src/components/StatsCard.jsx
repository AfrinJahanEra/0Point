import React from 'react';

const StatsCard = () => {
  const stats = [
    { value: '1,250', label: 'Active Users' },
    { value: '48', label: 'Contests' },
    { value: '3,450', label: 'Problems' },
    { value: '12,580', label: 'Submissions' }
  ];

  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Platform Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900 mb-1">{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsCard;