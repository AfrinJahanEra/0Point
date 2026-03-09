// Client/src/pages/Practice.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react'; // optional icon for refresh button
import api from '../utils/api'; // your axios/axios-like instance
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

const Practice = () => {
  const [recData, setRecData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recommendations on mount (should be very fast if cached)
  useEffect(() => {
    fetchRecommendations(false); // false = don't force refresh
  }, []);

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = forceRefresh
        ? '/account/refresh-recommendations/'
        : '/account/recommend-problems/';

      const method = forceRefresh ? 'post' : 'get';
      const res = await api[method](endpoint);

      if (res.data.success === false) {
        throw new Error(res.data.error || 'Failed to load recommendations');
      }

      setRecData(res.data);
      
      // Dismiss loading toast and show success on refresh
      if (forceRefresh) {
        toast.dismiss();
        toast.success('AI practice plan updated');
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setError(err.response?.data?.error || 'Could not load AI recommendations');
      toast.dismiss();
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    toast.loading('Generating fresh AI practice plan...');
    fetchRecommendations(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Recommendations */}
          <div className="lg:col-span-9 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">AI-Powered Practice</h1>
              
              {/* Refresh Button */}
              {recData && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 transition disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Generating...' : 'Refresh AI Plan'}
                </button>
              )}
            </div>

            {/* Loading / Error / Content */}
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100">
                      <div className="h-2.5 bg-gray-200 rounded flex-1" />
                      <div className="h-5 bg-gray-200 rounded w-14" />
                      <div className="h-5 bg-gray-200 rounded w-16" />
                      <div className="h-5 bg-gray-200 rounded w-12" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={() => fetchRecommendations(false)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Practice Plan */}
                {recData?.practice_plan && (
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h2 className="text-lg font-semibold text-blue-800 mb-3">Your 7-Day AI Practice Plan</h2>
                    <p className="text-gray-700 whitespace-pre-line">{recData.practice_plan}</p>
                  </div>
                )}

                {/* Recommendations Grid */}
                {recData?.recommendations?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {recData.recommendations.map((prob, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                              {prob.title}
                            </h3>
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {prob.difficulty}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">{prob.platform}</span>
                            {prob.tags && (
                              <span className="ml-2 text-gray-500">
                                • {Array.isArray(prob.tags) ? prob.tags.join(', ') : prob.tags}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                            {prob.why}
                          </p>

                          <a
                            href={prob.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 bg-blue-800 text-white text-sm font-medium rounded hover:bg-blue-900 transition"
                          >
                            Solve Now →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                    <p className="text-yellow-800 font-medium">
                      No recommendations yet.
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Connect more platforms or wait for your first submissions to get personalized suggestions.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="sticky top-6">
              <Sidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;