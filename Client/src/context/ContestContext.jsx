import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ContestContext = createContext();

export const useContests = () => {
  const context = useContext(ContestContext);
  if (!context) {
    throw new Error('useContests must be used within ContestProvider');
  }
  return context;
};

export const ContestProvider = ({ children }) => {
  const [contestsCache, setContestsCache] = useState({
    upcoming: null,
    live: null,
    past: null,
    external: null,
    test: null,
    registrations: null
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Cache expiration time (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  const isCacheValid = () => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION;
  };

  const fetchAllContests = async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      console.log('♻️ Using cached contests data');
      return contestsCache;
    }

    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No authentication token found');
        setError('Authentication required');
        setLoading(false);
        return contestsCache;
      }

      console.log('📡 Fetching all contests data...');

      // Fetch all contest types in parallel with longer timeout
      const [upcomingRes, liveRes, pastRes, externalRes, testContestsRes, regRes] = await Promise.all([
        api.get('/contests/upcoming/', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ Upcoming contests error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: { contests: [] } };
        }),
        api.get('/contests/live/', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ Live contests error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: { contests: [] } };
        }),
        api.get('/contests/past/', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ Past contests error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: { contests: [] } };
        }),
        api.get('/external/contests/?platform=all', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ External contests error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: [] };
        }),
        api.get('/test-contests/my/', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ Test contests error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: { test_contests: [] } };
        }),
        api.get('/contests/registrations/', { timeout: 60000 }).then(res => res).catch(err => {
          console.error('❌ Registrations error:', err.message);
          console.error('Response:', err.response?.data);
          return { data: { registered_contests: [] } };
        })
      ]);

      console.log('📊 Raw responses:', {
        upcoming: upcomingRes?.data?.contests?.length || 0,
        live: liveRes?.data?.contests?.length || 0,
        past: pastRes?.data?.contests?.length || 0,
        external: externalRes?.data?.length || 0,
        test: testContestsRes?.data?.test_contests?.length || 0
      });

      // Process and cache the data
      const newCache = {
        upcoming: upcomingRes.data.contests || [],
        live: liveRes.data.contests || [],
        past: pastRes.data.contests || [],
        external: externalRes.data || [],
        test: testContestsRes.data.test_contests || [],
        registrations: regRes.data.registered_contests || []
      };

      setContestsCache(newCache);
      setLastFetched(Date.now());
      setLoading(false);

      console.log('✅ Contests data cached successfully');
      console.log('📊 Cache summary:', {
        upcoming: newCache.upcoming.length,
        live: newCache.live.length,
        past: newCache.past.length,
        external: newCache.external.length,
        test: newCache.test.length
      });

      return newCache;

    } catch (err) {
      console.error('❌ Error fetching contests:', err);
      setError(err.response?.data?.error || 'Failed to load contests');
      setLoading(false);
      return contestsCache;
    }
  };

  const getCombinedContests = () => {
    const { upcoming, live, past, external, test } = contestsCache;
    
    if (!upcoming || !live || !past || !external || !test) {
      return [];
    }

    // Combine all contests
    const regularContests = [...upcoming, ...live, ...past].filter(contest => 
      !contest.is_test_contest && contest.visibility !== 'test'
    );

    const testContests = test.map(c => ({
      ...c,
      is_test_contest: true,
      external: false
    }));

    const externalContests = external.map(contest => ({
      id: `external_${contest.platform}_${contest.external_id}`,
      title: contest.title,
      platform: contest.platform,
      status: contest.status === 'finished' ? 'past' : contest.status,
      start_time: contest.start_time,
      duration_seconds: contest.duration_seconds,
      duration_formatted: contest.duration_formatted,
      participants: contest.participants || 0,
      type: 'individual',
      is_external: true,
      external_url: contest.url,
      description: `External contest from ${getPlatformName(contest.platform)}`,
      external: true
    }));

    return [...regularContests, ...testContests, ...externalContests];
  };

  const getPlatformName = (p) => {
    const map = {
      'IUT': 'IUT Platform',
      'cf': 'Codeforces',
      'lc': 'LeetCode',
      'cc': 'CodeChef',
      'codechef': 'CodeChef',
      'ac': 'AtCoder',
      'atcoder': 'AtCoder',
      'hackerrank': 'HackerRank',
      'leetcode': 'LeetCode',
    };
    return map[p] || p || 'Unknown';
  };

  const value = {
    contestsCache,
    loading,
    error,
    fetchAllContests,
    getCombinedContests,
    isCacheValid,
    lastFetched
  };

  return (
    <ContestContext.Provider value={value}>
      {children}
    </ContestContext.Provider>
  );
};
