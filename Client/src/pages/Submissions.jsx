import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'codeforces', label: 'Codeforces' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'codechef', label: 'CodeChef' },
  { value: 'atcoder', label: 'AtCoder' },
];

const Submissions = () => {
  const { user } = useApp();
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  const getUniqueTags = () => {
    const tags = new Set();
    allSubmissions.forEach(s => {
      const subTags = s.tags || s.problem?.tags || [];
      subTags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  };

  const TAG_OPTIONS = [
    { value: 'all', label: 'All Tags' },
    ...getUniqueTags().map(tag => ({ value: tag, label: tag }))
  ];

  useEffect(() => {
    fetchUserSubmissions();
  }, [user]);

  useEffect(() => {
    let filtered = [...allSubmissions];

    if (platformFilter !== 'all') {
      filtered = filtered.filter(sub => 
        (sub.platform || '').toLowerCase() === platformFilter.toLowerCase()
      );
    }

    if (tagFilter !== 'all') {
      filtered = filtered.filter(sub => {
        const subTags = (sub.tags || sub.problem?.tags || []);
        return subTags.some(t => t.toLowerCase() === tagFilter.toLowerCase());
      });
    }

    const sorted = filtered.sort(
      (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
    );

    setFilteredSubmissions(sorted);
    setTotalSubmissions(sorted.length);
  }, [allSubmissions, platformFilter, tagFilter]);

  const fetchUserSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setAllSubmissions([]);
        setFilteredSubmissions([]);
        setTotalSubmissions(0);
        return;
      }

      const res = await api.get('/account/external-submissions/?platform=all');
      const externalSubs = res.data.submissions || [];

      setAllSubmissions(externalSubs);
    } catch (err) {
      console.error(err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const normalizeVerdict = (verdict) => {
    if (!verdict) return "UNKNOWN";
    const v = verdict.toUpperCase().replace(/\s+/g, "_");
    switch (v) {
      case "OK":
      case "ACCEPTED":      return "AC";
      case "WRONG_ANSWER":  return "WA";
      case "TIME_LIMIT_EXCEEDED": return "TLE";
      case "MEMORY_LIMIT_EXCEEDED":   return "MLE";
      case "COMPILATION_ERROR":       return "CE";
      case "RUNTIME_ERROR":           return "RE";
      default:                        return v;
    }
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'AC': return 'text-green-600 font-semibold';
      case 'WA': return 'text-red-600';
      case 'TLE': return 'text-orange-600';
      case 'MLE': return 'text-yellow-600';
      case 'RE':  return 'text-purple-600';
      case 'CE':  return 'text-blue-600';
      default:    return 'text-gray-600';
    }
  };

  const displayValue = (value) => {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return "-";
    }
    return value;
  };

  // Tags as comma-separated string, full display (no truncation)
  const displayTags = (tags) => {
    const tagArray = tags || [];
    if (tagArray.length === 0) return "-";
    return tagArray.join(', ');
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
          <div className="lg:col-span-9">
            {/* Filters & total */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="text-xs text-gray-600">
                Total: <span className="font-medium text-gray-900">{totalSubmissions}</span> submission
                {totalSubmissions !== 1 ? 's' : ''}
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="block text-xs border border-gray-300 rounded-md px-3 py-1.5 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           bg-white shadow-sm min-w-[140px]"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="block text-xs border border-gray-300 rounded-md px-3 py-1.5 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           bg-white shadow-sm min-w-[180px]"
                  disabled={loading || allSubmissions.length === 0}
                >
                  {TAG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
                <p className="text-gray-500 mt-4">Loading submissions...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && !error && filteredSubmissions.length === 0 && (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions found</h3>
                <p className="text-gray-500">
                  {platformFilter !== 'all' || tagFilter !== 'all'
                    ? `No submissions match the selected filters.`
                    : "You haven't submitted any solutions yet."}
                </p>
              </div>
            )}

            {!loading && !error && filteredSubmissions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-center">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Submission ID</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Problem</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Verdict</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Submitted</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Tags</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Lang</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Time</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Mem</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-600">Platform</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredSubmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-mono">
                          {s.platform === "codeforces" ? (
                            <a
                              href={`https://codeforces.com/contest/${s.contest_id}/submission/${s.submission_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {displayValue(s.submission_id)}
                            </a>
                          ) : (
                            <a
                              href={displayValue(s.submission_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {displayValue(s.submission_id)}
                            </a>
                          )}
                        </td>

                        <td className="px-3 py-2 text-xs">
                          <a
                            href={
                              s.platform === "codeforces"
                                ? `https://codeforces.com/contest/${s.contest_id}/problem/${s.problem_code}`
                                : displayValue(s.problem?.url)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {s.platform === "codeforces"
                              ? `${displayValue(s.problem_code)} - ${displayValue(s.problem_title)}`
                              : displayValue(s.problem?.name)}
                          </a>
                        </td>

                        <td className="px-3 py-2 text-xs">
                          <span className={getVerdictColor(normalizeVerdict(s.verdict))}>
                            {normalizeVerdict(s.verdict) || "-"}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "-"}
                        </td>

                        {/* Tags - full comma-separated, no truncation */}
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {displayTags(s.tags || s.problem?.tags)}
                        </td>

                        <td className="px-3 py-2 text-xs text-gray-600">
                          {displayValue(s.language)}
                        </td>

                        <td className="px-3 py-2 text-xs text-gray-600">
                          {displayValue(s.execution_time)}
                          {s.execution_time && !String(s.execution_time).toLowerCase().includes('ms') ? ' ms' : ''}
                        </td>

                        <td className="px-3 py-2 text-xs text-gray-600">
                          {displayValue(s.memory)}
                          {s.memory && !String(s.memory).toLowerCase().includes('mb') ? ' MB' : ''}
                        </td>

                        <td className="px-3 py-2 text-xs">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {displayValue(s.platform)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Submissions;