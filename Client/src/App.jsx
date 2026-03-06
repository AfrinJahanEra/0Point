import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import ProblemInside from './pages/ProblemInside';
import RegisterNow from './pages/RegisterNow';
import CreateContest from './pages/CreateContest';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Contests from './pages/Contests';
import Practice from './pages/Practice';
import Visualizer from './pages/Visualizer';
import Leaderboard from './pages/Leaderboard';
import Blog from './pages/Blog';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import CreateBlog from './pages/CreateBlog';
import Submissions from './pages/Submissions';
import Interview from './pages/Interview';  // Updated import
import InterviewSession from './pages/InterviewSession';  // Updated import
import ContestInside from './pages/ContestInside';
import MySubmissions from './pages/MySubmissions';
import ContestLeaderboard from './pages/ContestLeaderboard';
import ContestEditorial from './pages/ContestEditorial';
import ContestDiscussion from './pages/ContestDiscussion';
import ContestClarification from './pages/ContestClarification';
import ExternalContestDetail from './pages/ExternalContestDetail';
import VirtualContestInside from './pages/VirtualContestInside';
import VirtualProblem from './pages/VirtualProblem';
import TestContestInside from './pages/TestContestInside';
import TestContestProblemDetail from './pages/TestContestProblemDetail';
import TestContestLeaderboard  from './pages/TestContestLeaderboard';
import TestContestSubmission from './pages/TestContestSubmission';
import BlogDetail from './pages/BlogDetail';
import Recording from './pages/Recording';
import ContestHistory from './pages/ContestHistory';
import PublicDashboard from './pages/PublicDashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
// Layout component that includes Header and Footer only
const Layout = ({ children }) => (
  <>
    <Header />
    <main>
      {children}
    </main>
    <Footer />
  </>
);
// Layout component that includes Header, NavigationBar and Footer
const NavLayout = ({ children }) => (
  <>
    <Header />
    <NavigationBar />
    <main>
      {children}
    </main>
    <Footer />
  </>
);
// Full-screen layout (no header/footer)
const FullScreenLayout = ({ children }) => (
  <main>
    {children}
  </main>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirects based on role if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return children;
  }
  
  // Redirect based on user role
  return user?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/home" />;
};
function App() {
  return (
    <AppProvider>
      <Router>
        <div className="flex flex-col">
          <Toaster
            toastOptions={{
              style: {
                background: '#1e40af',
                color: '#ffffff',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#1e40af',
              },
            }}
          />
          <Routes>
            {/* Landing page without Header and Footer */}
            <Route path="/" element={<Landing />} />
           
            {/* Login and Register pages without Header and Footer */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
           
            {/* Visualizer and InterviewSession take full screen without Header and Footer */}
            <Route path="/visualizer" element={<Visualizer />} />
            <Route path="/interview-room/:sessionId" element={<InterviewSession />} />  {/* Updated dynamic route */}
            
            {/* Admin Dashboard - Protected for admin only */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
           
            {/* Pages with Header and Footer only */}
            <Route path="/home" element={
              <Layout>
                <Home />
              </Layout>
            } />



            
            <Route path="/contests/upcoming" element={
              <Layout>
                <Home />
              </Layout>
            } />

            <Route path="/contests/past" element={
              <Layout>
                <Home />
              </Layout>
            } />

            <Route path="/contests/live" element={
              <Layout>
                <Home />
              </Layout>
            } />

            <Route path="/contests/soonest" element={
              <Layout>
                <Home />
              </Layout>
            } />

            <Route path="/contests/:contestId" element={
              <Layout>
                <ContestInside />
              </Layout>
            } />
           
            {/* Contest-specific routes */}
            <Route path="/contests/:contestId/register" element={
              <Layout>
                <RegisterNow />
              </Layout>
            } />
           
            <Route path="/contests/:contestId/edit" element={
              <Layout>
                <CreateContest />
              </Layout>
            } />
           
            <Route path="/contests/:contestId/problems/:problemIndex" element={
              <Layout>
                <ProblemInside />
              </Layout>
            } />
           
            <Route path="/contests/:contestId/submissions" element={
              <Layout>
                <MySubmissions />
              </Layout>
            } />
            <Route path="/contests/:contestId/discussion" element={
              <Layout>
                <ContestDiscussion />
              </Layout>
            } />
            <Route path="/contests/:contestId/clarifications" element={
              <Layout>
                <ContestClarification />
              </Layout>
            } />
            
            <Route path="/contests/:contestId/standings" element={
              <Layout>
                <ContestLeaderboard />
              </Layout>
            } />
           
            <Route path="/contests/:contestId/editorial" element={<ContestEditorial />} />
            
            <Route path="/contests/:contestId/recordings" element={
              <Layout>
                <Recording />
              </Layout>
            } />
            
            <Route path="/contests/:contestId/recordings/user/:userId" element={
              <Layout>
                <Recording />
              </Layout>
            } />
            
            {/* General contest route */}
            <Route path="/contests/:contestId" element={
              <Layout>
                <ContestInside />
              </Layout>
            } />
            
            {/* External contest detail route */}
            <Route path="/external-contests/:contestId" element={
              <Layout>
                <ExternalContestDetail />
              </Layout>
            } />
           
            <Route path="/contests" element={
              <ProtectedRoute>
                <Layout>
                  <Contests />
                </Layout>
              </ProtectedRoute>
            } />
           
            <Route path="/create-contest" element={
              <Layout>
                <CreateContest />
              </Layout>
            } />



            <Route path="/test-contests/:testContestId/problems" element={
              <TestContestInside />
              } />

            <Route path="/test-contests/:testContestId/problems/:problemIndex" 
            element={
            <TestContestProblemDetail />
            } />


            <Route path="/contests/:contestId/virtual/:virtualContestId" element={
              <VirtualContestInside />
              } />
            <Route path="/contests/:contestId/virtual/:virtualContestId/problems/:problemIndex" element={
              <VirtualProblem />
              } />

            {/* <Route path="/virtual/:virtualContestId/submissions" element={<VirtualContestSubmissions />} />

            <Route path="/virtual/:virtualContestId/leaderboard" element={<VirtualContestLeaderboard />} />
            
            <Route path="/virtual/:virtualContestId/stats" element={<VirtualContestStats />} /> */}
          
            <Route path="/practice" element={
              <Layout>
                <Practice />
              </Layout>
            } />
           
            <Route path="/leaderboard" element={
              <Layout>
                <Leaderboard />
              </Layout>
            } />
           
           <Route path="/account/profile/:user_id/" element={<Profile />} />
           
           
            <Route path="/community" element={
              <Layout>
                <Community />
              </Layout>
            } />
           
            {/* Pages with Header, NavigationBar and Footer */}
            <Route path="/blog" element={
              <NavLayout>
                <Blog />
              </NavLayout>
            } />

            <Route path="/blog/:id" element={
              <NavLayout>
                <BlogDetail />
              </NavLayout>
            } />
            
            <Route path="/dashboard" element={
              <NavLayout>
                <Dashboard />
              </NavLayout>
            } />

            <Route path="/user/:userId" element={
              <NavLayout>
                <PublicDashboard />
              </NavLayout>
            } />
           
            <Route path="/create-blog" element={
              <NavLayout>
                <CreateBlog />
              </NavLayout>
            } />
           
            <Route path="/submissions" element={
              <NavLayout>
                <Submissions />
              </NavLayout>
            } />

            <Route path="/contest-history" element={
              <NavLayout>
                <ContestHistory />
              </NavLayout>
            } />
           
            <Route path="/interview" element={
              <NavLayout>
                <Interview />
              </NavLayout>
            } />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}
export default App;
