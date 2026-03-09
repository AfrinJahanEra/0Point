import React, { useEffect, useState } from "react";
import { Trophy, Crown, Medal, Star, Search } from "lucide-react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [paginatedData, setPaginatedData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const LB_CACHE_KEY    = 'leaderboard_cache';
  const LB_CACHE_TS_KEY = 'leaderboard_cache_ts';
  const LB_MAX_AGE      = 3 * 60 * 1000; // 3 minutes

  const fetchLeaderboard = async () => {
    // 1. Show stale data instantly
    try {
      const cached   = localStorage.getItem(LB_CACHE_KEY);
      const cachedAt = parseInt(localStorage.getItem(LB_CACHE_TS_KEY) || '0', 10);
      const isFresh  = (Date.now() - cachedAt) < LB_MAX_AGE;
      if (cached) {
        setLeaderboardData(JSON.parse(cached));
        setLoading(false);
        if (isFresh) return;
      }
    } catch (_) {}

    // 2. Background refresh
    try {
      const response = await api.get('/leaderboard/');
      setLeaderboardData(response.data);
      try {
        localStorage.setItem(LB_CACHE_KEY, JSON.stringify(response.data));
        localStorage.setItem(LB_CACHE_TS_KEY, String(Date.now()));
      } catch (_) {}
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

    // 🔎 Search Filter
  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filtered = leaderboardData.filter(
        (user) =>
          user.username?.toLowerCase().includes(q) ||
          user.department?.toLowerCase().includes(q)
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(leaderboardData);
    }
    setCurrentPage(1);
  }, [searchQuery, leaderboardData]);

    // 📄 Pagination Logic
  useEffect(() => {
    const total = Math.ceil(filteredData.length / itemsPerPage);
    setTotalPages(total || 1);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    setPaginatedData(filteredData.slice(start, end));
  }, [filteredData, currentPage, itemsPerPage]);

  

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-600" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-600" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <Star className="w-4 h-4 text-purple-600" />;
  };

    const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Main Content */}
          <div className="lg:col-span-9">

            {/* Header */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">

                  {/* Items Per Page */}
                  <div className="flex items-center gap-2 text-xs">
                    <span>Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded px-2 py-1"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold">Rank</th>
                    <th className="p-3 text-left text-xs font-semibold">Username</th>
                    <th className="p-3 text-left text-xs font-semibold">Department</th>
                    <th className="p-3 text-left text-xs font-semibold">Total Points</th>
                    <th className="p-3 text-left text-xs font-semibold">Contests</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array.from({length: 8}).map((_, i) => (
                      <tr key={i} className="animate-pulse border-b">
                        <td className="p-3"><div className="h-2.5 bg-gray-200 rounded w-8" /></td>
                        <td className="p-3"><div className="h-2.5 bg-gray-200 rounded w-24" /></td>
                        <td className="p-3"><div className="h-2.5 bg-gray-200 rounded w-20" /></td>
                        <td className="p-3"><div className="h-2.5 bg-gray-200 rounded w-14" /></td>
                        <td className="p-3"><div className="h-2.5 bg-gray-200 rounded w-10" /></td>
                      </tr>
                    ))
                  ) : (
                    paginatedData.map((user) => (
                      <tr
                        key={user.user_id}
                        onClick={() =>
                          navigate(`/user/${user.user_id}`)
                        }
                        className="border-b hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="p-3 flex items-center gap-2 text-xs font-bold">
                          {getRankIcon(user.rank)}
                          {user.rank}
                        </td>
                        <td className="p-3 text-xs font-semibold">
                          {user.username}
                        </td>
                        <td className="p-3 text-xs">{user.department}</td>
                        <td className="p-3 text-xs font-bold text-purple-700">
                          {user.total_points}
                        </td>
                        <td className="p-3 text-xs">
                          {user.contests_participated}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {!loading && filteredData.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-500">
                  No leaderboard data found.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white mt-4 p-4 rounded-lg border flex justify-between items-center text-xs">
                <div>
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => goToPage(1)}>
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(currentPage - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2">{currentPage}</span>

                  <button onClick={() => goToPage(currentPage + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(totalPages)}>
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
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

export default Leaderboard;
