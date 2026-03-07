"""Test Codeforces API to verify problem names are fetched correctly"""
import requests

CF_API_BASE = "https://codeforces.com/api"

print("Testing Codeforces API...")
try:
    resp = requests.get(f"{CF_API_BASE}/problemset.problems", timeout=15)
    print(f"Status code: {resp.status_code}")
    
    data = resp.json()
    print(f"API Status: {data.get('status')}")
    
    problems = data.get("result", {}).get("problems", [])
    print(f"Total problems received: {len(problems)}")
    
    print("\nFirst 10 problems with ratings:")
    count = 0
    for p in problems:
        if p.get("rating") and count < 10:
            print(f"  {p.get('contestId')}{p.get('index')}: {p.get('name')} (Rating: {p.get('rating')}, Tags: {p.get('tags', [])[:2]})")
            count += 1
    
    print("\nAPI is working correctly!")
    
except Exception as e:
    print(f"Error: {e}")
