"""
Platform module initialization - routes requests to correct platform handler
"""

from . import codeforces, atcoder, leetcode, codechef


def fetch_platform_rating(platform, handle):
    """
    Fetch rating data from different coding platforms
    """
    if platform == "codeforces":
        return codeforces.fetch_rating(handle)
    elif platform == "codechef":
        return codechef.fetch_rating(handle)
    elif platform == "atcoder":
        return atcoder.fetch_rating(handle)
    elif platform == "leetcode":
        return leetcode.fetch_rating(handle)
    else:
        raise ValueError(f"Unsupported platform: {platform}")


def fetch_codeforces_contests(handle):
    """Fetch Codeforces contest history"""
    return codeforces.fetch_contests(handle)


def fetch_atcoder_contests(handle):
    """Fetch AtCoder contest history"""
    return atcoder.fetch_contests(handle)


def fetch_leetcode_contests(handle):
    """Fetch LeetCode contest history"""
    return leetcode.fetch_contests(handle)


def fetch_codechef_contests(handle):
    """Fetch CodeChef contest history"""
    return codechef.fetch_contests(handle)
