import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Shield,
  ShieldOff,
  AlertCircle
} from 'lucide-react';
import * as d3 from 'd3';
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
  const [expandedContestIds, setExpandedContestIds] = useState([]);
  const [expandedProblemIds, setExpandedProblemIds] = useState([]);
  const activityChartRef = useRef(null);
  const [activityData, setActivityData] = useState([]);
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      navigate('/contests');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin-panel/dashboard/');
      
      // Get actual problem count from contests
      const contestsResponse = await api.get('/admin-panel/contests/');
      let totalProblems = 0;
      contestsResponse.data.forEach(contest => {
        if (contest.problems && contest.problems.length > 0) {
          totalProblems += contest.problems.length;
        }
      });
      
      setStats({
        ...response.data.stats,
        problems: {
          ...response.data.stats.problems,
          total: totalProblems
        }
      });
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
      // Fetch all contests to get their problems
      const response = await api.get('/admin-panel/contests/');
      const contests = response.data;
      
      // Aggregate all problems from all contests
      const allProblems = [];
      contests.forEach(contest => {
        if (contest.problems && contest.problems.length > 0) {
          contest.problems.forEach(problem => {
            allProblems.push({
              ...problem,
              contest_id: contest.id,
              contest_title: contest.title,
              contest_type: contest.type,
              contest_status: contest.status
            });
          });
        }
      });
      
      setProblems(allProblems);
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

  // Generate mock activity data for the last 30 days
  const generateActivityData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + (i < 10 ? 30 : 10),
        submissions: Math.floor(Math.random() * 100) + (i < 10 ? 80 : 30),
        contests: Math.floor(Math.random() * 5) + (i < 7 ? 3 : 0),
        blogs: Math.floor(Math.random() * 10) + (i < 15 ? 5 : 2)
      });
    }
    
    setActivityData(data);
  };

  // Render activity chart with D3.js
  const renderActivityChart = () => {
    if (!activityChartRef.current || activityData.length === 0) return;

    // Clear previous chart
    d3.select(activityChartRef.current).selectAll('*').remove();

    const container = activityChartRef.current;
    const width = container.clientWidth;
    const height = 400;
    const margin = { top: 30, right: 140, bottom: 70, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', 'linear-gradient(to bottom, #f8fafc, #ffffff)');

    // Add subtle shadow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'shadow')
      .attr('height', '130%');
    
    filter.append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3);
    
    filter.append('feOffset')
      .attr('dx', 0)
      .attr('dy', 2);
    
    filter.append('feComponentTransfer')
      .append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', 0.3);
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const data = activityData.map(d => ({
      ...d,
      date: parseDate(d.date)
    }));

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, chartWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.users, d.submissions, d.contests * 20, d.blogs * 10)) * 1.1])
      .range([chartHeight, 0]);

    // Add gradient definitions
    const gradient1 = defs.append('linearGradient')
      .attr('id', 'gradient-users')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradient1.append('stop').attr('offset', '0%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.8);
    gradient1.append('stop').attr('offset', '100%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.1);

    const gradient2 = defs.append('linearGradient')
      .attr('id', 'gradient-submissions')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradient2.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.6);
    gradient2.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.05);

    // Line generators
    const lineUsers = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.users))
      .curve(d3.curveMonotoneX);

    const lineSubmissions = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.submissions))
      .curve(d3.curveMonotoneX);

    const lineContests = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.contests * 20))
      .curve(d3.curveMonotoneX);

    const lineBlogs = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.blogs * 10))
      .curve(d3.curveMonotoneX);

    // Area generators for gradient fills
    const areaUsers = d3.area()
      .x(d => x(d.date))
      .y0(chartHeight)
      .y1(d => y(d.users))
      .curve(d3.curveMonotoneX);

    const areaSubmissions = d3.area()
      .x(d => x(d.date))
      .y0(chartHeight)
      .y1(d => y(d.submissions))
      .curve(d3.curveMonotoneX);

    // Add grid lines with styling
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.15)
      .call(d3.axisLeft(y)
        .ticks(6)
        .tickSize(-chartWidth)
        .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#64748b')
      .style('stroke-dasharray', '2,2');

    // Add axes with enhanced styling
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x)
        .ticks(7)
        .tickFormat(d3.timeFormat('%b %d')))
      .style('font-family', 'Inter, system-ui, sans-serif');
    
    xAxis.selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#475569');
    
    xAxis.select('.domain')
      .style('stroke', '#cbd5e1')
      .style('stroke-width', '1.5px');

    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .style('font-family', 'Inter, system-ui, sans-serif');
    
    yAxis.selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#475569');
    
    yAxis.select('.domain')
      .style('stroke', '#cbd5e1')
      .style('stroke-width', '1.5px');

    // Add gradient areas
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#gradient-users)')
      .attr('d', areaUsers)
      .style('opacity', 0)
      .transition()
      .duration(1500)
      .style('opacity', 1);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#gradient-submissions)')
      .attr('d', areaSubmissions)
      .style('opacity', 0)
      .transition()
      .duration(1500)
      .delay(200)
      .style('opacity', 1);

    const colors = {
      users: '#1e3a8a',
      submissions: '#3b82f6',
      contests: '#64748b',
      blogs: '#60a5fa'
    };

    // Users line with glow effect
    const pathUsers = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.users)
      .attr('stroke-width', 3.5)
      .attr('d', lineUsers)
      .style('filter', 'drop-shadow(0 0 4px rgba(30, 58, 138, 0.5))');

    const totalLength1 = pathUsers.node().getTotalLength();
    pathUsers
      .attr('stroke-dasharray', totalLength1 + ' ' + totalLength1)
      .attr('stroke-dashoffset', totalLength1)
      .transition()
      .duration(2000)
      .ease(d3.easeQuadInOut)
      .attr('stroke-dashoffset', 0);

    // Add dots for users
    g.selectAll('.dot-users')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot-users')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.users))
      .attr('r', 0)
      .attr('fill', colors.users)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('filter', 'url(#shadow)')
      .transition()
      .duration(500)
      .delay((d, i) => 2000 + i * 30)
      .attr('r', 4);

    // Submissions line
    const pathSubmissions = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.submissions)
      .attr('stroke-width', 3)
      .attr('d', lineSubmissions)
      .style('filter', 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.4))');

    const totalLength2 = pathSubmissions.node().getTotalLength();
    pathSubmissions
      .attr('stroke-dasharray', totalLength2 + ' ' + totalLength2)
      .attr('stroke-dashoffset', totalLength2)
      .transition()
      .duration(2000)
      .delay(200)
      .ease(d3.easeQuadInOut)
      .attr('stroke-dashoffset', 0);

    // Contests line
    const pathContests = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.contests)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '5,5')
      .attr('d', lineContests);

    const totalLength3 = pathContests.node().getTotalLength();
    pathContests
      .attr('stroke-dasharray', totalLength3 + ' ' + totalLength3)
      .attr('stroke-dashoffset', totalLength3)
      .transition()
      .duration(2000)
      .delay(400)
      .ease(d3.easeQuadInOut)
      .attr('stroke-dashoffset', 0)
      .on('end', function() {
        d3.select(this).attr('stroke-dasharray', '5,5');
      });

    // Blogs line
    const pathBlogs = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.blogs)
      .attr('stroke-width', 2.5)
      .attr('d', lineBlogs);

    const totalLength4 = pathBlogs.node().getTotalLength();
    pathBlogs
      .attr('stroke-dasharray', totalLength4 + ' ' + totalLength4)
      .attr('stroke-dashoffset', totalLength4)
      .transition()
      .duration(2000)
      .delay(600)
      .ease(d3.easeQuadInOut)
      .attr('stroke-dashoffset', 0);

    // Enhanced legend with better styling
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right + 15}, ${margin.top + 10})`);

    const legendData = [
      { label: 'New Users', color: colors.users, style: 'solid' },
      { label: 'Submissions', color: colors.submissions, style: 'solid' },
      { label: 'Contests', color: colors.contests, style: 'dashed' },
      { label: 'Blogs', color: colors.blogs, style: 'solid' }
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 32})`);

      // Background for each legend item
      legendRow.append('rect')
        .attr('x', -5)
        .attr('y', 0)
        .attr('width', 110)
        .attr('height', 26)
        .attr('rx', 4)
        .attr('fill', i % 2 === 0 ? '#f8fafc' : 'white')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);

      legendRow.append('line')
        .attr('x1', 5)
        .attr('x2', 25)
        .attr('y1', 13)
        .attr('y2', 13)
        .attr('stroke', item.color)
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', item.style === 'dashed' ? '4,4' : 'none');

      if (item.style === 'solid' && item.label === 'New Users') {
        legendRow.append('circle')
          .attr('cx', 15)
          .attr('cy', 13)
          .attr('r', 3.5)
          .attr('fill', item.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5);
      }

      legendRow.append('text')
        .attr('x', 35)
        .attr('y', 13)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('font-family', 'Inter, system-ui, sans-serif')
        .style('fill', '#334155')
        .text(item.label);
    });

    // Add title on the chart
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 20)
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('fill', '#64748b')
      .style('font-family', 'Inter, system-ui, sans-serif')
      .text('Last 30 Days');
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
    problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (problem.contest_title && problem.contest_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (problem.index && problem.index.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const toggleContestExpand = (contestId) => {
    setExpandedContestIds(prev => 
      prev.includes(contestId) ? prev.filter(id => id !== contestId) : [...prev, contestId]
    );
  };

  const toggleProblemExpand = (problemKey) => {
    setExpandedProblemIds(prev => 
      prev.includes(problemKey) ? prev.filter(id => id !== problemKey) : [...prev, problemKey]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Generate activity data on component mount
  useEffect(() => {
    generateActivityData();
  }, []);

  // Render chart when data changes or window resizes
  useEffect(() => {
    if (activityData.length > 0 && activeTab === 'dashboard') {
      renderActivityChart();
      
      const handleResize = () => {
        renderActivityChart();
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [activityData, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">Complete platform control</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-3">
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => handleTabChange('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'dashboard' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('users')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'users' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Users</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'users' ? 'bg-white/20' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stats.users.total}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('banned_users')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'banned_users' 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldOff className="w-5 h-5" />
                      <span className="font-medium">Banned</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'banned_users' ? 'bg-white/20' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {stats.users.banned}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('blogs')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'blogs' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5" />
                      <span className="font-medium">Blogs</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'blogs' ? 'bg-white/20' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stats.blogs.published}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('contests')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'contests' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5" />
                      <span className="font-medium">Contests</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'contests' ? 'bg-white/20' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stats.contests.total}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('problems')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'problems' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5" />
                      <span className="font-medium">Problems</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'problems' ? 'bg-white/20' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stats.problems.total}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleTabChange('submissions')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'submissions' 
                        ? 'bg-blue-900 text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5" />
                      <span className="font-medium">Submissions</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'submissions' ? 'bg-white/20' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {stats.submissions.total}
                    </span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
                {activeTab === 'dashboard' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                      <button
                        onClick={loadDashboardData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Active Users</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.users.total}</p>
                            <p className="text-blue-900 text-xs">+{stats.users.new_today} today</p>
                          </div>
                          <div className="bg-blue-200 p-3 rounded-lg">
                            <Users className="w-7 h-7 text-blue-900" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Banned Users</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.users.banned}</p>
                            <p className="text-gray-600 text-xs">{stats.users.admins} admins</p>
                          </div>
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <ShieldOff className="w-7 h-7 text-gray-700" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Blogs</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.blogs.published}</p>
                            <p className="text-blue-900 text-xs">{stats.blogs.comments} comments</p>
                          </div>
                          <div className="bg-blue-200 p-3 rounded-lg">
                            <FileText className="w-7 h-7 text-blue-900" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Contests</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.contests.total}</p>
                            <p className="text-blue-900 text-xs">{stats.contests.live} live</p>
                          </div>
                          <div className="bg-blue-200 p-3 rounded-lg">
                            <Trophy className="w-7 h-7 text-blue-900" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Problems</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.problems.total}</p>
                            <p className="text-gray-600 text-xs">All contests</p>
                          </div>
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <Code className="w-7 h-7 text-gray-700" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium mb-1">Submissions</p>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.submissions.total}</p>
                            <p className="text-blue-900 text-xs">{stats.submissions.acceptance_rate}% AC</p>
                          </div>
                          <div className="bg-blue-200 p-3 rounded-lg">
                            <FileCode className="w-7 h-7 text-blue-900" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Activity Graph */}
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Platform Activity Overview</h3>
                          <p className="text-sm text-gray-500 mt-1">Real-time insights into platform engagement</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-blue-50 rounded-lg">
                            <span className="text-xs font-semibold text-blue-900">Live Data</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                        <div ref={activityChartRef} className="w-full" style={{ height: '400px' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'users' || activeTab === 'banned_users' || activeTab === 'blogs' || activeTab === 'contests' || activeTab === 'problems' || activeTab === 'submissions') && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 capitalize">
                        {activeTab === 'banned_users' ? 'Banned Accounts' : activeTab}
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 bg-white shadow-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleTabChange(activeTab)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {activeTab === 'users' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">IPs/Devices</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredUsers.map((user) => (
                              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    user.role === 'admin' 
                                      ? 'bg-blue-100 text-blue-900' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {user.ip_addresses?.length || 0} IPs
                                    </span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {user.device_count || 0} Devices
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                  <button
                                    onClick={() => openBanModal(user)}
                                    className="text-blue-900 hover:text-blue-950 font-medium flex items-center gap-1 transition-colors"
                                  >
                                    <ShieldOff className="w-4 h-4" />
                                    Ban
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
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ban Reason</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Blocked IPs/Devices</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Banned By</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Banned At</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredBannedUsers.map((user) => (
                              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <ShieldOff className="w-4 h-4 text-gray-700" />
                                    {user.email}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                    {user.reason}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {user.ip_addresses?.length || 0} IPs blocked
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
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
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Author</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stats</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredBlogs.map((blog) => (
                              <React.Fragment key={blog.id}>
                                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleBlogExpand(blog.id)}
                                        className="text-blue-900 hover:text-blue-950"
                                      >
                                        {expandedBlogIds.includes(blog.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                                        <div className="text-xs text-gray-500">{blog.author.email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <div className="flex flex-col gap-1">
                                      {blog.comment_count !== undefined && (
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{blog.comment_count} comments</span>
                                      )}
                                      {blog.upvotes !== undefined && (
                                        <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded">{blog.upvotes} upvotes</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      blog.is_published 
                                        ? 'bg-blue-100 text-blue-900' 
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {blog.is_published ? 'Published' : 'Draft'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {new Date(blog.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                      onClick={() => handleDeleteBlog(blog.id)}
                                      className="text-blue-900 hover:text-blue-950 font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {expandedBlogIds.includes(blog.id) && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-4 bg-blue-50">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-bold text-sm text-blue-900 mb-2">Content:</h4>
                                          <div className="p-4 bg-white rounded border border-blue-200 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                            {blog.full_content || blog.content_preview || 'No content available'}
                                          </div>
                                        </div>
                                        {blog.tags && blog.tags.length > 0 && (
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-2">Tags:</h4>
                                            <div className="flex flex-wrap gap-2">
                                              {blog.tags.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-900 text-xs rounded">{tag}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {blog.co_authors && blog.co_authors.length > 0 && (
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-2">Co-Authors:</h4>
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
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Creator</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stats</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredContests.map((contest) => (
                              <React.Fragment key={contest.id}>
                                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleContestExpand(contest.id)}
                                        className="text-blue-900 hover:text-blue-950"
                                      >
                                        {expandedContestIds.includes(contest.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                      <span>{contest.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{contest.type || 'N/A'}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <div>
                                      <div className="font-medium">
                                        {typeof contest.created_by === 'string' ? contest.created_by : contest.created_by?.name || 'Unknown'}
                                      </div>
                                      {contest.created_by?.email && (
                                        <div className="text-xs text-gray-500">{contest.created_by.email}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <div className="flex flex-col gap-1">
                                      {contest.problem_count !== undefined && (
                                        <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded">{contest.problem_count} problems</span>
                                      )}
                                      {contest.registration_count !== undefined && (
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{contest.registration_count} registered</span>
                                      )}
                                      {contest.submission_count !== undefined && (
                                        <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded">{contest.submission_count} submissions</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      contest.status === 'upcoming' 
                                        ? 'bg-blue-100 text-blue-900' 
                                        : contest.status === 'live' 
                                          ? 'bg-blue-900 text-white' 
                                          : contest.status === 'past'
                                            ? 'bg-gray-100 text-gray-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {contest.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                      onClick={() => handleDeleteContest(contest.id)}
                                      className="text-blue-900 hover:text-blue-950 font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {expandedContestIds.includes(contest.id) && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-4 bg-blue-50">
                                      <div className="space-y-4">
                                        {/* Contest Details */}
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded border border-blue-200">
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">Start Time:</h4>
                                            <span className="text-sm text-gray-700">{contest.start_time ? new Date(contest.start_time).toLocaleString() : 'Not set'}</span>
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">Duration:</h4>
                                            <span className="text-sm text-gray-700">{contest.duration ? `${contest.duration} hours` : 'Not set'}</span>
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">Platform:</h4>
                                            <span className="text-sm text-gray-700">{contest.platform || 'N/A'}</span>
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">Visibility:</h4>
                                            <span className="text-sm text-gray-700">{contest.visibility || 'public'}</span>
                                          </div>
                                          {contest.description && (
                                            <div className="col-span-2">
                                              <h4 className="font-bold text-sm text-blue-900 mb-1">Description:</h4>
                                              <p className="text-sm text-gray-700">{contest.description}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Contest Settings */}
                                        <div className="p-4 bg-white rounded border border-blue-200">
                                          <h4 className="font-bold text-sm text-blue-900 mb-2">Settings:</h4>
                                          <div className="flex flex-wrap gap-2">
                                            {contest.registration_required && (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-900 text-xs rounded">Registration Required</span>
                                            )}
                                            {contest.require_screen_recording && (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-900 text-xs rounded">Screen Recording</span>
                                            )}
                                            {contest.leaderboard_public && (
                                              <span className="px-2 py-1 bg-blue-900 text-white text-xs rounded">Public Leaderboard</span>
                                            )}
                                            {contest.allow_practice && (
                                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Practice Allowed</span>
                                            )}
                                            {contest.rating_changes && (
                                              <span className="px-2 py-1 bg-blue-900 text-white text-xs rounded">Rating Changes</span>
                                            )}
                                            {contest.editorial_published && (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-900 text-xs rounded">Editorial Published</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Testers */}
                                        {contest.testers && contest.testers.length > 0 && (
                                          <div className="p-4 bg-white rounded border border-blue-200">
                                            <h4 className="font-bold text-sm text-blue-900 mb-2">Testers ({contest.testers.length}):</h4>
                                            <div className="flex flex-wrap gap-2">
                                              {contest.testers.map((tester, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{tester}</span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Problems Section */}
                                        <div>
                                          <h4 className="font-bold text-sm text-blue-900 mb-3">Problems ({contest.problem_count || 0}):</h4>
                                          {contest.problems && contest.problems.length > 0 ? (
                                            <div className="space-y-3">
                                              {contest.problems.map((problem, idx) => (
                                                <div key={idx} className="p-4 bg-white rounded border border-blue-200 hover:border-blue-900 transition-colors">
                                                  <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                      <span className="px-3 py-1 bg-blue-900 text-white font-bold rounded">{problem.index}</span>
                                                      <div>
                                                        <h5 className="font-bold text-gray-900">{problem.title}</h5>
                                                        <div className="flex gap-2 mt-1">
                                                          <span className={`px-2 py-0.5 text-xs rounded ${
                                                            problem.difficulty === 'Easy' 
                                                              ? 'bg-blue-100 text-blue-900' 
                                                              : problem.difficulty === 'Medium' 
                                                                ? 'bg-gray-600 text-white' 
                                                                : 'bg-gray-800 text-white'
                                                          }`}>
                                                            {problem.difficulty || 'N/A'}
                                                          </span>
                                                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                                            Time: {problem.time_limit_seconds || 1}s
                                                          </span>
                                                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                                            Memory: {problem.memory_limit_mb || 256}MB
                                                          </span>
                                                          {problem.points > 0 && (
                                                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-900 rounded">
                                                              {problem.points} points
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  {problem.statement && (
                                                    <div className="mt-3">
                                                      <h6 className="text-xs font-semibold text-gray-700 mb-1">Statement:</h6>
                                                      <div className="p-2 bg-gray-50 rounded text-xs text-gray-700 max-h-32 overflow-y-auto">
                                                        {problem.statement.length > 300 
                                                          ? problem.statement.substring(0, 300) + '...' 
                                                          : problem.statement}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {problem.tags && problem.tags.length > 0 && (
                                                    <div className="mt-2">
                                                      <h6 className="text-xs font-semibold text-gray-700 mb-1">Tags:</h6>
                                                      <div className="flex flex-wrap gap-1">
                                                        {problem.tags.map((tag, tagIdx) => (
                                                          <span key={tagIdx} className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded">{tag}</span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {problem.test_cases && problem.test_cases.length > 0 && (
                                                    <div className="mt-3">
                                                      <h6 className="text-xs font-semibold text-gray-700 mb-2">
                                                        Test Cases: {problem.test_cases.length} total
                                                        {problem.test_cases.filter(tc => tc.sample).length > 0 && (
                                                          <span className="ml-2 text-green-600">({problem.test_cases.filter(tc => tc.sample).length} sample)</span>
                                                        )}
                                                        {problem.test_cases.filter(tc => tc.hidden).length > 0 && (
                                                          <span className="ml-2 text-gray-600">({problem.test_cases.filter(tc => tc.hidden).length} hidden)</span>
                                                        )}
                                                      </h6>
                                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                                        {problem.test_cases.map((testCase, tcIdx) => (
                                                          <div key={tcIdx} className={`p-3 rounded border ${
                                                            testCase.sample 
                                                              ? 'bg-blue-50 border-blue-200'
                                                              : testCase.hidden 
                                                                ? 'bg-gray-50 border-gray-200'
                                                                : 'bg-blue-50 border-blue-200'
                                                          }`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                              <span className="text-xs font-semibold text-gray-700">Test Case #{tcIdx + 1}</span>
                                                              {testCase.sample && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded">Sample</span>
                                                              )}
                                                              {testCase.hidden && (
                                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">Hidden</span>
                                                              )}
                                                              {testCase.difficulty && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded">{testCase.difficulty}</span>
                                                              )}
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                              <div>
                                                                <div className="text-xs font-semibold text-gray-600 mb-1">Input:</div>
                                                                <pre className="text-xs p-2 bg-white rounded border font-mono whitespace-pre-wrap break-words">{testCase.input || 'N/A'}</pre>
                                                              </div>
                                                              <div>
                                                                <div className="text-xs font-semibold text-gray-600 mb-1">Expected Output:</div>
                                                                <pre className="text-xs p-2 bg-white rounded border font-mono whitespace-pre-wrap break-words">{testCase.output || 'N/A'}</pre>
                                                              </div>
                                                            </div>
                                                            {testCase.explanation && (
                                                              <div className="mt-2">
                                                                <div className="text-xs font-semibold text-gray-600 mb-1">Explanation:</div>
                                                                <p className="text-xs text-gray-700 p-2 bg-white rounded border">{testCase.explanation}</p>
                                                              </div>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="p-4 bg-white rounded border text-center text-gray-500 text-sm">
                                              No problems added yet
                                            </div>
                                          )}
                                        </div>

                                        {/* Announcements Count */}
                                        {contest.announcement_count > 0 && (
                                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                            <div className="flex items-center gap-2">
                                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                                              <span className="text-sm text-yellow-800">
                                                {contest.announcement_count} announcement(s) for this contest
                                              </span>
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

                    {activeTab === 'problems' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Problem</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contest</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Difficulty</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Limits</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Test Cases</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredProblems.map((problem) => {
                              const problemKey = `${problem.contest_id}-${problem.index}`;
                              return (
                                <React.Fragment key={problemKey}>
                                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => toggleProblemExpand(problemKey)}
                                          className="text-blue-900 hover:text-blue-950"
                                        >
                                          {expandedProblemIds.includes(problemKey) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-blue-900 text-white font-bold rounded text-xs">{problem.index}</span>
                                            <span>{problem.title}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <div>
                                        <div className="font-medium">{problem.contest_title || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{problem.contest_type || ''}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        problem.difficulty === 'Easy' 
                                          ? 'bg-blue-100 text-blue-900' 
                                          : problem.difficulty === 'Medium' 
                                            ? 'bg-gray-600 text-white' 
                                            : problem.difficulty === 'Hard'
                                              ? 'bg-gray-800 text-white'
                                              : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {problem.difficulty || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs">Time: {problem.time_limit_seconds || 1}s</span>
                                        <span className="text-xs">Memory: {problem.memory_limit_mb || 256}MB</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                          {problem.test_cases ? problem.test_cases.length : 0} total
                                        </span>
                                        {problem.test_cases && problem.test_cases.filter(tc => tc.sample).length > 0 && (
                                          <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded">
                                            {problem.test_cases.filter(tc => tc.sample).length} sample
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        problem.contest_status === 'live' 
                                          ? 'bg-blue-900 text-white'
                                          : problem.contest_status === 'upcoming'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {problem.contest_status}
                                      </span>
                                    </td>
                                  </tr>
                                  {expandedProblemIds.includes(problemKey) && (
                                    <tr>
                                      <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                        <div className="space-y-4">
                                          {/* Problem Statement */}
                                          {problem.statement && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Problem Statement:</h4>
                                              <div className="p-3 bg-white rounded border text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                                {problem.statement}
                                              </div>
                                            </div>
                                          )}

                                          {/* Tags */}
                                          {problem.tags && problem.tags.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Tags:</h4>
                                              <div className="flex flex-wrap gap-2">
                                                {problem.tags.map((tag, idx) => (
                                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-900 text-xs rounded">{tag}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Points */}
                                          {problem.points > 0 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Points:</h4>
                                              <span className="px-3 py-1 bg-blue-100 text-blue-900 text-sm rounded font-semibold">{problem.points}</span>
                                            </div>
                                          )}

                                          {/* Test Cases */}
                                          {problem.test_cases && problem.test_cases.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Test Cases:</h4>
                                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {problem.test_cases.map((testCase, tcIdx) => (
                                                  <div key={tcIdx} className={`p-3 rounded border ${
                                                    testCase.sample 
                                                      ? 'bg-blue-50 border-blue-200'
                                                      : testCase.hidden 
                                                        ? 'bg-gray-50 border-gray-200'
                                                        : 'bg-blue-50 border-blue-200'
                                                  }`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <span className="text-xs font-semibold text-gray-700">Test Case #{tcIdx + 1}</span>
                                                      {testCase.sample && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded">Sample</span>
                                                      )}
                                                      {testCase.hidden && (
                                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">Hidden</span>
                                                      )}
                                                      {testCase.difficulty && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-xs rounded">{testCase.difficulty}</span>
                                                      )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <div>
                                                        <div className="text-xs font-semibold text-gray-600 mb-1">Input:</div>
                                                        <pre className="text-xs p-2 bg-white rounded border font-mono whitespace-pre-wrap break-words">{testCase.input || 'N/A'}</pre>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs font-semibold text-gray-600 mb-1">Expected Output:</div>
                                                        <pre className="text-xs p-2 bg-white rounded border font-mono whitespace-pre-wrap break-words">{testCase.output || 'N/A'}</pre>
                                                      </div>
                                                    </div>
                                                    {testCase.explanation && (
                                                      <div className="mt-2">
                                                        <div className="text-xs font-semibold text-gray-600 mb-1">Explanation:</div>
                                                        <p className="text-xs text-gray-700 p-2 bg-white rounded border">{testCase.explanation}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Tutorial */}
                                          {problem.tutorial && (
                                            <div>
                                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Tutorial:</h4>
                                              <div className="p-3 bg-white rounded border text-sm text-gray-700 whitespace-pre-wrap">
                                                {problem.tutorial}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                        {filteredProblems.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No problems found
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'submissions' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Problem</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Language</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredSubmissions.map((submission) => (
                              <React.Fragment key={submission.id}>
                                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleSubmissionExpand(submission.id)}
                                        className="text-blue-900 hover:text-blue-950"
                                      >
                                        {expandedSubmissionIds.includes(submission.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                      <div>
                                        <div>{typeof submission.user === 'string' ? submission.user : submission.user?.name || 'Unknown'}</div>
                                        {submission.user?.email && (
                                          <div className="text-xs text-gray-500">{submission.user.email}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    <div>
                                      <div className="font-medium">{submission.problem_title || submission.problem || 'Unknown'}</div>
                                      {submission.problem_index && (
                                        <div className="text-xs text-gray-500">Problem {submission.problem_index}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">{submission.language}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      (submission.verdict || submission.status) === 'AC' 
                                        ? 'bg-blue-900 text-white' 
                                        : (submission.verdict || submission.status) === 'WA' 
                                          ? 'bg-gray-100 text-gray-800' 
                                          : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {submission.verdict || submission.status}
                                    </span>
                                    {submission.passed_test_cases !== undefined && submission.total_test_cases !== undefined && (
                                      <div className="text-xs text-gray-700 mt-1">
                                        {submission.passed_test_cases}/{submission.total_test_cases} tests
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {new Date(submission.submitted_at).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                      onClick={() => handleDeleteSubmission(submission.id)}
                                      className="text-blue-900 hover:text-blue-950 font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {expandedSubmissionIds.includes(submission.id) && (
                                  <tr>
                                    <td colSpan="6" className="px-6 py-4 bg-blue-50">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-bold text-sm text-blue-900 mb-2">Code:</h4>
                                          <pre className="p-4 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-96 border border-blue-200">
                                            <code>{submission.full_code || submission.code_preview || submission.code || 'No code available'}</code>
                                          </pre>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          {submission.execution_time !== undefined && (
                                            <div>
                                              <h4 className="font-bold text-sm text-blue-900 mb-1">Execution Time:</h4>
                                              <span className="text-sm text-gray-700">{submission.execution_time} ms</span>
                                            </div>
                                          )}
                                          {submission.memory !== undefined && (
                                            <div>
                                              <h4 className="font-bold text-sm text-blue-900 mb-1">Memory:</h4>
                                              <span className="text-sm text-gray-700">{submission.memory} KB</span>
                                            </div>
                                          )}
                                        </div>
                                        {submission.error_message && (
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-2">Error Message:</h4>
                                            <pre className="p-3 bg-gray-100 text-gray-800 rounded text-xs overflow-x-auto border border-blue-200">{submission.error_message}</pre>
                                          </div>
                                        )}
                                        {submission.compile_output && (
                                          <div>
                                            <h4 className="font-bold text-sm text-blue-900 mb-2">Compile Output:</h4>
                                            <pre className="p-3 bg-blue-50 text-gray-800 rounded text-xs overflow-x-auto border border-blue-200">{submission.compile_output}</pre>
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