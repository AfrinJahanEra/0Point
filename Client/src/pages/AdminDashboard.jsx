import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Trophy, 
  Code, 
  FileCode,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Shield,
  ShieldOff,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: { total: 0, admins: 0, banned: 0, new_this_week: 0, new_today: 0 },
    blogs: { published: 0, drafts: 0, comments: 0, votes: 0, new_this_week: 0 },
    contests: { total: 0, live: 0, upcoming: 0, test_contests: 0, virtual_contests: 0 },
    problems: { total: 0 },
    submissions: { total: 0, accepted: 0, acceptance_rate: 0, test_submissions: 0, virtual_submissions: 0, code_executions: 0, this_week: 0, today: 0 },
    announcements: 0,
    tutorials: 0
  });
  const [users, setUsers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('Violation of terms of service');
  const [expandedBlogIds, setExpandedBlogIds] = useState([]);
  const [expandedSubmissionIds, setExpandedSubmissionIds] = useState([]);
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin-panel/dashboard/');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin-panel/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadBannedUsers = async () => {
    try {
      const response = await api.get('/admin-panel/banned-users/');
      setBannedUsers(response.data);
    } catch (error) {
      console.error('Error loading banned users:', error);
    }
  };

  const loadBlogs = async () => {
    try {
      const response = await api.get('/admin-panel/blogs/');
      setBlogs(response.data);
    } catch (error) {
      console.error('Error loading blogs:', error);
    }
  };

  const loadContests = async () => {
    try {
      const response = await api.get('/admin-panel/contests/');
      setContests(response.data);
    } catch (error) {
      console.error('Error loading contests:', error);
    }
  };

  const loadProblems = async () => {
    try {
      const response = await api.get('/admin-panel/problems/');
      setProblems(response.data);
    } catch (error) {
      console.error('Error loading problems:', error);
    }
  };

  const loadSubmissions = async () => {
    try {
      const response = await api.get('/admin-panel/submissions/');
      // Handle both old format (array) and new format (object with submissions array)
      const submissionsData = Array.isArray(response.data) ? response.data : response.data.submissions;
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'users':
        loadUsers();
        break;
      case 'banned_users':
        loadBannedUsers();
        break;
      case 'blogs':
        loadBlogs();
        break;
      case 'contests':
        loadContests();
        break;
      case 'problems':
        loadProblems();
        break;
      case 'submissions':
        loadSubmissions();
        break;
      default:
        loadDashboardData();
    }
  };

  const openBanModal = (user) => {
    setSelectedUser(user);
    setBanReason('Violation of terms of service');
    setShowBanModal(true);
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    if (!window.confirm(`Permanently ban ${selectedUser.email}? This will:\n1. Delete their account permanently\n2. Block them from creating new accounts\n3. Block all their IP addresses\n4. Block all their devices\n\nThis action cannot be undone!`)) return;
    
    try {
      await api.delete(`/admin-panel/users/${selectedUser.id}/`, {
        data: { ban_reason: banReason }
      });
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setStats(prev => ({
        ...prev,
        users: {
          ...prev.users,
          total: prev.users.total - 1,
          banned: prev.users.banned + 1
        }
      }));
      alert('User permanently banned and blocked from registration');
      setShowBanModal(false);
      setSelectedUser(null);
    } catch (error) {
      alert('Error banning user: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;
    
    try {
      await api.delete(`/admin-panel/blogs/${blogId}/`);
      setBlogs(blogs.filter(blog => blog.id !== blogId));
      alert('Blog deleted successfully');
    } catch (error) {
      alert('Error deleting blog: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm('Are you sure you want to delete this contest? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/admin-panel/contests/${contestId}/`);
      setContests(contests.filter(contest => contest.id !== contestId));
      alert('Contest deleted successfully');
    } catch (error) {
      alert('Error deleting contest: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this problem?')) return;
    
    try {
      await api.delete(`/admin-panel/problems/${problemId}/`);
      setProblems(problems.filter(problem => problem.id !== problemId));
      alert('Problem deleted successfully');
    } catch (error) {
      alert('Error deleting problem: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    
    try {
      await api.delete(`/admin-panel/submissions/${submissionId}/`);
      setSubmissions(submissions.filter(submission => submission.id !== submissionId));
      alert('Submission deleted successfully');
    } catch (error) {
      alert('Error deleting submission: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBannedUsers = bannedUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof blog.author === 'string' ? blog.author : blog.author?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContests = contests.filter(contest => 
    contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof contest.created_by === 'string' ? contest.created_by : contest.created_by?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProblems = problems.filter(problem => 
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(submission => 
    (typeof submission.user === 'string' ? submission.user : submission.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (submission.problem_title || submission.problem || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleBlogExpand = (blogId) => {
    setExpandedBlogIds(prev => 
      prev.includes(blogId) ? prev.filter(id => id !== blogId) : [...prev, blogId]
    );
  };

  const toggleSubmissionExpand = (submissionId) => {
    setExpandedSubmissionIds(prev => 
      prev.includes(submissionId) ? prev.filter(id => id !== submissionId) : [...prev, submissionId]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleTabChange('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'dashboard' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('users')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'users' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    Users ({stats.users.total})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('banned_users')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'banned_users' 
                        ? 'bg-red-100 text-red-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ShieldOff className="w-5 h-5" />
                    Banned Accounts ({stats.users.banned})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('blogs')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'blogs' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    Blogs ({stats.blogs.published})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('contests')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'contests' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Trophy className="w-5 h-5" />
                    Contests ({stats.contests.total})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('problems')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'problems' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Code className="w-5 h-5" />
                    Problems ({stats.problems.total})
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('submissions')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'submissions' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileCode className="w-5 h-5" />
                    Submissions ({stats.submissions.total})
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {activeTab === 'dashboard' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
                      <button
                        onClick={loadDashboardData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Users className="w-8 h-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-blue-900">{stats.users.total}</p>
                            <p className="text-blue-700">Active Users</p>
                            <p className="text-xs text-blue-600 mt-1">+{stats.users.new_today} today</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <ShieldOff className="w-8 h-8 text-red-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-red-900">{stats.users.banned}</p>
                            <p className="text-red-700">Banned Users</p>
                            <p className="text-xs text-red-600 mt-1">{stats.users.admins} admins</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="w-8 h-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-green-900">{stats.blogs.published}</p>
                            <p className="text-green-700">Published Blogs</p>
                            <p className="text-xs text-green-600 mt-1">{stats.blogs.comments} comments</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Trophy className="w-8 h-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-purple-900">{stats.contests.total}</p>
                            <p className="text-purple-700">Total Contests</p>
                            <p className="text-xs text-purple-600 mt-1">{stats.contests.live} live now</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Code className="w-8 h-8 text-amber-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-amber-900">{stats.problems.total}</p>
                            <p className="text-amber-700">Total Problems</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-cyan-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <FileCode className="w-8 h-8 text-cyan-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-cyan-900">{stats.submissions.total}</p>
                            <p className="text-cyan-700">Total Submissions</p>
                            <p className="text-xs text-cyan-600 mt-1">{stats.submissions.acceptance_rate}% AC</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'users' || activeTab === 'banned_users' || activeTab === 'blogs' || activeTab === 'contests' || activeTab === 'problems' || activeTab === 'submissions') && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 capitalize">
                        {activeTab === 'banned_users' ? 'Banned Accounts' : activeTab}
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleTabChange(activeTab)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {activeTab === 'users' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPs/Devices</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                              <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.role === 'admin' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {user.ip_addresses?.length || 0} IPs
                                    </span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {user.device_count || 0} Devices
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                  <button
                                    onClick={() => openBanModal(user)}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 bg-red-50 px-3 py-1 rounded"
                                  >
                                    <ShieldOff className="w-4 h-4" />
                                    Ban Permanently
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'banned_users' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ban Reason</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked IPs/Devices</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banned By</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banned At</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBannedUsers.map((user) => (
                              <tr key={user.id} className="bg-red-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <ShieldOff className="w-4 h-4 text-red-600" />
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                    {user.reason}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs bg-red-100 px-2 py-1 rounded">
                                      {user.ip_addresses?.length || 0} IPs blocked
                                    </span>
                                    <span className="text-xs bg-red-100 px-2 py-1 rounded">
                                      {user.device_fingerprints_count || 0} Devices blocked
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.banned_by}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(user.banned_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'blogs' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBlogs.map((blog) => (
                              <React.Fragment key={blog.id}>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleBlogExpand(blog.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        {expandedBlogIds.includes(blog.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                      <span>{blog.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>
                                      <div className="font-medium">
                                        {typeof blog.author === 'string' ? blog.author : blog.author?.name || 'Unknown'}
                                      </div>
                                      {blog.author?.email && (
                                        <div className="text-xs text-gray-400">{blog.author.email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col gap-1">
                                      {blog.comment_count !== undefined && (
                                        <span className="text-xs bg-blue-100 px-2 py-1 rounded">{blog.comment_count} comments</span>
                                      )}
                                      {blog.upvotes !== undefined && (
                                        <span className="text-xs bg-green-100 px-2 py-1 rounded">{blog.upvotes} upvotes</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      blog.is_published 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {blog.is_published ? 'Published' : 'Draft'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(blog.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                      onClick={() => handleDeleteBlog(blog.id)}
                                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {expandedBlogIds.includes(blog.id) && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Content:</h4>
                                          <div className="p-3 bg-white rounded border text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                            {blog.full_content || blog.content_preview || 'No content available'}
                                          </div>
                                        </div>
                                        {blog.tags && blog.tags.length > 0 && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Tags:</h4>
                                            <div className="flex flex-wrap gap-2">
                                              {blog.tags.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{tag}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {blog.co_authors && blog.co_authors.length > 0 && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Co-Authors:</h4>
                                            <div className="flex flex-wrap gap-2">
                                              {blog.co_authors.map((coAuthor, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                  {coAuthor.name} ({coAuthor.email})
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'contests' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredContests.map((contest) => (
                              <tr key={contest.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contest.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contest.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {typeof contest.created_by === 'string' ? contest.created_by : contest.created_by?.name || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    contest.status === 'upcoming' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : contest.status === 'ongoing' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {contest.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteContest(contest.id)}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'problems' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Limit</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProblems.map((problem) => (
                              <tr key={problem.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{problem.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    problem.difficulty === 'Easy' 
                                      ? 'bg-green-100 text-green-800' 
                                      : problem.difficulty === 'Medium' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-red-100 text-red-800'
                                  }`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{problem.time_limit}s</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(problem.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteProblem(problem.id)}
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === 'submissions' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSubmissions.map((submission) => (
                              <React.Fragment key={submission.id}>
                                <tr className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleSubmissionExpand(submission.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        {expandedSubmissionIds.includes(submission.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                      <div>
                                        <div>{typeof submission.user === 'string' ? submission.user : submission.user?.name || 'Unknown'}</div>
                                        {submission.user?.email && (
                                          <div className="text-xs text-gray-400">{submission.user.email}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                    <div>
                                      <div className="font-medium">{submission.problem_title || submission.problem || 'Unknown'}</div>
                                      {submission.problem_index && (
                                        <div className="text-xs text-gray-400">Problem {submission.problem_index}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{submission.language}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      (submission.verdict || submission.status) === 'AC' 
                                        ? 'bg-green-100 text-green-800' 
                                        : (submission.verdict || submission.status) === 'WA' 
                                          ? 'bg-red-100 text-red-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {submission.verdict || submission.status}
                                    </span>
                                    {submission.passed_test_cases !== undefined && submission.total_test_cases !== undefined && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {submission.passed_test_cases}/{submission.total_test_cases} tests
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(submission.submitted_at).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                      onClick={() => handleDeleteSubmission(submission.id)}
                                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {expandedSubmissionIds.includes(submission.id) && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Code:</h4>
                                          <pre className="p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto max-h-96">
                                            <code>{submission.full_code || submission.code_preview || submission.code || 'No code available'}</code>
                                          </pre>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          {submission.execution_time !== undefined && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-1">Execution Time:</h4>
                                              <span className="text-sm">{submission.execution_time} ms</span>
                                            </div>
                                          )}
                                          {submission.memory !== undefined && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-1">Memory:</h4>
                                              <span className="text-sm">{submission.memory} KB</span>
                                            </div>
                                          )}
                                        </div>
                                        {submission.error_message && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-red-700 mb-2">Error Message:</h4>
                                            <pre className="p-3 bg-red-50 text-red-800 rounded text-xs overflow-x-auto">{submission.error_message}</pre>
                                          </div>
                                        )}
                                        {submission.compile_output && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Compile Output:</h4>
                                            <pre className="p-3 bg-yellow-50 text-yellow-800 rounded text-xs overflow-x-auto">{submission.compile_output}</pre>
                                          </div>
                                        )}
                                        {submission.contest && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Contest:</h4>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                              {submission.contest.title || 'Unknown'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <ShieldOff className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Permanently Ban User</h3>
              </div>
              
              <div className="mb-4 p-4 bg-red-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700">
                      This action will <strong>permanently delete</strong> the account and <strong>prevent</strong> the user from creating new accounts.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User to ban:</p>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">{selectedUser.ip_addresses?.length || 0} IPs</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">{selectedUser.device_count || 0} Devices</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Reason
                </label>
                <select
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Violation of terms of service">Violation of terms of service</option>
                  <option value="Spamming">Spamming</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Cheating">Cheating</option>
                  <option value="Multiple accounts">Multiple accounts</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-2"
                >
                  <ShieldOff className="w-4 h-4" />
                  Ban Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;