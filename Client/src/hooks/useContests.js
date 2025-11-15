import { useState, useEffect } from 'react';
import { CONTESTS_DATA } from '../utils/constants';

export const useContests = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchContests = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setContests(CONTESTS_DATA);
      } catch (error) {
        console.error('Error fetching contests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  return { contests, loading };
};