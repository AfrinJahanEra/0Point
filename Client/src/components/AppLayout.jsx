// components/AppLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Chatbot from './ChatBot';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet /> {/* This renders the current page */}
      <Chatbot /> {/* Chatbot appears on every page */}
    </div>
  );
};

export default AppLayout;
