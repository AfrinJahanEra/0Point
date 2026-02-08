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
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    users: 0,
    blogs: 0,
    contests: 0,
    problems: 0,
    submissions: 0
  });
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      setSubmissions(response.data);
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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/admin-panel/users/${userId}/`);
      setUsers(users.filter(user => user.id !== userId));
      alert('User deleted successfully');
    } catch (error) {
      alert('Error deleting user: ' + (error.response?.data?.error || error.message));
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

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContests = contests.filter(contest => 
    contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contest.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProblems = problems.filter(problem => 
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(submission => 
    submission.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.problem.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    Users ({stats.users})
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
                    Blogs ({stats.blogs})
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
                    Contests ({stats.contests})
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
                    Problems ({stats.problems})
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
                    Submissions ({stats.submissions})
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Users className="w-8 h-8 text-blue-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-blue-900">{stats.users}</p>
                            <p className="text-blue-700">Total Users</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="w-8 h-8 text-green-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-green-900">{stats.blogs}</p>
                            <p className="text-green-700">Total Blogs</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Trophy className="w-8 h-8 text-purple-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-purple-900">{stats.contests}</p>
                            <p className="text-purple-700">Total Contests</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <Code className="w-8 h-8 text-amber-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-amber-900">{stats.problems}</p>
                            <p className="text-amber-700">Total Problems</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-cyan-50 p-6 rounded-lg">
                        <div className="flex items-center">
                          <FileCode className="w-8 h-8 text-cyan-600 mr-3" />
                          <div>
                            <p className="text-2xl font-bold text-cyan-900">{stats.submissions}</p>
                            <p className="text-cyan-700">Total Submissions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'users' || activeTab === 'blogs' || activeTab === 'contests' || activeTab === 'problems' || activeTab === 'submissions') && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 capitalize">{activeTab}</h2>
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
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
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

                    {activeTab === 'blogs' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBlogs.map((blog) => (
                              <tr key={blog.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{blog.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{blog.author}</td>
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredContests.map((contest) => (
                              <tr key={contest.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contest.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contest.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contest.created_by}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contest.participants}</td>
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
                              <tr key={submission.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{submission.user}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{submission.problem}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{submission.language}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    submission.status === 'AC' 
                                      ? 'bg-green-100 text-green-800' 
                                      : submission.status === 'WA' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {submission.status}
                                  </span>
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
    </div>
  );
};

export default AdminDashboard;