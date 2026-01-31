import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const Submissions = () => {
  const { user } = useApp();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserSubmissions();
  }, [user]);

  const fetchUserSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch submissions from backend - the backend will filter by authenticated user
      const response = await api.get('/submissions/user/');
      setSubmissions(response.data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'AC':
        return 'text-green-600 font-semibold';
      case 'WA':
        return 'text-red-600';
      case 'TLE':
        return 'text-orange-600';
      case 'RE':
        return 'text-purple-600';
      case 'CE':
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Please log in to view your submissions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{user?.name}'s Submissions</h2>
            
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
                </div>
                <p className="text-gray-500 mt-4">Loading submissions...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            
            {!loading && !error && (
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
                          <div className="text-sm font-medium text-gray-900">
                            {submission.problem_code}. {submission.problem_title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {submission.contest_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${getVerdictColor(submission.verdict)}`}>
                            {submission.verdict}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.language}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.execution_time} ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.memory} MB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && submissions.length === 0 && (
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