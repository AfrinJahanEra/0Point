import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Users, 
  Play, 
  Eye, 
  ChevronRight,
  Code2,
  Plus
} from 'lucide-react';
import api from '../utils/api';

const Sidebar = () => {
  const navigate = useNavigate();
  
  // Data states
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [soonestContest, setSoonestContest] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [registeredContests, setRegisteredContests] = useState(new Set());
  
  // Loading states
  const [contestsLoading, setContestsLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Fetch sidebar data on mount
  useEffect(() => {
    fetchSidebarData();
    fetchRecommendations();
  }, []);

  // Fetch contests data
  const SIDEBAR_CACHE_KEY    = 'sidebar_dashboard_cache';
  const SIDEBAR_CACHE_TS_KEY = 'sidebar_dashboard_cache_ts';
  const SIDEBAR_MAX_AGE      = 2 * 60 * 1000; // 2 minutes

  const applySidebarData = (data) => {
    const contests = (data.upcoming_contests || []).slice(0, 3).map(c => ({
      id: c.id,
      title: c.title,
      platform: c.platform === '0point' ? '0Point' : c.platform?.toUpperCase(),
      duration: c.duration,
      participants: c.participants || 0,
      is_registered: c.is_registered,
      is_external: c.is_external,
      external_url: c.external_url,
      start_time: c.start_time
    }));
    setUpcomingContests(contests);
    setRegisteredContests(new Set(data.registered_contest_ids || []));
    if (data.soonest_contest) {
      setSoonestContest(data.soonest_contest);
      setTimeLeft({
        days:    data.soonest_contest.time_until?.days    || 0,
        hours:   data.soonest_contest.time_until?.hours   || 0,
        minutes: data.soonest_contest.time_until?.minutes || 0,
        seconds: data.soonest_contest.time_until?.seconds || 0,
      });
    }
  };

  const fetchSidebarData = async () => {
    // 1. Show stale data instantly
    try {
      const cached   = localStorage.getItem(SIDEBAR_CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(SIDEBAR_CACHE_TS_KEY) || '0', 10);
      const isFresh  = (Date.now() - cachedAt) < SIDEBAR_MAX_AGE;
      if (cached) {
        applySidebarData(JSON.parse(cached));
        setContestsLoading(false);
        if (isFresh) return;
      }
    } catch (_) {}

    // 2. Background refresh (reuses same home/dashboard endpoint)
    try {
      const response = await api.get('/home/dashboard/');
      const data = response.data;
      applySidebarData(data);
      try {
        localStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(SIDEBAR_CACHE_TS_KEY, String(Date.now()));
      } catch (_) {}
    } catch (error) {
      console.error('Sidebar data fetch error:', error);
    } finally {
      setContestsLoading(false);
    }
  };

  // Fetch AI recommendations
  const fetchRecommendations = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setRecommendationsLoading(false);
      return;
    }
    
    try {
      setRecommendationsLoading(true);
      const response = await api.get('/account/recommend-problems/');
      if (response.data.success && response.data.recommendations) {
        setRecommendations(response.data.recommendations.slice(0, 5));
      }
    } catch (error) {
      console.error('Recommendations fetch error:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Update countdown timer every second
  useEffect(() => {
    if (!soonestContest) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.days === 0 && prev.hours === 0 && prev.minutes === 0 && prev.seconds === 0) {
          clearInterval(timer);
          return prev;
        }
        
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soonestContest]);

  const handleRegister = async (contestId) => {
    try {
      await api.post(`/contests/${contestId}/register/`);
      setRegisteredContests(prev => new Set([...prev, contestId]));
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upcoming Contests */}
      <div className="bg-white rounded-lg">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-gray-700" />
              <h2 className="text-xs font-semibold text-gray-900">Upcoming Contests</h2>
            </div>
            <Link 
              to="/contests" 
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
            >
              View All
              <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          {/* Contests List */}
          <div className="space-y-2">
            {contestsLoading ? (
              <div className="space-y-2 py-1">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse p-2 rounded-lg bg-gray-50">
                    <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-1.5" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : upcomingContests.length > 0 ? (
              upcomingContests.map((contest) => (
                <div 
                  key={contest.id}
                  className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-xs line-clamp-1">
                          {contest.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {contest.duration}
                          </span>
                          {contest.participants > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {contest.participants}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex flex-col items-end gap-1">
                      {contest.is_external ? (
                        <a
                          href={contest.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded font-medium text-xs bg-gray-600 text-white hover:bg-gray-700 transition-all duration-200 flex items-center gap-1"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          View
                        </a>
                      ) : (
                        <button 
                          className={`px-2 py-1 rounded font-medium text-xs transition-all duration-200 flex items-center gap-1 ${
                            registeredContests.has(contest.id) || contest.is_registered
                              ? 'bg-blue-800 text-white cursor-default'
                              : 'bg-blue-800 text-white hover:bg-blue-900'
                          }`}
                          onClick={() => !registeredContests.has(contest.id) && !contest.is_registered && handleRegister(contest.id)}
                        >
                          {registeredContests.has(contest.id) || contest.is_registered ? (
                            <>
                              <Play className="w-2.5 h-2.5" />
                              Joined
                            </>
                          ) : (
                            <>
                              <Eye className="w-2.5 h-2.5" />
                              Register
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-gray-500">
                No upcoming contests
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contest Countdown */}
      {soonestContest && (
        <div className="bg-white rounded-lg">
          <div className="p-3 border-b border-gray-200">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1.5 line-clamp-1">{soonestContest.title}</div>
              <div className="flex justify-center gap-1 mb-2">
                <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                  <div className="text-xs font-bold text-gray-900">{timeLeft.days.toString().padStart(2, '0')}</div>
                  <div className="text-xs text-gray-500">Days</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                  <div className="text-xs font-bold text-gray-900">{timeLeft.hours.toString().padStart(2, '0')}</div>
                  <div className="text-xs text-gray-500">Hours</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                  <div className="text-xs font-bold text-gray-900">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                  <div className="text-xs text-gray-500">Minutes</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-1.5 text-center min-w-[40px]">
                  <div className="text-xs font-bold text-gray-900">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                  <div className="text-xs text-gray-500">Seconds</div>
                </div>
              </div>
              {!soonestContest.is_registered && soonestContest.platform === '0point' && (
                <button 
                  onClick={() => navigate(`/contest/${soonestContest.contest_id}/register`)}
                  className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200"
                >
                  Register Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Host Your Contest CTA */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-lg p-4 text-white">
        <h3 className="font-semibold text-sm mb-2">Host Your Contest</h3>
        <p className="text-xs opacity-90 mb-3">
          Create and manage your own coding contests for the community.
        </p>
        <button 
          onClick={() => navigate('/create-contest')}
          className="w-full bg-white text-blue-800 py-2 rounded text-xs font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Contest
        </button>
      </div>

      {/* Recommended Problem Sets */}
      <div className="bg-white rounded-lg">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2 p-3 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-gray-700" />
              <h2 className="text-xs font-semibold text-gray-900">Recommended Problems</h2>
            </div>
            <Link 
              to="/practice" 
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
            >
              View All
              <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recommendationsLoading ? (
              <div className="space-y-2 py-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-2 py-1.5 border-b border-gray-100">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded" />
                    <div className="h-5 bg-gray-200 rounded w-12" />
                    <div className="h-5 bg-gray-200 rounded w-10" />
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-semibold text-gray-900 pb-2">Problem</th>
                    <th className="text-center font-semibold text-gray-900 pb-2">Difficulty</th>
                    <th className="text-center font-semibold text-gray-900 pb-2">Topic</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((problem, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2">
                        <a 
                          href={problem.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-900 font-bold hover:text-blue-800 hover:underline"
                        >
                          {problem.title}
                        </a>
                        <span className="ml-1 text-[10px] text-gray-400">{problem.platform}</span>
                      </td>
                      <td className="py-2 text-center text-gray-700">
                        {problem.difficulty}
                      </td>
                      <td className="py-2 text-center text-gray-600">
                        {Array.isArray(problem.tags) ? problem.tags[0] : problem.tags || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-4 text-center text-xs text-gray-500">
                <p>Sign in for AI recommendations</p>
                <Link to="/practice" className="text-blue-600 hover:underline mt-1 inline-block">
                  Browse problems
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;