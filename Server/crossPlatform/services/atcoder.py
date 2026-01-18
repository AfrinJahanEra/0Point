# crossPlatform/services/atcoder.py
import requests
from datetime import datetime, timedelta
from django.utils.timezone import make_aware, now
from crossPlatform.models import ExternalContest
from .base import cleanup_old_contests
import time

def fetch_atcoder_contests_from_website(contest_type='upcoming'):
    """
    Fetches contests from AtCoder website using the same logic as the atcoder-api package.
    Based on the TypeScript code from the blog.
    """
    try:
        url = 'https://atcoder.jp/contests'
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ContestSyncBot/1.0; your-email@example.com)"
        }
        
        print(f"Fetching {contest_type} contests from AtCoder website...")
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Use BeautifulSoup for parsing (equivalent to cheerio in TypeScript)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        contests = []
        
        # Select the correct table based on type (same as TypeScript code)
        table_selector = '#contest-table-upcoming' if contest_type == 'upcoming' else '#contest-table-recent'
        table_div = soup.select_one(table_selector)
        
        if not table_div:
            print(f"Warning: No {contest_type} contests found. HTML structure may have changed.")
            return contests
        
        # Find all table rows in tbody (same as TypeScript: `${tableSelector} tbody tr`)
        table_body = table_div.find('tbody')
        if not table_body:
            return contests
            
        contest_rows = table_body.find_all('tr')
        
        print(f"Found {len(contest_rows)} {contest_type} contest rows")
        
        for row in contest_rows:
            try:
                # Extract data using the same selectors as TypeScript code
                cells = row.find_all('td')
                if len(cells) < 4:
                    continue
                
                # contestTime (first column) - matches TypeScript: td:nth-child(1)
                contest_time = cells[0].text.strip()
                
                # contestName (second column with link) - matches TypeScript: td:nth-child(2) a
                contest_name_elem = cells[1].find('a')
                if not contest_name_elem:
                    continue
                contest_name = contest_name_elem.text.strip()
                
                # isRated (last column) - matches TypeScript: td:last-child
                is_rated = cells[-1].text.strip() != '-'
                
                # contestDuration (third column) - matches TypeScript: td:nth-child(3)
                contest_duration = cells[2].text.strip()
                
                # contestType - matches TypeScript: td:nth-child(2) span
                contest_type_span = cells[1].find('span')
                contest_type_code = 'Algorithm' if contest_type_span and 'Ⓐ' in contest_type_span.text else 'Heuristic'
                
                # contestId and contestUrl - matches TypeScript logic
                contest_link = contest_name_elem.get('href', '')
                if not contest_link:
                    continue
                
                contest_id = contest_link.split('/')[-1] if '/' in contest_link else ''
                contest_url = f'https://atcoder.jp{contest_link}'
                
                # Add to contests list (matching TypeScript structure)
                contests.append({
                    'contestName': contest_name,
                    'isRated': is_rated,
                    'contestTime': contest_time,
                    'contestDuration': contest_duration,
                    'contestType': contest_type_code,
                    'contestUrl': contest_url,
                    'contestId': contest_id
                })
                
            except Exception as row_error:
                print(f"Error parsing contest row: {row_error}")
                continue
        
        return contests
        
    except Exception as error:
        print(f"Error fetching contest list: {error}")
        return []

def sync_atcoder_contests():
    """
    Main sync function that fetches both upcoming and recent contests
    and saves them to the database.
    """
    now_aware = now()
    saved_count = 0
    
    try:
        # Fetch both upcoming and recent contests (same as TypeScript functions)
        upcoming_contests = fetch_atcoder_contests_from_website('upcoming')
        recent_contests = fetch_atcoder_contests_from_website('recent')
        
        print(f"Retrieved {len(upcoming_contests)} upcoming and {len(recent_contests)} recent contests")
        
        # Combine all contests
        all_contests = upcoming_contests + recent_contests
        
        # Process and save each contest
        for contest_data in all_contests:
            try:
                contest_id = contest_data.get('contestId', '')
                if not contest_id:
                    continue
                
                # Parse start time from contestTime (JST format: "2025-01-25 21:00:00+0900")
                time_str = contest_data.get('contestTime', '')
                if not time_str:
                    continue
                    
                start_dt = parse_atcoder_time(time_str)
                if not start_dt:
                    continue
                
                # Parse duration from contestDuration (e.g., "01:40")
                duration_str = contest_data.get('contestDuration', '')
                duration_sec = parse_duration(duration_str)
                
                # Determine status based on current time (same logic as before)
                now_ts = time.time()
                start_ts = start_dt.timestamp()
                end_ts = start_ts + duration_sec
                
                if now_ts < start_ts:
                    status = "upcoming"
                elif start_ts <= now_ts < end_ts:
                    status = "live"
                else:
                    status = "finished"
                
                # Skip very old finished contests
                if status == "finished" and start_dt < now_aware - timedelta(days=90):
                    continue
                
                # Prepare data for database
                update_data = {
                    "title": contest_data.get('contestName', 'Unnamed Contest'),
                    "url": contest_data.get('contestUrl', f'https://atcoder.jp/contests/{contest_id}'),
                    "start_time": start_dt,
                    "duration_seconds": duration_sec,
                    "duration_formatted": format_duration_for_db(duration_sec),
                    "status": status,
                    "last_synced": now_aware,
                }
                
                # Save to MongoDB (upsert)
                ExternalContest.objects(
                    platform="atcoder",
                    external_id=contest_id
                ).update_one(upsert=True, **update_data)
                
                saved_count += 1
                
            except Exception as e:
                print(f"Error saving contest {contest_data.get('contestId', 'unknown')}: {e}")
                continue
        
        # Clean up old contests
        cleanup_old_contests("atcoder", keep_days=70)
        
        print(f"AtCoder sync completed — saved {saved_count} contests")
        print(f"  Upcoming in DB: {ExternalContest.objects(platform='atcoder', status='upcoming').count()}")
        print(f"  Live in DB: {ExternalContest.objects(platform='atcoder', status='live').count()}")
        print(f"  Recent finished in DB: {ExternalContest.objects(platform='atcoder', status='finished').count()}")
        
        return saved_count
        
    except Exception as e:
        print(f"AtCoder sync failed: {e}")
        return 0

# Helper functions (keep these from previous implementation)

def parse_atcoder_time(time_str):
    """Parses AtCoder's time string (JST) into an aware UTC datetime."""
    try:
        # Format: "2025-01-25 21:00:00+0900"
        if '+' in time_str:
            dt_part, offset = time_str.split('+')
            dt_part = dt_part.strip()
        else:
            dt_part = time_str.strip()

        # Parse as naive datetime
        naive_dt = datetime.strptime(dt_part, '%Y-%m-%d %H:%M:%S')
        # Convert from JST (UTC+9) to UTC
        utc_naive_dt = naive_dt - timedelta(hours=9)
        # Make it timezone-aware in UTC
        return make_aware(utc_naive_dt)
    except Exception as e:
        print(f"Time parsing failed for '{time_str}': {e}")
        return None

def parse_duration(duration_str):
    """Converts duration string like '01:40' or '100:00:00' to seconds."""
    try:
        parts = list(map(int, duration_str.split(':')))
        if len(parts) == 2:  # HH:MM
            hours, minutes = parts
            return hours * 3600 + minutes * 60
        elif len(parts) == 3:  # HH:MM:SS
            hours, minutes, seconds = parts
            return hours * 3600 + minutes * 60 + seconds
        return 0
    except Exception:
        return 0

def format_duration_for_db(seconds):
    """Formats seconds for database storage (similar to other platforms)."""
    if seconds <= 0:
        return "0 minutes"
    
    minutes = seconds // 60
    hours = minutes // 60
    minutes %= 60
    days = hours // 24
    hours %= 24
    
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days > 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours > 1 else ''}")
    if minutes > 0 or not parts:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    
    return " ".join(parts)