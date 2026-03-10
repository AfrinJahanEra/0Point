/**
 * adminCache.js
 * Cache helpers for Admin Dashboard with immediate cache updates on mutations.
 * 
 * Cache structure:
 *   admin_stats: { users: {...}, blogs: {...}, ... }
 *   admin_users: [...]
 *   admin_blogs_v2: [...]
 *   admin_banned: [...]
 */

import { expireCache, clearCache, removeFromCache, patchCache } from './pageCache';

// Cache keys matching AdminDashboard.jsx
export const CACHE_KEYS = {
  STATS: 'admin_stats',
  USERS: 'admin_users',
  BLOGS: 'admin_blogs_v2',
  BANNED: 'admin_banned',
  REPORTS: 'admin_reports',
  CONTESTS: 'admin_contests_v3',
  PROBLEMS: 'admin_problems_v3',
};

const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Expire all admin caches - forces fresh fetch on next load
 */
export const expireAllAdminCaches = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    expireCache(key);
  });
};

/**
 * Clear all admin caches - removes data and timestamps
 */
export const clearAllAdminCaches = () => {
  Object.values(CACHE_KEYS).forEach(key => {
    clearCache(key);
  });
};

/**
 * Expire the admin stats cache
 */
export const expireAdminStats = () => expireCache(CACHE_KEYS.STATS);

/**
 * Expire the admin users cache
 */
export const expireAdminUsers = () => expireCache(CACHE_KEYS.USERS);

/**
 * Expire the admin blogs cache
 */
export const expireAdminBlogs = () => expireCache(CACHE_KEYS.BLOGS);

/**
 * Expire the admin banned users cache
 */
export const expireAdminBanned = () => expireCache(CACHE_KEYS.BANNED);

/**
 * Expire the admin reports cache
 */
export const expireAdminReports = () => expireCache(CACHE_KEYS.REPORTS);

/**
 * Remove a user from the admin users cache
 */
export const removeUserFromCache = (userId) => {
  removeFromCache(CACHE_KEYS.USERS, null, (user) => user.id === userId);
};

/**
 * Remove a blog from the admin blogs cache
 */
export const removeBlogFromCache = (blogId) => {
  removeFromCache(CACHE_KEYS.BLOGS, null, (blog) => blog.id === blogId);
};

/**
 * Patch admin stats cache (e.g., after banning a user)
 */
export const patchAdminStats = (updates) => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.STATS);
    if (!raw) return;
    const stats = JSON.parse(raw);
    const newStats = { ...stats, ...updates };
    localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(newStats));
  } catch (_) {
    expireAdminStats();
  }
};

/**
 * Update user count in stats after ban
 */
export const decrementUserCount = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.STATS);
    if (!raw) return;
    const stats = JSON.parse(raw);
    if (stats.users) {
      stats.users.total = Math.max(0, (stats.users.total || 0) - 1);
      stats.users.banned = (stats.users.banned || 0) + 1;
    }
    localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(stats));
  } catch (_) {
    expireAdminStats();
  }
};

/**
 * Update blog count in stats after deletion
 */
export const decrementBlogCount = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.STATS);
    if (!raw) return;
    const stats = JSON.parse(raw);
    if (stats.blogs) {
      stats.blogs.total = Math.max(0, (stats.blogs.total || 0) - 1);
    }
    localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(stats));
  } catch (_) {
    expireAdminStats();
  }
};
