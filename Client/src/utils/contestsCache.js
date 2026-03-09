/**
 * Surgical localStorage cache helpers for the contests dashboard.
 *
 * Instead of wiping the whole cache on every mutation, these functions
 * patch only the affected contest entry so all other contests stay cached.
 *
 * Cache shape (stored under CACHE_KEY):
 *   { contests: [...], registered_contests: [...] }
 */

const CACHE_KEY    = 'contests_dashboard_cache';
const CACHE_TS_KEY = 'contests_dashboard_cache_ts';

/** Read the current cached payload, or null if missing/corrupt. */
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

/** Write back a (possibly modified) payload and refresh the timestamp. */
const writeCache = (payload) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (_) {}
};

/**
 * Expire the cache timestamp only — next fetchData() will do a background
 * refresh but still shows stale data instantly (zero flicker).
 * Use this when a new contest was created (not yet in the cache list).
 */
export const expireContestsCache = () => {
  try {
    localStorage.removeItem(CACHE_TS_KEY); // age = Infinity → triggers re-fetch
  } catch (_) {}
};

/**
 * Patch a single contest entry in the cache by ID.
 * `updates` is a partial object merged into the existing entry.
 * If the contest doesn't exist in cache yet, falls back to expireContestsCache.
 */
export const patchCachedContest = (contestId, updates) => {
  const data = readCache();
  if (!data || !Array.isArray(data.contests)) {
    expireContestsCache();
    return;
  }
  const idx = data.contests.findIndex(c => c.id === contestId);
  if (idx === -1) {
    // New contest — not in cache yet, just trigger a fresh fetch
    expireContestsCache();
    return;
  }
  data.contests[idx] = { ...data.contests[idx], ...updates };
  writeCache(data);
};

/**
 * Mark a contest as registered in the cache.
 * Adds contestId to registered_contests array and sets is_registered on the entry.
 */
export const patchCachedRegistration = (contestId) => {
  const data = readCache();
  if (!data) {
    expireContestsCache();
    return;
  }

  // Patch registered_contests list
  const regList = data.registered_contests || [];
  if (!regList.includes(contestId)) {
    data.registered_contests = [...regList, contestId];
  }

  // Patch the contest entry itself
  if (Array.isArray(data.contests)) {
    const idx = data.contests.findIndex(c => c.id === contestId);
    if (idx !== -1) {
      data.contests[idx] = { ...data.contests[idx], is_registered: true };
    }
  }

  writeCache(data);
};

/**
 * Remove a contest from the cache (e.g. after publish — status changed).
 * Falls back to expireContestsCache if not found.
 */
export const removeCachedContest = (contestId) => {
  const data = readCache();
  if (!data || !Array.isArray(data.contests)) {
    expireContestsCache();
    return;
  }
  data.contests = data.contests.filter(c => c.id !== contestId);
  writeCache(data);
};
