"""
LeetCode API integration using alfa-leetcode-api
"""
import requests


def fetch_rating(handle):
    """Fetch rating from LeetCode using alfa-leetcode-api"""
    try:
        base_url = "https://alfa-leetcode-api.onrender.com"
        
        # Get user profile data
        profile_response = requests.get(
            f"{base_url}/{handle}",
            timeout=10
        )
        
        if profile_response.status_code != 200:
            raise Exception(f"LeetCode user not found: {profile_response.status_code}")
        
        profile_data = profile_response.json()
        
        # Get badges
        badge_name = ""
        try:
            badges_response = requests.get(
                f"{base_url}/{handle}/badges",
                timeout=10
            )
            if badges_response.status_code == 200:
                badges_data = badges_response.json()
                badge_list = badges_data.get('badges', [])
                if badge_list:
                    badge_name = badge_list[0].get('displayName', '')
        except Exception:
            pass
        
        # Get contest data and history
        contest_rating = 0
        contests_count = 0
        rating_history = []
        try:
            contest_response = requests.get(
                f"{base_url}/{handle}/contest",
                timeout=10
            )
            if contest_response.status_code == 200:
                contest_data = contest_response.json()
                contest_rating = contest_data.get('contestRating', 0)
                contests_count = contest_data.get('totalParticipated', 0)
                
                # Get contest history
                try:
                    history_response = requests.get(
                        f"{base_url}/{handle}/contest/history",
                        timeout=10
                    )
                    if history_response.status_code == 200:
                        history_data = history_response.json()
                        contests = history_data.get('contestHistory', [])
                        for contest in contests[::-1]:
                            rating_history.append({
                                "date": contest.get('date'),
                                "rating": contest.get('rating'),
                                "contest_name": contest.get('name'),
                                "rank": contest.get('rank'),
                                "solved": contest.get('problemsSolved', 0)
                            })
                except Exception:
                    pass
        except Exception:
            pass
        
        return {
            "current_rating": contest_rating,
            "max_rating": contest_rating if contest_rating > 0 else 0,
            "min_rating": 0,
            "contests_count": contests_count,
            "rank": profile_data.get('ranking', None),
            "badge": badge_name,
            "rating_history": rating_history,
            "solved": profile_data.get('problemsSolved', 0)
        }
    except Exception as e:
        raise Exception(f"Failed to fetch LeetCode data: {str(e)}")


def fetch_contests(handle):
    """Fetch contest history from LeetCode"""
    contests = []
    try:
        base_url = "https://alfa-leetcode-api.onrender.com"
        response = requests.get(
            f"{base_url}/{handle}/contest/history",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get('contestHistory'):
                for entry in data['contestHistory']:
                    # Parse date from contest data
                    contest_date = entry.get('date', '')
                    contests.append({
                        "id": f"lc-{entry.get('id', '')}",
                        "title": entry.get('name', 'Unknown'),
                        "date": contest_date,
                        "datetime": contest_date,
                        "rank": entry.get('rank', '-'),
                        "solved": entry.get('problemsSolved', 0),
                        "rating": entry.get('rating', 0),
                        "platform": "leetcode",
                        "status": "finished",
                        "type": "rated"
                    })
    except Exception:
        pass
    return contests
