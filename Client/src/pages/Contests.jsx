import React from 'react';
import { Link } from 'react-router-dom';
import ContestCard from '../components/ContestCard';
import { useContests } from '../hooks/useContests';

const Contests = () => {
  const { contests, loading } = useContests();

  return (
    <div className="container mx-auto px-4">
    </div>
  );
};

export default Contests;