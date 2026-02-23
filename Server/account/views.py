#Server/account/views.py
import token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
from math import ceil
import requests
from datetime import datetime

from .calendar import  fetch_codechef_calendar, fetch_leetcode_calendar

from .models import Account, PlatformSubmissionCache, UserTagStats, PlatformContestCache
from .serializers import SignupSerializer, LoginSerializer, AddPlatformSerializer, UserProfileSerializer, PlatformProfileSerializer
from .platforms import fetch_codechef_contests, fetch_platform_rating, fetch_codeforces_contests, fetch_atcoder_contests, fetch_leetcode_contests
from submission.models import Submission
from leaderboard.models import LeaderboardEntry
from .platforms.codeforces import fetch_submissions as fetch_cf_submissions
from .platforms.leetcode import fetch_submissions as fetch_leetcode_submissions
from .platforms.codechef import fetch_submissions as fetch_codechef_submissions
from .platforms.atcoder import fetch_submissions as fetch_atcoder_submissions

from .tag_analysis import get_tag_stats



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
        
        # Fetch rating data from the platform with a cross-platform timeout
        try:
            import threading

            result = {"data": None, "error": None}

            def _fetch():
                try:
                    result['data'] = fetch_platform_rating(platform, handle)
                except Exception as ex:
                    result['error'] = ex

            th = threading.Thread(target=_fetch, daemon=True)
            th.start()

            # wait up to 15 seconds for the fetch to complete
            th.join(timeout=45)

            if th.is_alive():
                return Response({
                    "error": "Request to platform API took too long. Please try again in a moment."
                }, status=408)

            if result['error']:
                return Response({"error": str(result['error'])}, status=400)

            rating_data = result['data'] or {}

            user.add_or_update_platform(
                platform,
                handle,
                rating_data.get('current_rating', 0),
                rating_data.get('max_rating', 0),
                rating_data.get('min_rating', 0),
                rating_data.get('contests_count', 0),
                rating_data.get('badge', ''),
                rating_data.get('rating_history', [])
            )

           # Reset timestamps for the changed platform (forces full re-fetch)
            
            UserTagStats.objects(user_id=str(user.id)).delete()
           
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
    (Delegated to platforms.py)
    """
    from .platforms import fetch_platform_rating as platform_fetch
    return platform_fetch(platform, handle)


def fetch_codeforces_rating(handle):
    """Deprecated: Use platforms.fetch_codeforces_rating instead"""
    from .platforms import fetch_codeforces_rating as platform_fetch
    return platform_fetch(handle)


def fetch_codechef_rating(handle):
    """Deprecated: Use platforms.fetch_codechef_rating instead"""
    from .platforms import fetch_codechef_rating as platform_fetch
    return platform_fetch(handle)


def fetch_atcoder_rating(handle):
    """Deprecated: Use platforms.fetch_atcoder_rating instead"""
    from .platforms import fetch_atcoder_rating as platform_fetch
    return platform_fetch(handle)


def fetch_leetcode_rating(handle):
    """Deprecated: Use platforms.fetch_leetcode_rating instead"""
    from .platforms import fetch_leetcode_rating as platform_fetch
    return platform_fetch(handle)



class ContestHistoryView(APIView):
    def get(self, request, user_id=None):
        if user_id is None:
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

            # ── Platform filter ────────────────────────────────────────
            platform_filter = request.query_params.get('platform', 'all').lower()
            valid_platforms = {'all', 'codeforces', 'atcoder', 'codechef', 'leetcode', 'internal'}
            if platform_filter not in valid_platforms:
                platform_filter = 'all'

            contests = []

            # Internal contests
            leaderboard_entries = LeaderboardEntry.objects(user=user).order_by('-last_updated')
            for entry in leaderboard_entries:
                contest = entry.contest
                entry_platform = contest.platform or "internal"

                if platform_filter == 'all' or platform_filter == entry_platform:
                    contests.append({
                        "id": str(contest.id),
                        "title": contest.title,
                        "date": contest.start_time.isoformat() if contest.start_time else None,
                        "rank": entry.rank,
                        "score": entry.total_score,
                        "platform": entry_platform,
                        "status": contest.status,
                        "type": contest.type or "general",
                    })

            # External platforms (cached or fresh)
            CACHE_VALID_FOR_HOURS = 3   # ← keep your value

            for profile in user.platform_profiles:
                if platform_filter != 'all' and platform_filter != profile.platform:
                    continue  # skip platforms user didn't ask for

                cache_entry = next(
                    (c for c in user.contest_cache
                     if c.platform == profile.platform and c.handle == profile.handle),
                    None
                )

                fetch_needed = True
                if cache_entry and cache_entry.last_fetched:
                    age_hours = (datetime.utcnow() - cache_entry.last_fetched).total_seconds() / 3600
                    if age_hours < CACHE_VALID_FOR_HOURS:
                        fetch_needed = False
                        contests.extend(cache_entry.contests)

                if fetch_needed:
                    try:
                        if profile.platform == "codeforces":
                            fresh = fetch_codeforces_contests(profile.handle)
                        elif profile.platform == "atcoder":
                            fresh = fetch_atcoder_contests(profile.handle)
                        elif profile.platform == "leetcode":
                            fresh = fetch_leetcode_contests(profile.handle)
                        elif profile.platform == "codechef":
                            fresh = fetch_codechef_contests(profile.handle)
                        else:
                            fresh = []

                        if fresh:
                            if cache_entry:
                                cache_entry.contests = fresh
                                cache_entry.last_fetched = datetime.utcnow()
                            else:
                                user.contest_cache.append(PlatformContestCache(
                                    platform=profile.platform,
                                    handle=profile.handle,
                                    contests=fresh,
                                    last_fetched=datetime.utcnow()
                                ))
                            user.save()

                            contests.extend(fresh)

                    except Exception:
                        if cache_entry:
                            contests.extend(cache_entry.contests)

            # Sort newest first
            contests.sort(key=lambda x: x.get('date', ''), reverse=True)

            return Response({
                "total_contests": len(contests),
                "contests": contests,
                "applied_filter": platform_filter,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ExternalSubmissionView(APIView):
    """
    Fetch submissions from external platforms (Codeforces, etc.)
    """

    def get(self, request):
        # Auth
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)

        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)

        user = Account.objects(id=user_id, is_deleted=False).first()
        if not user:
            return Response({"error": "User not found"}, status=404)

        CACHE_VALID_HOURS = 2
        submissions = []

        for profile in user.platform_profiles:
            cache_entry = next(
                (c for c in user.submission_cache
                 if c.platform == profile.platform and c.handle == profile.handle),
                None
            )

            age_ok = False
            if cache_entry and cache_entry.last_fetched:
                age = (datetime.utcnow() - cache_entry.last_fetched).total_seconds() / 3600
                age_ok = age < CACHE_VALID_HOURS

            if age_ok and cache_entry.submissions:
                submissions.extend(cache_entry.submissions)
                continue

            # fetch live
            try:
                if profile.platform == "codeforces":
                    fresh = fetch_cf_submissions(profile.handle, limit=150)
                elif profile.platform == "leetcode":
                    fresh = fetch_leetcode_submissions(profile.handle, limit=150)
                elif profile.platform == "codechef":
                    fresh = fetch_codechef_submissions(profile.handle, limit=21)
                elif profile.platform == "atcoder":
                    fresh = fetch_atcoder_submissions(profile.handle)
                else:
                    fresh = []

                if fresh:
                    # update or create cache
                    if cache_entry:
                        cache_entry.submissions = fresh
                        cache_entry.last_fetched = datetime.utcnow()
                        cache_entry.count = len(fresh)
                        cache_entry.fetch_status = "success"
                    else:
                        user.submission_cache.append(PlatformSubmissionCache(
                            platform=profile.platform,
                            handle=profile.handle,
                            submissions=fresh,
                            last_fetched=datetime.utcnow(),
                            count=len(fresh),
                            fetch_status="success"
                        ))
                    user.save()

                submissions.extend(fresh)

            except Exception as exc:
                # fallback to cache even if stale
                if cache_entry and cache_entry.submissions:
                    submissions.extend(cache_entry.submissions)

        # sort newest first
        submissions.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)

        return Response({
            "submissions": submissions[:300],  # safety limit
            "cached": True,                        # optional frontend hint
            "total_fetched": len(submissions)
        })


class TagStatsView(APIView):
    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)

        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)

        user = Account.objects(id=user_id, is_deleted=False).first()
        if not user:
            return Response({"error": "User not found"}, status=404)

        tag_stats = get_tag_stats(user)

        return Response({
            "tag_stats": tag_stats,
            "note": "Unique solved problems per tag (Codeforces full history + LeetCode all-time)"
        })
    


class LeetCodeCalendarView(APIView):
    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)

        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)

        user = Account.objects(id=user_id, is_deleted=False).first()
        if not user:
            return Response({"error": "User not found"}, status=404)

        # find leetcode handle
        profile = user.get_platform_profile("leetcode")
        if not profile:
            return Response({"error": "LeetCode not connected"}, status=400)

        year = request.query_params.get("year")

        try:
            data = fetch_leetcode_calendar(profile.handle, year)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        

class CodeChefCalendarView(APIView):
    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)
        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)
        user = Account.objects(id=user_id, is_deleted=False).first()
        if not user:
            return Response({"error": "User not found"}, status=404)
        # find codechef handle
        profile = user.get_platform_profile("codechef")
        if not profile:
            return Response({"error": "CodeChef not connected"}, status=400)
        year = request.query_params.get("year")
        try:
            data = fetch_codechef_calendar(profile.handle, year)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)