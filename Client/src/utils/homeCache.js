/**
 * homeCache.js
 * Cache helpers for Home Dashboard with immediate cache updates on mutations.
 * 
 * Cache structure:
 *   home_dashboard_cache: {
 *     upcoming_contests: [...],
 *     live_contests: [...],
 *     past_contests: [...],
 *     blogs: [...],
 *     announcements: [...],
 *     leaderboard: [...],
 *     contributions: [...],
 *     soonest_contest: {...},
 *     registered_contest_ids: [...]
 *   }
 */

import { expireCache, clearCache, writeCache, readStale } from './pageCache';

export const CACHE_KEY = 'home_dashboard_cache';
export const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Expire the home dashboard cache - next visit will background refresh
 */
export const expireHomeCache = () => expireCache(CACHE_KEY);

/**
 * Clear the home dashboard cache entirely
 */
export const clearHomeCache = () => clearCache(CACHE_KEY);

/**
 * Read current home dashboard cache
 */
export const readHomeCache = () => readStale(CACHE_KEY);

/**
 * Update a specific section of the home cache
 */
export const patchHomeCache = (section, data) => {
  try {
    const cached = readHomeCache();
    if (!cached) {
      expireHomeCache();
      return;
    }
    cached[section] = data;
    writeCache(CACHE_KEY, cached);
  } catch (_) {
    expireHomeCache();
  }
};

/**
 * Add a blog to the home cache blogs list
 */
export const prependBlogToHomeCache = (blog) => {
  try {
    const cached = readHomeCache();
    if (!cached || !Array.isArray(cached.blogs)) {
      expireHomeCache();
      return;
    }
    // Keep only top 3 blogs
    cached.blogs = [blog, ...cached.blogs].slice(0, 3);
    writeCache(CACHE_KEY, cached);
    expireHomeCache(); // Expire so it refreshes from server
  } catch (_) {
    expireHomeCache();
  }
};

/**
 * Remove a blog from home cache by ID
 */
export const removeBlogFromHomeCache = (blogId) => {
  try {
    const cached = readHomeCache();
    if (!cached || !Array.isArray(cached.blogs)) {
      expireHomeCache();
      return;
    }
    cached.blogs = cached.blogs.filter(b => b.id !== blogId);
    writeCache(CACHE_KEY, cached);
    expireHomeCache();
  } catch (_) {
    expireHomeCache();
  }
};

/**
 * Update a contest's registration status in home cache
 */
export const patchContestRegistration = (contestId) => {
  try {
    const cached = readHomeCache();
    if (!cached) {
      expireHomeCache();
      return;
    }

    // Add to registered list
    const regIds = cached.registered_contest_ids || [];
    if (!regIds.includes(contestId)) {
      cached.registered_contest_ids = [...regIds, contestId];
    }

    // Update is_registered flag in all contest lists
    ['upcoming_contests', 'live_contests', 'past_contests'].forEach(list => {
      if (Array.isArray(cached[list])) {
        cached[list] = cached[list].map(c =>
          c.id === contestId ? { ...c, is_registered: true } : c
        );
      }
    });

    // Update soonest contest if matching
    if (cached.soonest_contest && cached.soonest_contest.contest_id === contestId) {
      cached.soonest_contest.is_registered = true;
    }

    writeCache(CACHE_KEY, cached);
  } catch (_) {
    expireHomeCache();
  }
};

/**
 * Add a new contest to home cache
 */
export const addContestToHomeCache = (contest) => {
  try {
    const cached = readHomeCache();
    if (!cached) {
      expireHomeCache();
      return;
    }

    const status = contest.status || 'upcoming';
    const listKey = status === 'live' ? 'live_contests' 
                  : status === 'past' ? 'past_contests' 
                  : 'upcoming_contests';

    if (Array.isArray(cached[listKey])) {
      cached[listKey] = [contest, ...cached[listKey]].slice(0, 5);
    }

    writeCache(CACHE_KEY, cached);
    expireHomeCache();
  } catch (_) {
    expireHomeCache();
  }
};
