import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { BookOpen, FileText, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useApp();
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user's drafts
      const draftsResponse = await api.get('/blog/drafts/');
      setDrafts(draftsResponse.data || []);

      // Fetch user's submissions
      const submissionsResponse = await api.get('/submissions/user/?limit=5');
      setSubmissions(submissionsResponse.data.submissions || []);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Please log in to view your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user?.name}! 👋</h1>
              <p className="text-gray-600">Here's your personal dashboard with your recent activity.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {/* Draft Blogs Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Your Draft Blogs</h2>
                    </div>
                    <Link
                      to="/create-blog"
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Create New
                    </Link>
                  </div>

                  {drafts.length > 0 ? (
                    <div className="space-y-3">
                      {drafts.map((draft) => (
                        <div key={draft.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <Link
                            to={`/create-blog`}
                            className="flex items-start justify-between group cursor-pointer"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {draft.title || 'Untitled Draft'}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {draft.content ? draft.content.substring(0, 100) : 'No content yet'}...
                              </p>
                            </div>
                            <div className="ml-4 text-right flex-shrink-0">
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                Draft
                              </span>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">You haven't started any drafts yet</p>
                      <Link
                        to="/create-blog"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Start Writing →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Recent Submissions Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Recent Submissions</h2>
                    </div>
                    <Link
                      to="/submissions"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View All →
                    </Link>
                  </div>

                  {submissions.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Problem</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Contest</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Language</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-900">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((submission) => (
                            <tr key={submission.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {submission.problem_title}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {submission.problem_code}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    submission.verdict === 'AC'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {submission.verdict}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                {submission.language}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">No submissions yet</p>
                      <p className="text-sm text-gray-500">Start practicing to see your submissions here</p>
                    </div>
                  )}
                </div>
              </>
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

export default Dashboard;