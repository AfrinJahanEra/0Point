import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
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
import VirtualContestInside from './pages/VirtualContestInside';
import VirtualProblem from './pages/VirtualProblem';
import TestContestInside from './pages/TestContestInside';
import TestContestProblemDetail from './pages/TestContestProblemDetail';
import TestContestLeaderboard  from './pages/TestContestLeaderboard';
import TestContestSubmission from './pages/TestContestSubmission';
import BlogDetail from './pages/BlogDetail';
// Layout component that includes Header and Footer only
const Layout = ({ children }) => (
  <>
    <Header />
    <main className="flex-grow">
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
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
  </>
);
// Full-screen layout (no header/footer)
const FullScreenLayout = ({ children }) => (
  <main className="flex-grow">
    {children}
  </main>
);
function App() {
  return (
    <AppProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
           
            {/* Visualizer and InterviewSession take full screen without Header and Footer */}
            <Route path="/visualizer" element={<Visualizer />} />
            <Route path="/interview-room/:sessionId" element={<InterviewSession />} />  {/* Updated dynamic route */}
           
            {/* Pages with Header and Footer only */}
            <Route path="/home" element={
              <Layout>
                <Home />
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
           
            {/* General contest route */}
            <Route path="/contests/:contestId" element={
              <Layout>
                <ContestInside />
              </Layout>
            } />
           
            <Route path="/contests" element={
              <Layout>
                <Contests />
              </Layout>
            } />
           
            <Route path="/create-contest" element={
              <Layout>
                <CreateContest />
              </Layout>
            } />

            <Route path="/test-contests/:testContestId/standings" 
            element={
              <Layout>
                <TestContestLeaderboard />
              </Layout>
            } />

            <Route path="/test-contests/:testContestId/submissions" 
            element={
              <Layout>
                <TestContestSubmission />
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
