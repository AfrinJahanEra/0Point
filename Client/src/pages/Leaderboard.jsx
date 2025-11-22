import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Leaderboard = () => {
  // Mock leaderboard data
  const leaderboardData = [
    { id: 1, name: 'John Doe', score: 1250, contests: 15 },
    { id: 2, name: 'Jane Smith', score: 1180, contests: 12 },
    { id: 3, name: 'Mike Johnson', score: 1120, contests: 10 },
    { id: 4, name: 'Sarah Williams', score: 1080, contests: 14 },
    { id: 5, name: 'David Brown', score: 1050, contests: 9 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h1>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaderboardData.map((user, index) => (
                      <tr key={user.id} className={index < 3 ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link to={`/user/${user.id}`} className="text-blue-600 hover:text-blue-900">
                            {user.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.score}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;