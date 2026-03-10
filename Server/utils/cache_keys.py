"""
cache_keys.py
Centralised cache-key helpers for the whole project.

Usage:
    from utils.cache_keys import CK, invalidate_contest, invalidate_blog_list

Every key is prefixed with 'zp:' (set via settings.KEY_PREFIX).
All TTLs are in seconds.
"""
from django.core.cache import cache


# ─── TTLs ─────────────────────────────────────────────────────────────────────
TTL_CONTEST_LIST     = 30    # 30 s  - contest list (changes often)
TTL_CONTEST_DETAIL   = 60    # 60 s  - single contest detail
TTL_CONTEST_INSIDE   = 30    # 30 s  - contest inside (problems + announcements)
TTL_CONTEST_PROBLEMS = 30    # 30 s  - problems list for a contest
TTL_CONTEST_PROBLEM  = 60    # 60 s  - single problem detail
TTL_BLOG_LIST        = 60    # 60 s
TTL_BLOG_DETAIL      = 120   # 2 min
TTL_BLOG_COMMENTS    = 300   # 5 min - comments don't change often
TTL_ANNOUNCEMENT     = 30    # 30 s
TTL_DISCUSSION_LIST  = 30    # 30 s
TTL_LEADERBOARD      = 20    # 20 s  - leaderboard changes frequently during live


# ─── Key builders ─────────────────────────────────────────────────────────────
class CK:
    """Cache Key factory - returns the string key for a given resource."""

    # Contests
    @staticmethod
    def contest_list():
        return 'contests_dashboard_public'

    @staticmethod
    def contest_drafts(user_id):
        return f'contests_drafts_v2_{user_id}'

    @staticmethod
    def contest_detail(contest_id):
        return f'contest_detail_{contest_id}'

    @staticmethod
    def contest_inside(contest_id):
        return f'contest_inside_pub_{contest_id}'

    @staticmethod
    def contest_problems(contest_id):
        return f'contest_problems_pub_{contest_id}'

    @staticmethod
    def contest_problem(contest_id, problem_index):
        return f'contest_problem_pub_{contest_id}_{problem_index.upper()}'

    @staticmethod
    def contest_registration(contest_id, user_id):
        return f'contest_reg_{contest_id}_{user_id}'

    # Blog
    @staticmethod
    def blog_list():
        return 'blog_published_list'

    @staticmethod
    def blog_detail(blog_id):
        return f'blog_detail_{blog_id}'

    @staticmethod
    def blog_comments(blog_id):
        return f'blog_comments_{blog_id}'

    # Announcements
    @staticmethod
    def announcements(contest_id):
        return f'announcements_{contest_id}'

    @staticmethod
    def platform_announcements():
        return 'platform_announcements'

    # Discussions
    @staticmethod
    def discussion_list(contest_id):
        return f'discussions_{contest_id}'

    # Leaderboard
    @staticmethod
    def leaderboard(contest_id):
        return f'leaderboard_{contest_id}'

    # Home Dashboard
    @staticmethod
    def home_dashboard():
        return 'home_dashboard_public'

    @staticmethod
    def home_user_registrations(user_id):
        return f'home_reg_{user_id}'

    # Admin Dashboard
    @staticmethod
    def admin_stats():
        return 'zp:admin_stats'

    @staticmethod
    def admin_users_list(limit=50):
        return f'zp:admin_users_list_{limit}'

    @staticmethod
    def admin_blogs():
        return 'zp:admin_blogs_v2'

    @staticmethod
    def admin_banned():
        return 'zp:admin_banned_list'

    @staticmethod
    def admin_reports():
        return 'admin_reports'


# ─── Invalidation helpers ─────────────────────────────────────────────────────

def invalidate_contest(contest_id, user_id=None):
    """
    Wipe all caches related to a specific contest.
    Call this after any contest mutation (update, publish, delete).
    """
    keys = [
        CK.contest_list(),
        CK.contest_detail(contest_id),
        CK.contest_inside(contest_id),
        CK.contest_problems(contest_id),
        CK.announcements(contest_id),
        CK.leaderboard(contest_id),
    ]
    if user_id:
        keys.append(CK.contest_drafts(user_id))
    try:
        cache.delete_many(keys)
    except Exception:
        pass


def invalidate_contest_problem(contest_id, problem_index):
    """Wipe caches for a specific problem within a contest."""
    keys = [
        CK.contest_inside(contest_id),
        CK.contest_problems(contest_id),
        CK.contest_problem(contest_id, problem_index),
    ]
    try:
        cache.delete_many(keys)
    except Exception:
        pass


def invalidate_blog_list():
    """Wipe the published blog list cache."""
    try:
        cache.delete(CK.blog_list())
    except Exception:
        pass


def invalidate_blog_comments(blog_id):
    """Wipe the blog comments cache for a specific blog."""
    try:
        cache.delete(CK.blog_comments(blog_id))
    except Exception:
        pass


def invalidate_announcements(contest_id=None):
    """Wipe announcement cache for a contest (or platform-wide)."""
    try:
        if contest_id:
            cache.delete_many([
                CK.announcements(contest_id),
                CK.contest_inside(contest_id),  # inside view embeds announcements
            ])
        else:
            cache.delete(CK.platform_announcements())
    except Exception:
        pass


def invalidate_discussions(contest_id):
    """Wipe discussion list cache for a contest."""
    try:
        cache.delete(CK.discussion_list(contest_id))
    except Exception:
        pass


def invalidate_leaderboard(contest_id):
    """Wipe leaderboard cache for a contest."""
    try:
        cache.delete(CK.leaderboard(contest_id))
    except Exception:
        pass


def invalidate_home_dashboard():
    """Wipe the home dashboard public cache."""
    try:
        cache.delete(CK.home_dashboard())
    except Exception:
        pass


def invalidate_admin_blogs():
    """Wipe the admin blogs list cache."""
    try:
        # Delete all possible admin blog cache keys
        keys = [
            CK.admin_blogs(),
            'zp:admin_blogs_v2_50',
            'zp:admin_blogs_v2_100',
            'zp:admin_blogs_v2_200',
        ]
        cache.delete_many(keys)
    except Exception:
        pass


def invalidate_admin_users():
    """Wipe the admin users list cache."""
    try:
        keys = [
            CK.admin_stats(),
            CK.admin_users_list(50),
            CK.admin_users_list(100),
            CK.admin_users_list(200),
            CK.admin_banned(),
        ]
        cache.delete_many(keys)
    except Exception:
        pass


def invalidate_admin_reports():
    """Wipe the admin reports cache."""
    try:
        cache.delete(CK.admin_reports())
    except Exception:
        pass

