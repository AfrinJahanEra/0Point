/**
 * Surgical localStorage cache helpers for the contests dashboard.
 *
 * Instead of wiping the whole cache on every mutation, these functions
 * patch only the affected contest entry so all other contests stay cached.
 *
 * Cache shape (stored under CACHE_KEY):
 *   { contests: [...], registered_contests: [...] }
 *
 * Internally delegates to the universal pageCache helpers.
 */

import { readStale, writeCache, expireCache, clearCache, patchCache, removeFromCache, prependToCache } from './pageCache';

export const CACHE_KEY    = 'contests_dashboard_cache';
export const CACHE_TTL    = 30_000; // 30 seconds (matches backend Redis TTL)
const CACHE_TS_KEY        = CACHE_KEY + '_ts'; // handled internally by pageCache

/** Read the current cached payload, or null if missing/corrupt. */
const readCache = () => readStale(CACHE_KEY);

/**
 * Expire the cache timestamp only — next fetchData() will do a background
 * refresh but still shows stale data instantly (zero flicker).
 * Use this when a new contest was created (not yet in the cache list).
 */
export const expireContestsCache = () => expireCache(CACHE_KEY);

/**
 * Clear the cache entirely — removes both data and timestamp.
 * Use this when you want to force a fresh fetch with no stale data shown.
 */
export const clearContestsCache = () => clearCache(CACHE_KEY);

/**
 * Prepend a new contest to the front of the contests list in cache.
 * Use this after creating a new contest so it shows immediately.
 * Also expires the cache so it refreshes from server in background.
 */
export const prependCachedContest = (contest) => {
  prependToCache(CACHE_KEY, 'contests', contest);
  // Expire timestamp so next page visit will refresh from server
  expireCache(CACHE_KEY);
};

/**
 * Patch a single contest entry in the cache by ID.
 * `updates` is a partial object merged into the existing entry.
 * If the contest doesn't exist in cache yet, falls back to expireContestsCache.
 */
export const patchCachedContest = (contestId, updates) => {
  patchCache(CACHE_KEY, 'contests', (c) => c.id === contestId, updates);
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

  writeCache(CACHE_KEY, data);
};

/**
 * Remove a contest from the cache (e.g. after publish — status changed).
 * Falls back to expireContestsCache if not found.
 */
export const removeCachedContest = (contestId) => {
  removeFromCache(CACHE_KEY, 'contests', (c) => c.id === contestId);
};
