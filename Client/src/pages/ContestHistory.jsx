// ContestHistory.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'internal', label: 'Internal' },
  { value: 'codeforces', label: 'Codeforces' },
  { value: 'atcoder', label: 'AtCoder' },
  { value: 'codechef', label: 'CodeChef' },
  { value: 'leetcode', label: 'LeetCode' },
];

const ContestHistory = () => {
  const { user } = useApp();
  const [contests, setContests] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContests, setTotalContests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');

  const fetchContests = async (pageNum = 1, filter = platformFilter) => {
    if (!user) {
      setContests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum,
        page_size: pageSize,
        platform: filter,
      });

      const res = await api.get(`/account/contest-history/?${params.toString()}`);

      setContests(res.data.contests || []);
      setPage(res.data.page || pageNum);
      setTotalPages(res.data.total_pages || 1);
      setTotalContests(res.data.total_contests || 0);
    } catch (err) {
      console.error(err);
      setError('Failed to load contest history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests(1, platformFilter);
  }, [user, platformFilter]);

  const handleFilterChange = (e) => {
    setPlatformFilter(e.target.value);
    setPage(1); // reset to first page when filter changes
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Please log in to view your contest history.</p>
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
            {/* Top bar: total count + filter */}
            <div className="flex flex-col sm:flex-row xs:items-center justify-between gap-4 mb-6">
              <div className="text-xs text-gray-600">
                Total: <span className="font-xs text-gray-900">{totalContests}</span> contest
                {totalContests !== 1 ? 's' : ''}
              </div>

              {/* Filter moved to right side */}
              <select
                value={platformFilter}
                onChange={handleFilterChange}
                className="block text-xs border border-gray-300 rounded-md px-3 py-1.5 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white shadow-sm min-w-[180px]"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
                </div>
                <p className="text-gray-500 mt-4">Loading contest history...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && !error && contests.length === 0 && (
              <div className="text-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No contests yet</h3>
                <p className="text-gray-500">
                  {platformFilter !== 'all'
                    ? `No contests found for ${platformFilter}.`
                    : "You haven't participated in any contests yet."}
                </p>
              </div>
            )}

            {!loading && !error && contests.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Contest Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date & Time</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Rank</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Rating / Score</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Platform</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {contests.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {c.title}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {c.datetime
                            ? new Date(c.datetime).toLocaleString()
                            : c.date
                            ? new Date(c.date).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-blue-600">
                          {c.rank ? `#${c.rank}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {c.rating || c.score || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {c.platform}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default ContestHistory;