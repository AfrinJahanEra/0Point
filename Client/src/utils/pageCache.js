/**
 * pageCache.js
 * Universal localStorage stale-while-revalidate cache for any page/endpoint.
 *
 * Strategy:
 *   READ  → return cached data instantly (zero flicker), then re-fetch in background
 *   WRITE → immediately invalidate or patch the cache, then the backend also
 *           invalidates Redis — so the *next* GET returns fresh data from DB
 *
 * Usage:
 *   import { readCache, writeCache, expireCache, patchCache } from './pageCache';
 *
 *   const CACHE_KEY = 'my_page_cache';
 *   const CACHE_TTL = 60_000; // 60 seconds
 *
 *   // On page load: serve stale immediately, background-refresh if stale
 *   const cached = readCache(CACHE_KEY, CACHE_TTL);
 *   if (cached) setData(cached);          // show instantly
 *   fetchFresh().then(data => {
 *     setData(data);
 *     writeCache(CACHE_KEY, data);
 *   });
 *
 *   // After POST/PUT/DELETE: expire cache so next visit re-fetches
 *   expireCache(CACHE_KEY);
 */

const TS_SUFFIX = '_ts';

/**
 * Read cached payload. Returns null if missing, corrupt, or older than ttlMs.
 * @param {string} key   - localStorage key
 * @param {number} ttlMs - max age in milliseconds (default 60 s)
 */
export const readCache = (key, ttlMs = 60_000) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const ts = parseInt(localStorage.getItem(key + TS_SUFFIX) || '0', 10);
    const age = Date.now() - ts;

    // If expired, return null so caller knows a fresh fetch is needed
    if (age > ttlMs) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Read stale data regardless of TTL (for stale-while-revalidate pattern).
 * Returns null only if missing / corrupt.
 */
export const readStale = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Write payload to localStorage and refresh the timestamp.
 * @param {string} key     - localStorage key
 * @param {any}    payload - serialisable data
 */
export const writeCache = (key, payload) => {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    localStorage.setItem(key + TS_SUFFIX, String(Date.now()));
  } catch {
    // Quota exceeded — silently ignore
  }
};

/**
 * Expire the timestamp only — cached data is kept so readStale still works.
 * The next readCache() call will return null → triggers a fresh fetch.
 * This is the correct call after POST / PUT / DELETE.
 * @param {string} key
 */
export const expireCache = (key) => {
  try {
    localStorage.removeItem(key + TS_SUFFIX);
  } catch {}
};

/**
 * Hard-delete both the payload and the timestamp.
 * Use this when the data is definitely stale (e.g. after logout).
 * @param {string} key
 */
export const clearCache = (key) => {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(key + TS_SUFFIX);
  } catch {}
};

/**
 * Patch a single item inside a cached array (e.g. update one contest in a list).
 * `matcher` is a function (item) => boolean — identifies the item to replace.
 * `updates` is an object merged into the matched item.
 * Falls back to expireCache if the item is not found.
 *
 * @param {string}   key      - localStorage key whose payload is an array or {arrayField: [...]}
 * @param {string}   [field]  - if payload is an object, the field that holds the array
 * @param {Function} matcher  - (item) => boolean
 * @param {object}   updates  - partial object to merge into the matched item
 */
export const patchCache = (key, field, matcher, updates) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { expireCache(key); return; }

    const payload = JSON.parse(raw);
    const arr = field ? payload[field] : payload;

    if (!Array.isArray(arr)) { expireCache(key); return; }

    const idx = arr.findIndex(matcher);
    if (idx === -1) { expireCache(key); return; }

    arr[idx] = { ...arr[idx], ...updates };

    writeCache(key, payload);
  } catch {
    expireCache(key);
  }
};

/**
 * Remove a single item from a cached array.
 * Falls back to expireCache if not found.
 *
 * @param {string}   key
 * @param {string}   [field]
 * @param {Function} matcher  - (item) => boolean — item to remove
 */
export const removeFromCache = (key, field, matcher) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { expireCache(key); return; }

    const payload = JSON.parse(raw);
    const arr = field ? payload[field] : payload;

    if (!Array.isArray(arr)) { expireCache(key); return; }

    const newArr = arr.filter((item) => !matcher(item));

    if (field) {
      payload[field] = newArr;
      writeCache(key, payload);
    } else {
      writeCache(key, newArr);
    }
  } catch {
    expireCache(key);
  }
};

/**
 * Prepend a new item to the front of a cached array.
 * Falls back to expireCache if cache is not an array.
 *
 * @param {string} key
 * @param {string} [field]
 * @param {any}    newItem
 */
export const prependToCache = (key, field, newItem) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { expireCache(key); return; }

    const payload = JSON.parse(raw);
    const arr = field ? payload[field] : payload;

    if (!Array.isArray(arr)) { expireCache(key); return; }

    const newArr = [newItem, ...arr];

    if (field) {
      payload[field] = newArr;
      writeCache(key, payload);
    } else {
      writeCache(key, newArr);
    }
  } catch {
    expireCache(key);
  }
};

// ─── Convenience: check whether cache is still fresh ─────────────────────────
export const isCacheFresh = (key, ttlMs = 60_000) => {
  try {
    const ts = parseInt(localStorage.getItem(key + TS_SUFFIX) || '0', 10);
    return Date.now() - ts < ttlMs;
  } catch {
    return false;
  }
};
