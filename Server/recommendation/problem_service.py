# Server/recommendation/problem_service.py
"""
Service to fetch real problems from Codeforces and LeetCode APIs
Returns actual problems with correct names, tags, difficulty, and links
"""

import requests
import random
from datetime import datetime, timedelta
from functools import lru_cache

CF_API_BASE = "https://codeforces.com/api"
LC_API_BASE = "https://alfa-leetcode-api.onrender.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Cache for problems list (expires after 1 hour)
_cf_problems_cache = {"data": None, "fetched_at": None}
_lc_problems_cache = {"data": None, "fetched_at": None}


def clear_problem_cache():
    """Clear the problem cache to force fresh fetch"""
    global _cf_problems_cache, _lc_problems_cache
    _cf_problems_cache = {"data": None, "fetched_at": None}
    _lc_problems_cache = {"data": None, "fetched_at": None}
    print("Problem cache cleared")


def get_codeforces_problems():
    """Fetch all Codeforces problems with tags and ratings"""
    global _cf_problems_cache
    
    # Check cache validity (1 hour)
    if _cf_problems_cache["data"] and _cf_problems_cache["fetched_at"]:
        if datetime.utcnow() - _cf_problems_cache["fetched_at"] < timedelta(hours=1):
            return _cf_problems_cache["data"]
    
    try:
        resp = requests.get(f"{CF_API_BASE}/problemset.problems", headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return _cf_problems_cache["data"] or []
        
        data = resp.json()
        if data.get("status") != "OK":
            return _cf_problems_cache["data"] or []
        
        problems = []
        for p in data.get("result", {}).get("problems", []):
            if p.get("rating"):  # Only include rated problems
                contest_id = p.get("contestId")
                index = p.get("index")
                
                # Get problem name - CF API uses "name" field
                problem_name = p.get("name") or p.get("title") or ""
                
                # Fallback: construct name from contest and index if empty
                if not problem_name:
                    problem_name = f"Problem {contest_id}{index}"
                
                problems.append({
                    "platform": "Codeforces",
                    "contest_id": contest_id,
                    "index": index,
                    "title": problem_name,
                    "rating": p.get("rating"),
                    "tags": p.get("tags", []),
                    "link": f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
                    "problem_id": f"cf_{contest_id}_{index}"
                })
        
        _cf_problems_cache["data"] = problems
        _cf_problems_cache["fetched_at"] = datetime.utcnow()
        print(f"Fetched {len(problems)} Codeforces problems")
        return problems
    except Exception as e:
        print(f"Error fetching CF problems: {e}")
        return _cf_problems_cache["data"] or []


def get_leetcode_problems():
    """Fetch LeetCode problems with difficulty using multiple API endpoints"""
    global _lc_problems_cache
    
    # Check cache validity (1 hour)
    if _lc_problems_cache["data"] and _lc_problems_cache["fetched_at"]:
        if datetime.utcnow() - _lc_problems_cache["fetched_at"] < timedelta(hours=1):
            return _lc_problems_cache["data"]
    
    problems = []
    
    # Try alfa-leetcode-api first
    try:
        resp = requests.get(f"{LC_API_BASE}/problems", headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            
            # Handle different response formats
            problem_list = []
            if isinstance(data, list):
                problem_list = data
            elif isinstance(data, dict):
                problem_list = data.get("problemsetQuestionList", []) or data.get("questions", []) or []
            
            for p in problem_list:
                title_slug = p.get("titleSlug") or p.get("slug") or p.get("title_slug")
                if not title_slug:
                    continue
                    
                difficulty = p.get("difficulty", "Medium")
                
                # Normalize difficulty from various formats
                if isinstance(difficulty, dict):
                    difficulty = difficulty.get("level", "Medium")
                if isinstance(difficulty, int) or str(difficulty).isdigit():
                    diff_num = int(difficulty)
                    difficulty = {1: "Easy", 2: "Medium", 3: "Hard"}.get(diff_num, "Medium")
                elif isinstance(difficulty, str):
                    diff_lower = difficulty.lower()
                    if "easy" in diff_lower:
                        difficulty = "Easy"
                    elif "hard" in diff_lower:
                        difficulty = "Hard"
                    else:
                        difficulty = "Medium"
                
                # Get tags
                tags = []
                raw_tags = p.get("topicTags", []) or p.get("tags", [])
                for tag in raw_tags:
                    if isinstance(tag, dict):
                        tags.append(tag.get("name", "") or tag.get("slug", ""))
                    elif isinstance(tag, str):
                        tags.append(tag)
                tags = [t for t in tags if t]  # Filter empty
                
                problems.append({
                    "platform": "LeetCode",
                    "title": p.get("title") or p.get("questionTitle") or title_slug.replace("-", " ").title(),
                    "title_slug": title_slug,
                    "difficulty": difficulty,
                    "tags": tags,
                    "link": f"https://leetcode.com/problems/{title_slug}/",
                    "problem_id": f"lc_{title_slug}",
                    "ac_rate": p.get("acRate", 0) or p.get("ac_rate", 0)
                })
    except Exception as e:
        print(f"Error fetching LC problems from alfa API: {e}")
    
    # Fallback: Use curated popular LeetCode problems if API fails
    if not problems:
        problems = get_curated_leetcode_problems()
    
    if problems:
        _lc_problems_cache["data"] = problems
        _lc_problems_cache["fetched_at"] = datetime.utcnow()
    
    return _lc_problems_cache["data"] or []


def get_curated_leetcode_problems():
    """Curated list of popular LeetCode problems as fallback"""
    curated = [
        # Easy
        {"title": "Two Sum", "title_slug": "two-sum", "difficulty": "Easy", "tags": ["Array", "Hash Table"]},
        {"title": "Valid Parentheses", "title_slug": "valid-parentheses", "difficulty": "Easy", "tags": ["String", "Stack"]},
        {"title": "Merge Two Sorted Lists", "title_slug": "merge-two-sorted-lists", "difficulty": "Easy", "tags": ["Linked List", "Recursion"]},
        {"title": "Best Time to Buy and Sell Stock", "title_slug": "best-time-to-buy-and-sell-stock", "difficulty": "Easy", "tags": ["Array", "Dynamic Programming"]},
        {"title": "Valid Palindrome", "title_slug": "valid-palindrome", "difficulty": "Easy", "tags": ["String", "Two Pointers"]},
        {"title": "Climbing Stairs", "title_slug": "climbing-stairs", "difficulty": "Easy", "tags": ["Math", "Dynamic Programming"]},
        {"title": "Maximum Subarray", "title_slug": "maximum-subarray", "difficulty": "Medium", "tags": ["Array", "Divide and Conquer", "Dynamic Programming"]},
        # Medium
        {"title": "Add Two Numbers", "title_slug": "add-two-numbers", "difficulty": "Medium", "tags": ["Linked List", "Math"]},
        {"title": "Longest Substring Without Repeating Characters", "title_slug": "longest-substring-without-repeating-characters", "difficulty": "Medium", "tags": ["String", "Sliding Window"]},
        {"title": "Container With Most Water", "title_slug": "container-with-most-water", "difficulty": "Medium", "tags": ["Array", "Two Pointers"]},
        {"title": "3Sum", "title_slug": "3sum", "difficulty": "Medium", "tags": ["Array", "Two Pointers", "Sorting"]},
        {"title": "Letter Combinations of a Phone Number", "title_slug": "letter-combinations-of-a-phone-number", "difficulty": "Medium", "tags": ["String", "Backtracking"]},
        {"title": "Generate Parentheses", "title_slug": "generate-parentheses", "difficulty": "Medium", "tags": ["String", "Dynamic Programming", "Backtracking"]},
        {"title": "Search in Rotated Sorted Array", "title_slug": "search-in-rotated-sorted-array", "difficulty": "Medium", "tags": ["Array", "Binary Search"]},
        {"title": "Group Anagrams", "title_slug": "group-anagrams", "difficulty": "Medium", "tags": ["Array", "String", "Hash Table"]},
        {"title": "Jump Game", "title_slug": "jump-game", "difficulty": "Medium", "tags": ["Array", "Greedy", "Dynamic Programming"]},
        {"title": "Unique Paths", "title_slug": "unique-paths", "difficulty": "Medium", "tags": ["Math", "Dynamic Programming"]},
        {"title": "Word Search", "title_slug": "word-search", "difficulty": "Medium", "tags": ["Array", "Backtracking", "Matrix"]},
        {"title": "Decode Ways", "title_slug": "decode-ways", "difficulty": "Medium", "tags": ["String", "Dynamic Programming"]},
        {"title": "Binary Tree Level Order Traversal", "title_slug": "binary-tree-level-order-traversal", "difficulty": "Medium", "tags": ["Tree", "BFS"]},
        {"title": "Coin Change", "title_slug": "coin-change", "difficulty": "Medium", "tags": ["Array", "Dynamic Programming"]},
        {"title": "Longest Increasing Subsequence", "title_slug": "longest-increasing-subsequence", "difficulty": "Medium", "tags": ["Array", "Binary Search", "Dynamic Programming"]},
        # Hard
        {"title": "Median of Two Sorted Arrays", "title_slug": "median-of-two-sorted-arrays", "difficulty": "Hard", "tags": ["Array", "Binary Search"]},
        {"title": "Regular Expression Matching", "title_slug": "regular-expression-matching", "difficulty": "Hard", "tags": ["String", "Dynamic Programming"]},
        {"title": "Merge k Sorted Lists", "title_slug": "merge-k-sorted-lists", "difficulty": "Hard", "tags": ["Linked List", "Heap"]},
        {"title": "Trapping Rain Water", "title_slug": "trapping-rain-water", "difficulty": "Hard", "tags": ["Array", "Two Pointers", "Stack"]},
        {"title": "Edit Distance", "title_slug": "edit-distance", "difficulty": "Hard", "tags": ["String", "Dynamic Programming"]},
        {"title": "Largest Rectangle in Histogram", "title_slug": "largest-rectangle-in-histogram", "difficulty": "Hard", "tags": ["Array", "Stack"]},
        {"title": "Word Ladder", "title_slug": "word-ladder", "difficulty": "Hard", "tags": ["String", "BFS"]},
        {"title": "Binary Tree Maximum Path Sum", "title_slug": "binary-tree-maximum-path-sum", "difficulty": "Hard", "tags": ["Tree", "Dynamic Programming"]},
    ]
    
    return [{
        "platform": "LeetCode",
        "title": p["title"],
        "title_slug": p["title_slug"],
        "difficulty": p["difficulty"],
        "tags": p["tags"],
        "link": f"https://leetcode.com/problems/{p['title_slug']}/",
        "problem_id": f"lc_{p['title_slug']}",
        "ac_rate": 0
    } for p in curated]


def get_user_solved_problems(user):
    """Get set of problem IDs the user has already solved"""
    solved = set()
    
    # Get solved from submission cache
    for cache in user.submission_cache:
        platform = cache.platform
        for sub in cache.submissions:
            verdict = sub.get("verdict", "").upper()
            if verdict in ["OK", "ACCEPTED", "AC"]:
                if platform == "codeforces":
                    contest_id = sub.get("contestId") or sub.get("contest_id")
                    index = sub.get("problem", {}).get("index") or sub.get("index")
                    if contest_id and index:
                        solved.add(f"cf_{contest_id}_{index}")
                elif platform == "leetcode":
                    slug = sub.get("titleSlug") or sub.get("slug")
                    if slug:
                        solved.add(f"lc_{slug}")
    
    return solved


def fetch_user_codeforces_solved(handle):
    """Fetch solved problems from Codeforces API"""
    solved = set()
    try:
        resp = requests.get(
            f"{CF_API_BASE}/user.status?handle={handle}&from=1&count=10000",
            headers=HEADERS, timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "OK":
                for sub in data.get("result", []):
                    if sub.get("verdict") == "OK":
                        problem = sub.get("problem", {})
                        contest_id = problem.get("contestId")
                        index = problem.get("index")
                        if contest_id and index:
                            solved.add(f"cf_{contest_id}_{index}")
    except Exception as e:
        print(f"Error fetching CF solved: {e}")
    return solved


def fetch_user_leetcode_solved(handle):
    """Fetch solved problems from LeetCode API"""
    solved = set()
    try:
        # Try to get submission list
        resp = requests.get(
            f"https://leetcode-api-pied.vercel.app/user/{handle}/submissions",
            headers=HEADERS, timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            for sub in data:
                if sub.get("statusDisplay") == "Accepted":
                    slug = sub.get("titleSlug")
                    if slug:
                        solved.add(f"lc_{slug}")
    except Exception as e:
        print(f"Error fetching LC solved: {e}")
    return solved


def get_all_user_solved(user):
    """Get all solved problems for a user from all platforms"""
    solved = get_user_solved_problems(user)
    
    # Fetch fresh data from APIs if handles exist
    cf_profile = user.get_platform_profile("codeforces")
    lc_profile = user.get_platform_profile("leetcode")
    
    if cf_profile and cf_profile.handle:
        cf_solved = fetch_user_codeforces_solved(cf_profile.handle)
        solved.update(cf_solved)
    
    if lc_profile and lc_profile.handle:
        lc_solved = fetch_user_leetcode_solved(lc_profile.handle)
        solved.update(lc_solved)
    
    return solved


def map_cf_rating_to_lc_difficulty(cf_rating):
    """Map Codeforces rating to LeetCode difficulty"""
    if cf_rating < 1200:
        return ["Easy"]
    elif cf_rating < 1600:
        return ["Easy", "Medium"]
    elif cf_rating < 2000:
        return ["Medium"]
    elif cf_rating < 2400:
        return ["Medium", "Hard"]
    else:
        return ["Hard"]


def get_recommended_cf_problems(user_rating, weak_tags, solved_ids, count=4):
    """Get Codeforces problems based on user rating and weak areas"""
    all_problems = get_codeforces_problems()
    if not all_problems:
        return []
    
    # Find max available rating in problems
    max_available_rating = max(p["rating"] for p in all_problems) if all_problems else 3500
    
    # For very high-rated users (>2800), show hardest unsolved problems
    if user_rating >= 2800:
        # Show problems from 2400 to max available (hardest problems)
        min_rating = 2400
        max_rating = max_available_rating + 100  # Include all high-rated problems
        print(f"High-rated user ({user_rating}): Looking for problems {min_rating}-{max_rating}")
    else:
        # Normal users: 100-350 above current rating
        min_rating = user_rating + 100
        max_rating = min(user_rating + 350, max_available_rating)
        
        # If range is too narrow, expand it
        if max_rating - min_rating < 100:
            min_rating = max(800, user_rating - 200)
            max_rating = user_rating + 200
        print(f"Normal user ({user_rating}): Looking for problems {min_rating}-{max_rating}")
    
    # Filter problems
    candidates = []
    for p in all_problems:
        # Skip solved problems
        if p["problem_id"] in solved_ids:
            continue
        
        # Check rating range
        if not (min_rating <= p["rating"] <= max_rating):
            continue
        
        # Calculate tag match score (higher is better for weak areas)
        tag_score = 0
        for tag in p["tags"]:
            tag_lower = tag.lower()
            for weak in weak_tags:
                if weak.lower() in tag_lower or tag_lower in weak.lower():
                    tag_score += 2
        
        candidates.append({**p, "tag_score": tag_score})
    
    # Sort by tag score (prioritize problems matching weak areas)
    candidates.sort(key=lambda x: x["tag_score"], reverse=True)
    
    # Select diverse problems (avoid too many similar tags)
    selected = []
    selected_tags = set()
    
    for prob in candidates:
        if len(selected) >= count:
            break
        
        # Check if this adds diversity
        prob_tags = set(t.lower() for t in prob["tags"])
        overlap = len(prob_tags & selected_tags)
        
        if overlap < 2 or len(selected) < 2:  # Allow some overlap but ensure diversity
            selected.append(prob)
            selected_tags.update(prob_tags)
    
    # If not enough selected, add more from candidates
    for prob in candidates:
        if len(selected) >= count:
            break
        if prob not in selected:
            selected.append(prob)
    
    return selected


def get_recommended_lc_problems(user_rating, weak_tags, solved_ids, count=2):
    """Get LeetCode problems based on user rating and weak areas"""
    all_problems = get_leetcode_problems()
    if not all_problems:
        return []
    
    # Map CF rating to LC difficulty
    target_difficulties = map_cf_rating_to_lc_difficulty(user_rating)
    
    # Filter problems
    candidates = []
    for p in all_problems:
        # Skip solved problems
        if p["problem_id"] in solved_ids:
            continue
        
        # Check difficulty
        if p["difficulty"] not in target_difficulties:
            continue
        
        # Calculate tag match score
        tag_score = 0
        prob_tags = []
        for tag in p.get("tags", []):
            if isinstance(tag, dict):
                tag_name = tag.get("name", "")
            else:
                tag_name = str(tag)
            prob_tags.append(tag_name)
            
            for weak in weak_tags:
                if weak.lower() in tag_name.lower() or tag_name.lower() in weak.lower():
                    tag_score += 2
        
        candidates.append({**p, "tag_score": tag_score, "tags": prob_tags})
    
    # Sort by tag score
    candidates.sort(key=lambda x: x["tag_score"], reverse=True)
    
    # Select diverse problems
    selected = []
    for prob in candidates:
        if len(selected) >= count:
            break
        selected.append(prob)
    
    return selected


def get_validated_recommendations(user, weak_categories=None, count=6):
    """
    Main function: Get validated problem recommendations based on user profile
    Returns real problems from Codeforces and LeetCode with correct data
    """
    print("=== Starting get_validated_recommendations ===")
    
    # Get user ratings
    cf_profile = user.get_platform_profile("codeforces")
    lc_profile = user.get_platform_profile("leetcode")
    
    cf_rating = cf_profile.current_rating if cf_profile else 1200
    print(f"User CF rating: {cf_rating}")
    
    # Get weak tags from categories
    weak_tags = []
    weak_category_names = []
    if weak_categories:
        for cat, data in weak_categories.items():
            weak_category_names.append(cat)
            if isinstance(data, dict):
                weak_tags.extend(data.get("tags", []))
                weak_tags.append(cat)
            else:
                weak_tags.append(cat)
    
    # If no weak tags, use common categories
    if not weak_tags:
        weak_tags = ["dp", "graphs", "binary search", "greedy", "math"]
        weak_category_names = ["Dynamic Programming", "Graphs", "Binary Search"]
    
    print(f"Weak tags: {weak_tags[:5]}")
    
    # Get all solved problems
    solved_ids = get_all_user_solved(user)
    print(f"User has solved {len(solved_ids)} problems")
    
    # Get recommendations from each platform
    cf_count = min(4, count)
    lc_count = count - cf_count
    
    print(f"Fetching {cf_count} CF problems and {lc_count} LC problems...")
    
    cf_problems = get_recommended_cf_problems(cf_rating, weak_tags, solved_ids, cf_count)
    lc_problems = get_recommended_lc_problems(cf_rating, weak_tags, solved_ids, lc_count)
    
    print(f"Got {len(cf_problems)} CF problems, {len(lc_problems)} LC problems")
    
    # Log the problem names for debugging
    for p in cf_problems:
        print(f"  CF: {p.get('title', 'NO TITLE')} (rating: {p.get('rating')})")
    for p in lc_problems:
        print(f"  LC: {p.get('title', 'NO TITLE')} ({p.get('difficulty')})")
    
    # Format results with better "why" descriptions
    recommendations = []
    
    for p in cf_problems:
        # Find matching weak categories for this problem
        matching_weak = []
        for tag in p["tags"]:
            tag_lower = tag.lower()
            for weak_cat in weak_category_names:
                if tag_lower in weak_cat.lower() or weak_cat.lower() in tag_lower:
                    matching_weak.append(weak_cat)
                    break
        
        why_text = generate_why_text(p["tags"], matching_weak, p["rating"], cf_rating, "Codeforces")
        
        recommendations.append({
            "platform": "Codeforces",
            "title": p["title"],
            "link": p["link"],
            "difficulty": str(p["rating"]),
            "tags": p["tags"][:5],  # Limit tags
            "why": why_text,
            "problem_id": p["problem_id"]
        })
    
    for p in lc_problems:
        # Find matching weak categories for this problem
        matching_weak = []
        for tag in p.get("tags", []):
            tag_lower = tag.lower() if isinstance(tag, str) else ""
            for weak_cat in weak_category_names:
                if tag_lower in weak_cat.lower() or weak_cat.lower() in tag_lower:
                    matching_weak.append(weak_cat)
                    break
        
        why_text = generate_why_text(p.get("tags", []), matching_weak, p["difficulty"], cf_rating, "LeetCode")
        
        recommendations.append({
            "platform": "LeetCode",
            "title": p["title"],
            "link": p["link"],
            "difficulty": p["difficulty"],
            "tags": p.get("tags", [])[:5],
            "why": why_text,
            "problem_id": p["problem_id"]
        })
    
    # Shuffle to mix platforms
    random.shuffle(recommendations)
    
    return recommendations[:count]


def generate_why_text(tags, matching_weak, difficulty, user_rating, platform):
    """Generate a helpful explanation of why this problem was recommended"""
    tags_str = ", ".join(tags[:2]) if tags else "problem solving"
    
    if matching_weak:
        weak_str = matching_weak[0]
        return f"Targets your weak area: {weak_str}. Practice with {tags_str} concepts."
    
    if platform == "Codeforces":
        diff_num = int(difficulty) if str(difficulty).isdigit() else 1400
        diff_gap = diff_num - user_rating
        if diff_gap > 200:
            return f"Challenge problem ({diff_num}) - {tags_str} skills will level up your rating."
        else:
            return f"Slightly above your rating ({diff_num}) - solidify your {tags_str} fundamentals."
    else:
        if difficulty == "Hard":
            return f"Hard challenge to push your limits in {tags_str}."
        elif difficulty == "Medium":
            return f"Medium difficulty - practice {tags_str} with a good balance of challenge."
        else:
            return f"Easy warmup for {tags_str} - build confidence before harder problems."
