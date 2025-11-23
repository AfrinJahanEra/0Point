import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
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
                background: '#1e40af', // Dark blue color
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
            
            {/* Pages with Header and Footer only */}
            <Route path="/home" element={
              <Layout>
                <Home />
              </Layout>
            } />
            <Route path="/contests" element={
              <Layout>
                <Contests />
              </Layout>
            } />
            <Route path="/practice" element={
              <Layout>
                <Practice />
              </Layout>
            } />
            {/* Visualizer takes full screen without Header and Footer */}
            <Route path="/visualizer" element={<Visualizer />} />
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
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;