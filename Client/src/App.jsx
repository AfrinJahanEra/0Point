import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import ProblemInside from './pages/ProblemInside';
import RegisterNow from './pages/RegisterNow';
import CreateContest from './pages/CreateContest'; // ADD THIS IMPORT
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
import Interview from './pages/Interview';
import InterviewSession from './pages/InterviewSession';
import ContestInside from './pages/ContestInside';
import MySubmissions from './pages/MySubmissions'; // Import MySubmissions page
import ContestLeaderboard from './pages/ContestLeaderboard';
import ContestEditorial from './pages/ContestEditorial';
import ContestDiscussion from './pages/ContestDiscussion';
import ContestClarification from './pages/ContestClarification';

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
            
            {/* Visualizer takes full screen without Header and Footer */}
            <Route path="/visualizer" element={<Visualizer />} />
            
            {/* Pages with Header and Footer only */}
            <Route path="/home" element={
              <Layout>
                <Home />
              </Layout>
            } />
            
            {/* REORDER: Contest-specific routes FIRST (more specific) */}
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
            
            {/* IMPORTANT FIX: Add these missing contest routes */}
            <Route path="/contests/:contestId/submissions" element={
              <Layout>
                <MySubmissions /> {/* Make sure this component exists */}
              </Layout>
            } />

            <Route path="/contests/:contestId/discussion" element={
              <Layout>
                <ContestDiscussion /> {/* Make sure this component exists */}
              </Layout>
            } />

            <Route path="/contests/:contestId/clarifications" element={
              <Layout>
                <ContestClarification /> {/* Make sure this component exists */}
              </Layout>
            } />
            
            <Route path="/contests/:contestId/leaderboard" element={
              <Layout>
                <ContestLeaderboard /> {/* Make sure this component exists */}
              </Layout>
            } />
            <Route path="/contests/:contestId/editorial" element={<ContestEditorial />} />
            
            {/* General contest route LAST (less specific) */}
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
            
            {/* Interview Session page (opens in new tab) */}
            <Route path="/interview-session" element={<InterviewSession />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}
export default App;