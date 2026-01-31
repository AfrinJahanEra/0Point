from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
from math import ceil
import requests
from datetime import datetime

from .models import Account
from .serializers import SignupSerializer, LoginSerializer, AddPlatformSerializer, UserProfileSerializer, PlatformProfileSerializer
from submission.models import Submission
from leaderboard.models import LeaderboardEntry


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():

            # Duplicate email check
            if Account.objects(email=serializer.validated_data["email"], is_deleted=False).first():
                return Response({"error": "Email already exists"}, status=400)

            user = Account(
                name=serializer.validated_data["name"],
                email=serializer.validated_data["email"],
                role=serializer.validated_data.get("role", "user"),
                year=serializer.validated_data.get("year"),
                department=serializer.validated_data.get("department"),
            )
            user.set_password(serializer.validated_data["password"])
            user.save()

            return Response({"message": "Account created successfully"}, status=201)

        return Response(serializer.errors, status=400)

class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = Account.objects(email=email, is_deleted=False).first()

        if not user:
            return Response({"error": "Invalid email or password"}, status=400)

        if not user.check_password(password):
            return Response({"error": "Invalid email or password"}, status=400)

        payload = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        return Response({"token": token, "user": payload})


class UserProfileView(APIView):
    """Get user profile with all coding platform data"""
    
    def get(self, request, user_id=None):
        """Get user profile by ID or current user"""
        if user_id is None:
            # Get current user from token
            if not request.user or not hasattr(request.user, 'id'):
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
                    try:
                        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                        user_id = payload.get('user_id')
                    except:
                        return Response({"error": "Invalid token"}, status=401)
                else:
                    return Response({"error": "Unauthorized"}, status=401)
        
        try:
            user = Account.objects(id=user_id, is_deleted=False).first()
            if not user:
                return Response({"error": "User not found"}, status=404)
            
            profile_data = {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "department": user.department,
                "year": user.year,
                "total_score": user.total_score,
                "global_rank": user.global_rank,
                "problems_solved": user.problems_solved,
                "contests_count": user.contests_count,
                "rating": user.rating,
                "badge": user.badge,
                "platform_profiles": [],
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            
            # Serialize platform profiles
            for profile in user.platform_profiles:
                profile_data["platform_profiles"].append({
                    "platform": profile.platform,
                    "handle": profile.handle,
                    "current_rating": profile.current_rating,
                    "max_rating": profile.max_rating,
                    "min_rating": profile.min_rating,
                    "contests_count": profile.contests_count,
                    "rank": profile.rank,
                    "badge": profile.badge,
                    "last_updated": profile.last_updated.isoformat() if profile.last_updated else None,
                    "rating_history": profile.rating_history
                })
            
            return Response(profile_data)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class AddPlatformProfileView(APIView):
    """Add or update coding platform profile"""
    
    def post(self, request):
        serializer = AddPlatformSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        # Get current user
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({"error": "Unauthorized"}, status=401)
        
        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except:
            return Response({"error": "Invalid token"}, status=401)
        
        user = Account.objects(id=user_id, is_deleted=False).first()
        if not user:
            return Response({"error": "User not found"}, status=404)
        
        platform = serializer.validated_data.get('platform')
        handle = serializer.validated_data.get('handle')
        
        # Fetch rating data from the platform
        try:
            rating_data = fetch_platform_rating(platform, handle)
            user.add_or_update_platform(
                platform,
                handle,
                rating_data.get('current_rating', 0),
                rating_data.get('max_rating', 0),
                rating_data.get('min_rating', 0),
                rating_data.get('contests_count', 0)
            )
            
            return Response({
                "message": "Platform profile added successfully",
                "platform": platform,
                "handle": handle,
                "rating": rating_data.get('current_rating', 0)
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


def fetch_platform_rating(platform, handle):
    """
    Fetch rating data from different coding platforms
    """
    if platform == "codeforces":
        return fetch_codeforces_rating(handle)
    elif platform == "codechef":
        return fetch_codechef_rating(handle)
    elif platform == "atcoder":
        return fetch_atcoder_rating(handle)
    elif platform == "leetcode":
        return fetch_leetcode_rating(handle)
    else:
        raise ValueError(f"Unsupported platform: {platform}")


def fetch_codeforces_rating(handle):
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
        min_rating = user_data.get('minRating', user_data.get('rating', 1500))
        max_rating = user_data.get('maxRating', user_data.get('rating', 1500))
        
        if response.status_code == 200:
            history_data = response.json()
            if history_data.get('result'):
                contests_count = len(history_data['result'])
                for entry in history_data['result']:
                    rating_history.append({
                        "date": datetime.fromtimestamp(entry['ratingUpdateTimeSeconds']).isoformat(),
                        "rating": entry['newRating']
                    })
                min_rating = min(entry['newRating'] for entry in history_data['result'])
                max_rating = max(entry['newRating'] for entry in history_data['result'])
        
        return {
            "current_rating": user_data.get('rating', 1500),
            "max_rating": max_rating,
            "min_rating": min_rating,
            "contests_count": contests_count,
            "rank": user_data.get('rank', 'unrated'),
            "badge": user_data.get('titlePhoto', ''),
            "rating_history": rating_history
        }
    except Exception as e:
        raise Exception(f"Failed to fetch Codeforces data: {str(e)}")


def fetch_codechef_rating(handle):
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


def fetch_atcoder_rating(handle):
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


def fetch_leetcode_rating(handle):
    """Fetch rating from LeetCode API"""
    try:
        response = requests.get(f"https://leetcode.com/graphql/", 
            json={
                "query": f'query userProfile(username: "{handle}") {{ userProfile(username: username) {{ realName rating badge }}',
            },
            timeout=5)
        if response.status_code != 200:
            raise Exception(f"LeetCode API error: {response.status_code}")
        
        data = response.json()
        
        return {
            "current_rating": data.get('rating', 1200),
            "max_rating": data.get('rating', 1200),
            "min_rating": data.get('rating', 1200),
            "contests_count": 0,
            "rank": None,
            "badge": data.get('badge', ''),
            "rating_history": []
        }
    except Exception as e:
        raise Exception(f"Failed to fetch LeetCode data: {str(e)}")


class ContestHistoryView(APIView):
    """Get contest history for a user across all platforms with pagination"""

    def get(self, request, user_id=None):
        """Get paginated contest history"""
        if user_id is None:
            # Get current user from token
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
                try:
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                    user_id = payload.get('user_id')
                except:
                    return Response({"error": "Invalid token"}, status=401)
            else:
                return Response({"error": "Unauthorized"}, status=401)

        try:
            user = Account.objects(id=user_id, is_deleted=False).first()
            if not user:
                return Response({"error": "User not found"}, status=404)

            # Read pagination params
            try:
                page = int(request.query_params.get('page', 1))
            except Exception:
                page = 1
            try:
                page_size = int(request.query_params.get('page_size', 10))
            except Exception:
                page_size = 10
            if page < 1:
                page = 1
            if page_size < 1:
                page_size = 10

            contests = []

            # Internal contests
            leaderboard_entries = LeaderboardEntry.objects(user=user).order_by('-last_updated')
            for entry in leaderboard_entries:
                contest = entry.contest
                contests.append({
                    "id": str(contest.id),
                    "title": contest.title,
                    "date": contest.start_time.isoformat() if contest.start_time else None,
                    "duration_hours": (contest.duration / 60) if contest.duration else 0,
                    "rank": entry.rank,
                    "score": entry.total_score,
                    "penalty": entry.total_penalty,
                    "platform": contest.platform or "internal",
                    "status": contest.status,
                    "type": contest.type or "general",
                    "performance": f"{entry.total_score:.1f}%"
                })

            # External platforms
            for platform_profile in getattr(user, 'platform_profiles', []):
                try:
                    if platform_profile.platform == "codeforces":
                        contests.extend(self.fetch_codeforces_contests(platform_profile.handle))
                    elif platform_profile.platform == "atcoder":
                        contests.extend(self.fetch_atcoder_contests(platform_profile.handle))
                except Exception:
                    pass

            # Sort and paginate
            contests.sort(key=lambda x: x.get('date', ''), reverse=True)
            total_contests = len(contests)
            total_pages = ceil(total_contests / page_size) if page_size else 1
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_contests = contests[start_idx:end_idx]

            return Response({
                "total_contests": total_contests,
                "total_pages": total_pages,
                "page": page,
                "page_size": page_size,
                "contests": page_contests
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    def fetch_codeforces_contests(self, handle):
        """Fetch contest history from Codeforces"""
        contests = []
        try:
            # Get contest history from user.rating endpoint
            response = requests.get(f"https://codeforces.com/api/user.rating?handle={handle}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('result'):
                    for entry in data['result']:
                        contests.append({
                            "id": f"cf-{entry.get('contestId')}",
                            "title": entry.get('contestName'),
                            "date": datetime.fromtimestamp(entry.get('ratingUpdateTimeSeconds')).isoformat(),
                            "duration_hours": 2,
                            "rank": entry.get('rank', '-'),
                            "score": entry.get('oldRating', 0),
                            "penalty": 0,
                            "platform": "codeforces",
                            "status": "finished",
                            "type": "rated",
                            "performance": f"{entry.get('newRating', 1500)}"
                        })
        except Exception:
            pass
        return contests

    def fetch_atcoder_contests(self, handle):
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
                            "duration_hours": 2,
                            "rank": entry.get('rank', '-'),
                            "score": entry.get('performance', 0),
                            "penalty": 0,
                            "platform": "atcoder",
                            "status": "finished",
                            "type": "rated" if entry.get('is_rated') else "unrated",
                            "performance": f"{entry.get('new_rating', 0)}"
                        })
        except Exception:
            pass
        return contests



