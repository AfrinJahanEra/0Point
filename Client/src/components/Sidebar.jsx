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
  Code2
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 5,
    hours: 12,
    minutes: 30,
    seconds: 45
  });

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
  }, []);

  const upcomingContests = [
    {
      id: 1,
      title: "IUT Winter Coding Challenge",
      platform: "IUT Platform",
      date: "Dec 15, 2023 • 18:00",
      duration: "3 hours",
      participants: "500+",
      difficulty: "Medium",
      type: "Team",
      status: "upcoming",
      registered: true
    },
    {
      id: 2,
      title: "Algorithm Masters 2024",
      platform: "IUT Platform",
      date: "Dec 18, 2023 • 20:00",
      duration: "2.5 hours",
      participants: "300+",
      difficulty: "Hard",
      type: "Individual",
      status: "upcoming",
      registered: false
    },
    {
      id: 3,
      title: "Data Structures Sprint",
      platform: "IUT Platform",
      date: "Dec 22, 2023 • 16:00",
      duration: "2 hours",
      participants: "400+",
      difficulty: "Easy",
      type: "Individual",
      status: "upcoming",
      registered: true
    }
  ];

  const recommendedProblems = [
    { id: 1, title: "Two Sum", difficulty: "Easy", topic: "Arrays" },
    { id: 2, title: "Binary Tree Traversal", difficulty: "Medium", topic: "Trees" },
    { id: 3, title: "Dynamic Range Sum", difficulty: "Hard", topic: "Segment Trees" },
    { id: 4, title: "Graph Connectivity", difficulty: "Medium", topic: "Graphs" },
    { id: 5, title: "String Matching", difficulty: "Easy", topic: "Strings" },
    { id: 6, title: "Dynamic Programming Basics", difficulty: "Medium", topic: "DP" }
  ];

  const [registeredContests, setRegisteredContests] = useState(new Set());

  const handleRegister = (contestId) => {
    setRegisteredContests(prev => new Set([...prev, contestId]));
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
            {upcomingContests.map((contest) => (
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
                      <h3 className="font-medium text-gray-900 text-xs">
                        {contest.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {contest.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {contest.participants}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Single Button Column */}
                  <div className="flex flex-col items-end gap-1">
                    <button 
                      className={`px-2 py-1 rounded font-medium text-xs transition-all duration-200 flex items-center gap-1 ${
                        registeredContests.has(contest.id) || contest.registered
                          ? 'bg-blue-800 text-white cursor-not-allowed'
                          : 'bg-blue-800 text-white hover:bg-blue-900'
                      }`}
                      onClick={() => !registeredContests.has(contest.id) && !contest.registered && handleRegister(contest.id)}
                      disabled={registeredContests.has(contest.id) || contest.registered}
                    >
                      {registeredContests.has(contest.id) || contest.registered ? (
                        <>
                          <Play className="w-2.5 h-2.5" />
                          Participate
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
            ))}
          </div>
        </div>
      </div>

      {/* Contest Countdown */}
      <div className="bg-white rounded-lg">
        <div className="p-3 border-b border-gray-200">
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1.5">Next Contest Countdown</div>
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
            <button 
              onClick={() => navigate('/contest/1/register')} // ADD THIS
              className="text-xs bg-blue-800 text-white px-2.5 py-1 rounded hover:bg-blue-900 transition-colors duration-200"
            >
              Register Now
            </button>
          </div>
        </div>
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