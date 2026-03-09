#Server/account/views.py
from collections import defaultdict
import token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
from rest_framework.permissions import AllowAny
from mongoengine.errors import DoesNotExist
from math import ceil
import requests
from datetime import datetime, timezone, timedelta

from recommendation.models import UserRecommendation

from .calendar import  fetch_codeforces_calendar,fetch_codechef_calendar, fetch_leetcode_calendar, fetch_atcoder_calendar, get_cached_calendar

from .models import Account, PlatformCalendarCache, PlatformSubmissionCache, UserTagStats, PlatformContestCache, UserVerdictStats
from .serializers import SignupSerializer, LoginSerializer, AddPlatformSerializer, UserProfileSerializer, PlatformProfileSerializer
from .platforms import fetch_codechef_contests, fetch_platform_rating, fetch_codeforces_contests, fetch_atcoder_contests, fetch_leetcode_contests
# Import submission models inside functions to avoid circular imports
# from submission.models import Submission
from leaderboard.models import LeaderboardEntry
from .platforms.codeforces import fetch_submissions as fetch_cf_submissions
from .platforms.leetcode import fetch_submissions as fetch_leetcode_submissions
from .platforms.codechef import fetch_submissions as fetch_codechef_submissions
from .platforms.atcoder import fetch_submissions as fetch_atcoder_submissions

from .tag_analysis import get_category_scores
from .verdict_analysis import get_verdict_counts



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
            
            # Calculate actual stats from submissions and contest registrations
            problems_solved_count = 0
            contests_count = 0
            total_score = 0
            global_rank = None
            
            try:
                from submission.models import Submission
                from contest.models import ContestRegistration
                
                # Get all AC submissions for this user
                ac_submissions = list(Submission.objects(user=user, verdict='AC'))
                
                # Count unique problems solved
                unique_problems = set()
                for sub in ac_submissions:
                    unique_problems.add(sub.problem_code)
                problems_solved_count = len(unique_problems)
                
                # Calculate total score (sum of passed test cases)
                total_score = sum(sub.passed_test_cases or 0 for sub in ac_submissions)
                
                # Count contests participated
                contests_count = ContestRegistration.objects(user=user).count()
                
                # Calculate global rank based on rating
                higher_rated = Account.objects(
                    rating__gt=user.rating,
                    is_deleted=False,
                    is_inactive=False
                ).count()
                global_rank = higher_rated + 1 if user.rating > 0 else None
                
                # Update user's account with calculated stats
                user.problems_solved = problems_solved_count
                user.contests_count = contests_count
                user.total_score = total_score
                user.global_rank = global_rank
                user.save()
                
            except Exception as e:
                # If calculation fails, use stored values
                print(f"[Profile Stats Error] Calculation failed: {e}")
                import traceback
                print(traceback.format_exc())
                problems_solved_count = getattr(user, 'problems_solved', 0) or 0
                contests_count = getattr(user, 'contests_count', 0) or 0
                total_score = getattr(user, 'total_score', 0) or 0
                global_rank = getattr(user, 'global_rank', None)
            
            profile_data = {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "department": user.department,
                "year": user.year,
                "profile_photo": getattr(user, 'profile_photo', None),
                "total_score": total_score,
                "global_rank": global_rank,
                "problems_solved": problems_solved_count,
                "contests_count": contests_count,
                "rating": user.rating,
                "badge": user.badge,
                "platform_profiles": [],
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            
            # Serialize platform profiles
            profile_data["platform_profiles"] = []
            try:
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
            except Exception as e:
                print(f"[Profile Stats Error] Platform profiles: {e}")
            
            return Response(profile_data)
        except Exception as e:
            import traceback
            print(f"[Profile Stats Error] Main exception: {e}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=400)

    def put(self, request, user_id=None):
        """Update user profile"""
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
            
            # Update allowed fields
            data = request.data
            if 'name' in data:
                user.name = data['name']
            if 'department' in data:
                user.department = data['department']
            if 'year' in data:
                user.year = data['year']
            if 'profile_photo' in data:
                user.profile_photo = data['profile_photo']
            
            user.save()
            
            # Generate new token with updated user data
            from .serializers import UserProfileSerializer
            token_payload = {
                "user_id": str(user.id),
                "email": user.email,
                "role": user.role,
                "exp": datetime.utcnow() + timedelta(days=7)
            }
            new_token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm="HS256")
            
            # Serialize user data for response
            user_data = UserProfileSerializer(user).data
            
            return Response({
                "message": "Profile updated successfully",
                "token": new_token,
                "user": user_data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class PublicUserProfileView(APIView):
    """
    Public endpoint to view another user's profile (no auth required for basic info)
    """
    permission_classes = [AllowAny]  # Public access

    def get(self, request, user_id):
        try:
            user = Account.objects.get(id=user_id, is_deleted=False, is_inactive=False)
        except (DoesNotExist, Exception):
            return Response({"error": "User not found or inactive"}, status=404)

        # Prepare public-safe data (do NOT expose email, password, etc.)
        profile_data = {
            "id": str(user.id),
            "name": user.name,
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

        # Only include public platform info
        for profile in user.platform_profiles:
            profile_data["platform_profiles"].append({
                "platform": profile.platform,
                "handle": profile.handle,
                "current_rating": profile.current_rating,
                "max_rating": profile.max_rating,
                "min_rating": profile.min_rating,
                "contests_count": profile.contests_count,
                "badge": profile.badge,
                "rating_history": profile.rating_history,  # Public data on all CP platforms
            })

        return Response(profile_data)


class PublicTagStatsView(APIView):
    """Public endpoint to get tag stats for any user"""
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        try:
            user = Account.objects.get(id=user_id, is_deleted=False, is_inactive=False)
        except (DoesNotExist, Exception):
            return Response({"error": "User not found"}, status=404)

        category_scores = get_category_scores(user)
        return Response({"category_scores": category_scores})


class PublicVerdictStatsView(APIView):
    """Public endpoint to get verdict stats for any user"""
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        try:
            user = Account.objects.get(id=user_id, is_deleted=False, is_inactive=False)
        except (DoesNotExist, Exception):
            return Response({"error": "User not found"}, status=404)

        verdict_counts = get_verdict_counts(user)
        return Response({"verdict_counts": verdict_counts})


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
            UserVerdictStats.objects(user_id=str(user.id)).delete()
            UserRecommendation.invalidate(str(user.id))

            # Invalidate caches for this platform to force re-fetch on next access
            user.contest_cache = [c for c in user.contest_cache if c.platform != platform]
            user.submission_cache = [c for c in user.submission_cache if c.platform != platform]
            user.calendar_cache = [c for c in user.calendar_cache if c.platform != platform]
            user.save()
           
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

        category_scores = get_category_scores(user)

        return Response({
            "category_scores": category_scores,
            "note": "Proficiency scores per category based on average attempts needed to solve problems (higher score means fewer attempts, max 10)"
        }) 

class VerdictStatsView(APIView):
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

        verdict_counts = get_verdict_counts(user)

        return Response({
            "verdict_counts": verdict_counts,
            "note": "Submission verdict distribution across all connected platforms (based on all historical submissions where available)"
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
        
class AtCoderCalendarView(APIView):
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

        profile = user.get_platform_profile("atcoder")
        if not profile:
            return Response({"error": "AtCoder not connected"}, status=400)

        year = request.query_params.get("year")
        try:
            data = fetch_atcoder_calendar(profile.handle, year)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        
class CodeforcesCalendarView(APIView):
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

        profile = user.get_platform_profile("codeforces")

        cache = get_cached_calendar(user, "codeforces", profile.handle)

        CACHE_VALID_HOURS = 12

        fetch_needed = True
        if cache and cache.last_fetched:
            age = (datetime.utcnow() - cache.last_fetched).total_seconds() / 3600
            if age < CACHE_VALID_HOURS:
                fetch_needed = False

        if fetch_needed:
            full_data = fetch_codeforces_calendar(profile.handle)  # 🚀 fetch ONCE

            calendar = full_data["submissionCalendar"]
            streak = full_data["streak"]
            active_years = full_data["activeYears"]
            total = full_data["total_submissions"]

            if cache:
                cache.calendar = calendar
                cache.streak = streak
                cache.active_years = active_years
                cache.total = total
                cache.last_fetched = datetime.utcnow()
            else:
                user.calendar_cache.append(PlatformCalendarCache(
                    platform="codeforces",
                    handle=profile.handle,
                    calendar=calendar,
                    streak=streak,
                    active_years=active_years,
                    total=total,
                    last_fetched=datetime.utcnow()
                ))

            user.save()
        else:
            calendar = cache.calendar
            streak = cache.streak
            active_years = cache.active_years
            total = cache.total

        # 🔥 Year filter (FAST — local dict filter)
        year = request.query_params.get("year")
        if year:
            y = int(year)
            calendar = {
                k: v for k, v in calendar.items()
                if datetime.fromtimestamp(int(k), tz=timezone.utc).year == y
            }

        return Response({
            "submissionCalendar": calendar,
            "streak": streak,
            "activeYears": active_years,
            "total_submissions": total
        })