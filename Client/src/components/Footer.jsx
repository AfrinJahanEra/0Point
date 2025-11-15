import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Code2, 
  ChevronRight, 
  Home, 
  Trophy, 
  Code, 
  Medal,
  Facebook,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 pt-12 pb-6">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">IUTCode</span>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Islamic University of Technology's premier platform for competitive programming and interview preparation.
            </p>
            <div className="flex gap-4">
              {[
                { icon: <Facebook className="w-4 h-4" />, platform: 'facebook' },
                { icon: <Twitter className="w-4 h-4" />, platform: 'twitter' },
                { icon: <Linkedin className="w-4 h-4" />, platform: 'linkedin' },
                { icon: <Github className="w-4 h-4" />, platform: 'github' }
              ].map((item) => (
                <a 
                  key={item.platform}
                  href="#" 
                  className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gradient-to-r from-blue-600 to-cyan-500 hover:text-white transition-all duration-300 hover:-translate-y-1"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { name: 'Home', icon: <Home className="w-4 h-4" /> },
                { name: 'Contests', icon: <Trophy className="w-4 h-4" /> },
                { name: 'Practice', icon: <Code className="w-4 h-4" /> },
                { name: 'Leaderboard', icon: <Medal className="w-4 h-4" /> }
              ].map((link) => (
                <li key={link.name}>
                  <Link 
                    to={`/${link.name.toLowerCase()}`} 
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              {['Tutorials', 'DSA Visualizer', 'AI Assistant', 'Contest Archive'].map((resource) => (
                <li key={resource}>
                  <a 
                    href="#" 
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {resource}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3">
              {['IUT Website', 'Support', 'Help Center', 'Report Issue'].map((contact) => (
                <li key={contact}>
                  <a 
                    href="#" 
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {contact}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm">
            &copy; {currentYear} IUTCode. All rights reserved. | Islamic University of Technology
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;