import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const Submissions = () => {
  // Mock submission data
  const [submissions] = useState([
    {
      id: 1,
      problem: 'Two Sum',
      contest: 'Weekly Contest 1',
      status: 'Accepted',
      language: 'JavaScript',
      time: '45 ms',
      memory: '42.5 MB',
      submittedAt: '2023-06-15 14:30:22'
    },
    {
      id: 2,
      problem: 'Palindrome Number',
      contest: 'Practice',
      status: 'Wrong Answer',
      language: 'Python',
      time: 'N/A',
      memory: 'N/A',
      submittedAt: '2023-06-14 09:15:47'
    },
    {
      id: 3,
      problem: 'Longest Substring',
      contest: 'Biweekly Contest 5',
      status: 'Accepted',
      language: 'Java',
      time: '120 ms',
      memory: '55.2 MB',
      submittedAt: '2023-06-10 20:45:11'
    },
    {
      id: 4,
      problem: 'Merge Intervals',
      contest: 'Practice',
      status: 'Time Limit Exceeded',
      language: 'C++',
      time: '>1000 ms',
      memory: '80.1 MB',
      submittedAt: '2023-06-08 16:22:33'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted':
        return 'text-green-600 font-semibold';
      case 'Wrong Answer':
        return 'text-blue-600';
      case 'Time Limit Exceeded':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4">era97's Submissions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Problem
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contest
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Memory
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{submission.problem}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{submission.contest}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.memory}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.submittedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {submissions.length === 0 && (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
                <p className="text-gray-500">You haven't submitted any solutions yet.</p>
              </div>
            )}
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

export default Submissions;