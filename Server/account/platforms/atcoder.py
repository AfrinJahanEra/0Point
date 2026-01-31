"""
AtCoder API integration
"""
import requests


def fetch_rating(handle):
    """Fetch rating from AtCoder API"""
    try:
        response = requests.get(f"https://atcoder.jp/api/v2/user/{handle}", timeout=5)
        if response.status_code != 200:
            raise Exception(f"AtCoder API error: {response.status_code}")
        
        data = response.json()['result']
        
        # Get contest history
        response = requests.get(f"https://atcoder.jp/api/v2/user/{handle}/history", timeout=5)
        rating_history = []
        
        if response.status_code == 200:
            history_data = response.json()['result']
            for entry in history_data:
                rating_history.append({
                    "date": entry['ended_at'][:10],
                    "rating": entry['new_rating']
                })
        
        return {
            "current_rating": data.get('rating', 0),
            "max_rating": data.get('highest_rating', 0),
            "min_rating": data.get('lowest_rating', 0),
            "contests_count": data.get('contests', 0),
            "rank": str(data.get('rank', 'N/A')),
            "badge": '',
            "rating_history": rating_history
        }
    except Exception as e:
        raise Exception(f"Failed to fetch AtCoder data: {str(e)}")


def fetch_contests(handle):
    """Fetch contest history from AtCoder"""
    contests = []
    try:
        response = requests.get(f"https://atcoder.jp/api/v2/user/{handle}/history", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('result'):
                for entry in data['result']:
                    contests.append({
                        "id": f"ac-{entry.get('contest_id')}",
                        "title": entry.get('contest_name'),
                        "date": entry.get('ended_at')[:10] if entry.get('ended_at') else None,
                        "datetime": entry.get('ended_at'),
                        "rank": entry.get('rank', '-'),
                        "solved": entry.get('problems_solved', 0),
                        "rating": entry.get('new_rating', 0),
                        "platform": "atcoder",
                        "status": "finished",
                        "type": "rated" if entry.get('is_rated') else "unrated"
                    })
    except Exception:
        pass
    return contests
