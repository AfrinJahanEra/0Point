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
      return;
    }

    const [externalRes] = await Promise.all([
      //api.get('/submissions/user/'),
      api.get('/account/external-submissions/')
    ]);

    //const internalSubs = internalRes.data.submissions || [];
    const externalSubs = externalRes.data.submissions || [];

    const merged = [...externalSubs].sort(
      (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
    );

    setSubmissions(merged);
  } catch (err) {
    console.error(err);
    setError('Failed to load submissions');
  } finally {
    setLoading(false);
  }
};

const normalizeVerdict = (verdict) => {
  switch (verdict) {
    case "OK":
    case "ACCEPTED":
      return "AC";
    case "WRONG_ANSWER":
      return "WA";
    case "TIME_LIMIT_EXCEEDED":
      return "TLE";
    case "MEMORY_LIMIT_EXCEEDED":
      return "MLE";
    case "COMPILATION_ERROR":
      return "CE";
    case "RUNTIME_ERROR":
      return "RE";
    default:
      return verdict || "UNKNOWN";
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
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Problem ID</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Problem</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verdict</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memory</th>
  </tr>
</thead>

                  <tbody className="bg-white divide-y divide-gray-200">
  {submissions.map((submission) => (
    <tr key={submission.id} className="hover:bg-gray-50">
      
      {/* Problem ID */}
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
        {submission.problem_code}
      </td>

      {/* Problem Name */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {submission.problem_title}
      </td>

      {/* Verdict */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`text-sm ${getVerdictColor(normalizeVerdict(submission.verdict))}`}>
          {normalizeVerdict(submission.verdict)}
        </span>
      </td>

      {/* Submitted At */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(submission.submitted_at).toLocaleString()}
      </td>

      {/* Tags */}
      <td className="px-6 py-4 text-sm text-gray-500">
        <div className="flex flex-wrap gap-1">
          {(submission.tag || []).map((t, idx) => (
            <span
              key={idx}
              className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
            >
              {t}
            </span>
          ))}
        </div>
      </td>

      {/* Language */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {submission.language}
      </td>

      {/* Time */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {submission.execution_time} ms
      </td>

      {/* Memory */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {submission.memory} MB
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