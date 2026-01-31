"""
CodeChef API integration
"""
import requests


def fetch_rating(handle):
    """Fetch rating from CodeChef API"""
    try:
        # CodeChef doesn't have a free public API, so we'll use a workaround
        response = requests.get(f"https://codechef.com/api/user/{handle}", timeout=5)
        if response.status_code != 200:
            raise Exception(f"CodeChef API error: {response.status_code}")
        
        data = response.json()
        
        return {
            "current_rating": data.get('rating', 1500),
            "max_rating": data.get('rating', 1500),
            "min_rating": data.get('rating', 1500),
            "contests_count": data.get('contests_count', 0),
            "rank": data.get('global_rank', None),
            "badge": '',
            "rating_history": []
        }
    except Exception as e:
        raise Exception(f"Failed to fetch CodeChef data: {str(e)}")


def fetch_contests(handle):
    """Fetch contest history from CodeChef"""
    # CodeChef API doesn't provide contest history easily
    return []
