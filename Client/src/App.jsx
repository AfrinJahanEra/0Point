import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Contests from './pages/Contests';
import Practice from './pages/Practice';
import Visualizer from './pages/Visualizer';
import Leaderboard from './pages/Leaderboard';
import Blog from './pages/Blog';
import Dashboard from './pages/Dashboard';

// Layout component that includes Header and Footer
const Layout = ({ children }) => (
  <>
    <Header />
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
          <Routes>
            {/* Landing page without Header and Footer */}
            <Route path="/" element={<Landing />} />
            
            {/* Login and Register pages without Header and Footer */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* All other pages with Header and Footer */}
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
            <Route path="/visualizer" element={
              <Layout>
                <Visualizer />
              </Layout>
            } />
            <Route path="/leaderboard" element={
              <Layout>
                <Leaderboard />
              </Layout>
            } />
            <Route path="/blog" element={
              <Layout>
                <Blog />
              </Layout>
            } />
            <Route path="/dashboard" element={
              <Layout>
                <Dashboard />
              </Layout>
            } />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;