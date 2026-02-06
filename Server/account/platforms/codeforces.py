"""
Codeforces API integration
"""
import requests
from datetime import datetime


def fetch_rating(handle):
    """Fetch rating from Codeforces API"""
    try:
        response = requests.get(f"https://codeforces.com/api/user.info?handles={handle}", timeout=5)
        if response.status_code != 200:
            raise Exception(f"Codeforces API error: {response.status_code}")
        
        data = response.json()
        if not data.get('result'):
            raise Exception("User not found on Codeforces")
        
        user_data = data['result'][0]
        
        # Get contest history for min/max and contests count
        response = requests.get(f"https://codeforces.com/api/user.rating?handle={handle}", timeout=5)
        rating_history = []
        contests_count = 0
        total_solved = 0
        min_rating = user_data.get('minRating', user_data.get('rating', 1500))
        max_rating = user_data.get('maxRating', user_data.get('rating', 1500))
        
        if response.status_code == 200:
            history_data = response.json()
            if history_data.get('result'):
                contests_count = len(history_data['result'])
                for entry in history_data['result']:
                    total_solved += entry.get('problemsSolved', 0)
                    dt = datetime.fromtimestamp(entry['ratingUpdateTimeSeconds'])
                    rating_history.append({
                        "date": dt.isoformat(),
                        "datetime": dt.isoformat(),
                        "rating": entry.get('newRating', 0),
                        "contest_name": entry.get('contestName', 'Unknown'),
                        "rank": entry.get('rank', '-'),
                        "solved": entry.get('problemsSolved', 0)
                    })
                min_rating = min(entry['newRating'] for entry in history_data['result'])
                max_rating = max(entry['newRating'] for entry in history_data['result'])
        
        return {
            "current_rating": user_data.get('rating', 1500),
            "max_rating": max_rating,
            "min_rating": min_rating,
            "contests_count": contests_count,
            "rank": user_data.get('rank', 'unrated'),
            "badge": user_data.get('rank', ''),
            "rating_history": rating_history,
            "solved": total_solved
        }
    except Exception as e:
        raise Exception(f"Failed to fetch Codeforces data: {str(e)}")


def fetch_contests(handle):
    """Fetch contest history from Codeforces"""
    contests = []
    try:
        response = requests.get(f"https://codeforces.com/api/user.rating?handle={handle}", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('result'):
                for entry in data['result']:
                    dt = datetime.fromtimestamp(entry.get('ratingUpdateTimeSeconds'))
                    contests.append({
                        "id": f"cf-{entry.get('contestId')}",
                        "title": entry.get('contestName'),
                        "date": dt.strftime('%Y-%m-%d'),
                        "datetime": dt.isoformat(),
                        "rank": entry.get('rank', '-'),
                        "solved": entry.get('problemsSolved', 0),
                        "rating": entry.get('newRating', 1500),
                        "platform": "codeforces",
                        "status": "finished",
                        "type": "rated"
                    })
    except Exception:
        pass
    return contests


def fetch_submissions(handle, limit=100):
    """
    Fetch recent submissions from Codeforces
    """
    submissions = []
    try:
        url = f"https://codeforces.com/api/user.status?handle={handle}&count={limit}"
        resp = requests.get(url, timeout=5)

        if resp.status_code != 200:
            return submissions

        data = resp.json()
        if data.get("status") != "OK":
            return submissions

        for sub in data.get("result", []):
            problem = sub.get("problem", {})
            contest_id = sub.get("contestId")

            submissions.append({
                "id": f"cf-{sub.get('id')}",
                "problem_code": f"{problem.get('contestId', '')}{problem.get('index', '')}",
                "problem_title": problem.get("name"),
                "contest_id": contest_id,
                "verdict": sub.get("verdict", "UNKNOWN"),
                "language": sub.get("programmingLanguage"),
                "execution_time": sub.get("timeConsumedMillis", 0),
                "memory": round(sub.get("memoryConsumedBytes", 0) / (1024 * 1024), 2),
                "submitted_at": datetime.fromtimestamp(sub.get("creationTimeSeconds")).isoformat(),
                "tag": problem.get("tags", []),
                "platform": "codeforces"

            })
    except Exception:
        pass

    return submissions
