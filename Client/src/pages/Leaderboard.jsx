import React, { useEffect, useState } from "react";
import { Trophy, Crown, Medal, Star } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../utils/api";
import { useNavigate } from "react-router-dom";

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/leaderboard/`
      );
      setLeaderboardData(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-600" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-600" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <Star className="w-4 h-4 text-purple-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white p-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          <div>
            <h1 className="text-lg font-bold">Global Leaderboard</h1>
            <p className="text-sm text-purple-200">
              Ranked by Rating (Total Points)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Rank</th>
                <th className="p-3 text-left text-sm font-semibold">
                  Username
                </th>
                <th className="p-3 text-left text-sm font-semibold">
                  Department
                </th>
                <th className="p-3 text-left text-sm font-semibold">
                  Total Points
                </th>
                <th className="p-3 text-left text-sm font-semibold">
                  Contests Participated
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-6">
                    Loading...
                  </td>
                </tr>
              ) : (
                leaderboardData.map((user) => (
                  <tr
                    key={user.rank}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3 flex items-center gap-2 font-bold">
                      {getRankIcon(user.rank)}
                      {user.rank}
                    </td>

                    <td className="p-3 font-semibold text-gray-900">
                      {user.username}
                    </td>

                    <td className="p-3 text-gray-700">
                      {user.department}
                    </td>

                    <td className="p-3 font-bold text-purple-700">
                      {user.total_points}
                    </td>

                    <td className="p-3 text-gray-700">
                      {user.contests_participated}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && leaderboardData.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No leaderboard data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
