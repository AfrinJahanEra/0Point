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
import axios from 'axios';

const Sidebar = () => {
  const navigate = useNavigate();
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Countdown timer state - initialize with null values
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [nearestContest, setNearestContest] = useState(null);

  const TOKEN = localStorage.getItem('token');

  // Fetch upcoming contests
  const fetchUpcomingContests = async () => {
    try {
      setLoading(true);

      // Fetch all contests
      const contestsRes = await axios.get('http://localhost:8000/contests/', {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      // Fetch external contests
      const externalRes = await axios.get('http://localhost:8000/external/contests/?platform=all', {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      // Filter and combine contests
      const allContests = [
        ...(contestsRes.data.contests || []).map(c => ({
          ...c,
          is_external: false,
          platform: c.platform || 'IUT',
          id: c.id || `manual-${c._id || Math.random()}`
        })),
        ...(externalRes.data || []).map(c => ({
          ...c,
          is_external: true,
          platform: c.platform,
          status: c.status === 'finished' ? 'past' : c.status,
          id: `external_${c.platform}_${c.external_id}`,
          participants: c.participants || 0,
          duration_formatted: c.duration_formatted
        }))
      ];

      // Filter for upcoming contests and sort by start time (nearest first)
      const upcoming = allContests
        .filter(c => c.status === 'upcoming' && c.start_time)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        .slice(0, 3); // Get only 3 latest

      setUpcomingContests(upcoming);

      // Set nearest contest for countdown
      if (upcoming.length > 0) {
        setNearestContest(upcoming[0]);
      }

    } catch (err) {
      console.error('Error fetching upcoming contests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format contest date for display
  const formatContestDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' • ' +
        date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
    } catch {
      return 'Invalid date';
    }
  };

  // Format duration
  const formatDuration = (contest) => {
    if (contest.duration_formatted) return contest.duration_formatted;
    if (contest.duration_seconds) {
      const totalMin = Math.floor(contest.duration_seconds / 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    if (contest.duration) {
      const h = Math.floor(contest.duration);
      const m = Math.round((contest.duration - h) * 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}m`;
    }
    return 'Not set';
  };

  // Update countdown timer based on nearest contest
  useEffect(() => {
    if (!nearestContest || !nearestContest.start_time) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const contestStart = new Date(nearestContest.start_time).getTime();
      const timeDiff = contestStart - now;

      if (timeDiff <= 0) {
        // Contest has started, fetch new upcoming contests
        fetchUpcomingContests();
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [nearestContest]);

  // Get platform name
  const getPlatformName = (platform) => {
    const map = {
      'IUT': 'IUT Platform',
      'cf': 'Codeforces',
      'lc': 'LeetCode',
      'cc': 'CodeChef',
      'codechef': 'CodeChef',
      'ac': 'AtCoder',
      'atcoder': 'AtCoder',
      'leetcode': 'LeetCode',
    };
    return map[platform] || platform || 'Unknown';
  };

  // Handle contest click
  const handleContestClick = (contest) => {
    if (contest.is_external && contest.url) {
      window.open(contest.url, '_blank');
    } else if (contest.status === 'upcoming') {
      navigate(`/contests/${contest.id}/register`);
    } else {
      navigate(`/contests/${contest.id}`);
    }
  };

  // Handle register button click
  const handleRegisterClick = (contest, e) => {
    e.stopPropagation();
    if (contest.is_external && contest.url) {
      window.open(contest.url, '_blank');
    } else {
      navigate(`/contests/${contest.id}/register`);
    }
  };

  // Fetch contests on component mount
  useEffect(() => {
    fetchUpcomingContests();
  }, []);

  // Static recommended problems data (unchanged)
  const recommendedProblems = [
    { id: 1, title: "Two Sum", difficulty: "Easy", topic: "Arrays" },
    { id: 2, title: "Binary Tree Traversal", difficulty: "Medium", topic: "Trees" },
    { id: 3, title: "Dynamic Range Sum", difficulty: "Hard", topic: "Segment Trees" },
    { id: 4, title: "Graph Connectivity", difficulty: "Medium", topic: "Graphs" },
    { id: 5, title: "String Matching", difficulty: "Easy", topic: "Strings" },
    { id: 6, title: "Dynamic Programming Basics", difficulty: "Medium", topic: "DP" }
  ];

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
              to="/contests?tab=upcoming"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 flex items-center gap-1 text-xs"
            >
              View All
              <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          {/* Contests List */}
          <div className="space-y-2">
            {loading ? (
              <div className="p-2 text-center text-xs text-gray-500">Loading contests...</div>
            ) : upcomingContests.length === 0 ? (
              <div className="p-2 text-center text-xs text-gray-500">No upcoming contests</div>
            ) : (
              upcomingContests.map((contest) => (
                <div
                  key={contest.id}
                  className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  onClick={() => handleContestClick(contest)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-xs">
                          {contest.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(contest)}
                          </span>
                          {!contest.is_external && (
                            <span className="flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {contest.participants || 0} participants
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {getPlatformName(contest.platform)} • {formatContestDate(contest.start_time)}
                        </div>
                      </div>
                    </div>

                    {/* Single Button Column */}
                    <div className="flex flex-col items-end gap-1">
                      <button
                        className={`px-2 py-1 rounded font-medium text-xs transition-all duration-200 flex items-center gap-1 ${contest.is_external
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-800 text-white hover:bg-blue-900'
                          }`}
                        onClick={(e) => handleRegisterClick(contest, e)}
                      >
                        {contest.is_external ? (
                          <>
                            <Eye className="w-2.5 h-2.5" />
                            Visit
                          </>
                        ) : (
                          <>
                            <Eye className="w-2.5 h-2.5" />
                            Register
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Contest Countdown */}
      <div className="bg-white rounded-lg">
        <div className="p-3 border-b border-gray-200">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1.5">
              {nearestContest ?
                `Next: ${nearestContest.title}` :
                'No upcoming contests'
              }
            </div>
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
            {nearestContest && (
              <button
                onClick={() => handleContestClick(nearestContest)}
                className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200"
              >
                {nearestContest.is_external ? 'Visit Contest' : 'Register Now'}
              </button>
            )}
          </div>
        </div>
      </div>

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
              <h2 className="text-xs font-semibold text-gray-900">Recommended Problem Sets</h2>
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-900 pb-2">Problem</th>
                  <th className="text-center font-semibold text-gray-900 pb-2">Difficulty</th>
                  <th className="text-center font-semibold text-gray-900 pb-2">Topic</th>
                </tr>
              </thead>
              <tbody>
                {recommendedProblems.map((problem) => (
                  <tr key={problem.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2">
                      <Link to={`/problem/${problem.id}`} className="text-blue-900 font-bold hover:text-blue-800 hover:underline">
                        {problem.title}
                      </Link>
                    </td>
                    <td className="py-2 text-center text-gray-700">
                      {problem.difficulty}
                    </td>
                    <td className="py-2 text-center text-gray-600">
                      {problem.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;