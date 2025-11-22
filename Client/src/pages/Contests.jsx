import React from 'react';
import { Link } from 'react-router-dom';
import ContestCard from '../components/ContestCard';
import { useContests } from '../hooks/useContests';
import Sidebar from '../components/Sidebar';

const Contests = () => {
  const { contests, loading } = useContests();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contests;