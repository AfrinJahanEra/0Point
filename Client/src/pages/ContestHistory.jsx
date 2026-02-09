// Client/src/pages/ContestHistory.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ContestHistory = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContests, setTotalContests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContestPage(page);
  }, [page]);

  const fetchContestPage = async (pageNum = 1) => {
    try {
      setLoading(true);
      const resp = await api.get(`/account/contest-history/?page=${pageNum}&page_size=${pageSize}`);
      setContests(resp.data.contests || []);
      setPage(resp.data.page || pageNum);
      setTotalPages(resp.data.total_pages || 1);
      setTotalContests(resp.data.total_contests || 0);
    } catch (err) {
      console.error('Error fetching contests:', err);
      setError('Failed to load contest history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Contest History</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contest history...</p>
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No contest history yet.</p>
            <p className="mt-2">Participate in contests to see them here!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contest Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating / Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contests.map((contest, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{contest.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contest.datetime
                          ? new Date(contest.datetime).toLocaleString()
                          : (contest.date ? new Date(contest.date).toLocaleDateString() : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        #{contest.rank || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {contest.rating || contest.score || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {contest.platform}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing page {page} of {totalPages} — {totalContests} total contests
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                  onClick={() => page < totalPages && setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestHistory;