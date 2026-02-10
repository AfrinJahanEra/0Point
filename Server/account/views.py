from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
import hashlib
import threading
from datetime import datetime

from .models import Account, BannedAccount, IPAddress, DeviceFingerprint, UserTagStats
from .serializers import SignupSerializer, LoginSerializer, AddPlatformSerializer, UserProfileSerializer, PlatformProfileSerializer
from admin.secret import ADMIN_SECRET_PASSWORD
from .platforms import (
    fetch_platform_rating,
    fetch_codeforces_contests,
    fetch_atcoder_contests,
    fetch_leetcode_contests,
    fetch_codechef_contests
)
from .platforms.codeforces import fetch_submissions as fetch_cf_submissions
from .platforms.leetcode import fetch_submissions as fetch_leetcode_submissions
from .platforms.codechef import fetch_submissions as fetch_codechef_submissions
from .platforms.atcoder import fetch_submissions as fetch_atcoder_submissions
from .tag_analysis import get_tag_stats


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            
            # Check if email is already registered and not deleted
            if Account.objects(email=email, is_deleted=False).first():
                return Response({"error": "Email already exists"}, status=400)
            
            # Check if email is in banned accounts
            banned_account = BannedAccount.objects(email=email).first()
            if banned_account:
                return Response({"error": "This email is banned from registration"}, status=403)
            
            # Get IP address from request
            ip_address = self.get_client_ip(request)
            
            # Check if IP address is banned
            banned_by_ip = BannedAccount.objects(ip_addresses__in=[ip_address]).first()
            if banned_by_ip:
                return Response({"error": "Your network/IP is banned from registration"}, status=403)
            
            # Get device fingerprint
            device_fingerprint = self.generate_device_fingerprint(request)
            
            # Check if device is banned
            banned_by_device = BannedAccount.objects(device_fingerprints__in=[device_fingerprint]).first()
            if banned_by_device:
                return Response({"error": "This device is banned from registration"}, status=403)
            
            role = serializer.validated_data.get("role", "user")
            
            # If role is admin, validate secret password
            if role == "admin":
                secret_password = request.data.get("secret_password")
                if secret_password != ADMIN_SECRET_PASSWORD:
                    return Response({"error": "Invalid admin secret password"}, status=400)
            
            # Create IP address object
            ip_obj = IPAddress(
                address=ip_address,
                last_used=datetime.utcnow()
            )
            
            # Create device fingerprint object
            device_obj = DeviceFingerprint(
                fingerprint=device_fingerprint,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                last_used=datetime.utcnow()
            )
            
            user = Account(
                name=serializer.validated_data["name"],
                email=email,
                role=role,
                year=serializer.validated_data.get("year"),
                department=serializer.validated_data.get("department"),
                ip_addresses=[ip_obj],  # Store as IPAddress object
                device_fingerprints=[device_obj]  # Store as DeviceFingerprint object
            )
            user.set_password(serializer.validated_data["password"])
            user.save()

            return Response({"message": "Account created successfully"}, status=201)

        return Response(serializer.errors, status=400)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def generate_device_fingerprint(self, request):
        """Generate a simple device fingerprint"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
        
        # Create a fingerprint string
        fingerprint_string = f"{user_agent}:{accept_language}:{accept_encoding}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()


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
                "profile_photo": user.profile_photo,
                "total_submissions": user.get_total_submissions(),
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
            print(f"Serializer validation failed: {serializer.errors}")
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
            result = {"data": None, "error": None}

            def _fetch():
                try:
                    result['data'] = fetch_platform_rating(platform, handle)
                except Exception as ex:
                    result['error'] = ex

            th = threading.Thread(target=_fetch, daemon=True)
            th.start()

            # wait up to 45 seconds for the fetch to complete
            th.join(timeout=45)

            if th.is_alive():
                return Response({
                    "error": "Request to platform API took too long. Please try again in a moment."
                }, status=408)

            if result['error']:
                print(f"Platform fetch error for {platform}/{handle}: {result['error']}")
                return Response({"error": str(result['error'])}, status=400)

            rating_data = result['data'] or {}

            user.add_or_update_platform(
                platform,
                handle,
                rating_data.get('current_rating', 0),
                rating_data.get('max_rating', 0),
                rating_data.get('min_rating', 0),
                rating_data.get('contests_count', 0),
                rating_data.get('rank'),
                rating_data.get('badge'),
                rating_data.get('rating_history', [])
            )

            # Reset tag stats for full re-fetch
            UserTagStats.objects(user_id=str(user.id)).delete()
           
            return Response({
                "message": "Platform profile added successfully",
                "platform": platform,
                "handle": handle,
                "rating": rating_data.get('current_rating', 0)
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ContestHistoryView(APIView):
    """Get contest history from various platforms"""
    
    def get(self, request, user_id=None):
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
            
            platform = request.GET.get('platform')
            if not platform:
                return Response({"error": "Platform parameter required"}, status=400)
            
            # Handle 'all' platform - fetch from all platforms
            if platform == 'all':
                all_contests = []
                for profile in user.platform_profiles:
                    # Check cache first
                    cache = user.get_contest_cache(profile.platform, profile.handle)
                    if cache and cache.last_fetched:
                        from datetime import timedelta
                        if datetime.utcnow() - cache.last_fetched < timedelta(hours=1):
                            all_contests.extend(cache.contests)
                            continue
                    
                    # Fetch fresh data
                    try:
                        contests = []
                        if profile.platform == "codeforces":
                            contests = fetch_codeforces_contests(profile.handle)
                        elif profile.platform == "atcoder":
                            contests = fetch_atcoder_contests(profile.handle)
                        elif profile.platform == "leetcode":
                            contests = fetch_leetcode_contests(profile.handle)
                        elif profile.platform == "codechef":
                            contests = fetch_codechef_contests(profile.handle)
                        
                        # Update cache
                        user.update_contest_cache(profile.platform, profile.handle, contests)
                        all_contests.extend(contests)
                    except Exception as e:
                        print(f"Error fetching contests for {profile.platform}/{profile.handle}: {e}")
                        continue
                
                return Response({
                    "platform": "all",
                    "contests": all_contests,
                    "cached": False
                })
            
            # Handle 'internal' platform - this should fetch from your internal contest system
            if platform == 'internal':
                # TODO: Implement internal contest history fetching
                return Response({
                    "platform": "internal",
                    "contests": [],
                    "cached": False,
                    "message": "Internal contest history not yet implemented"
                })
            
            profile = user.get_platform_profile(platform)
            if not profile:
                return Response({"error": f"No {platform} profile found"}, status=404)
            
            # Check cache first
            cache = user.get_contest_cache(platform, profile.handle)
            if cache and cache.last_fetched:
                # Return cached data if fresh (less than 1 hour old)
                from datetime import timedelta
                if datetime.utcnow() - cache.last_fetched < timedelta(hours=1):
                    return Response({
                        "platform": platform,
                        "handle": profile.handle,
                        "contests": cache.contests,
                        "cached": True,
                        "last_updated": cache.last_fetched.isoformat()
                    })
            
            # Fetch fresh data
            contests = []
            if platform == "codeforces":
                contests = fetch_codeforces_contests(profile.handle)
            elif platform == "atcoder":
                contests = fetch_atcoder_contests(profile.handle)
            elif platform == "leetcode":
                contests = fetch_leetcode_contests(profile.handle)
            elif platform == "codechef":
                contests = fetch_codechef_contests(profile.handle)
            
            # Update cache
            user.update_contest_cache(platform, profile.handle, contests)
            
            return Response({
                "platform": platform,
                "handle": profile.handle,
                "contests": contests,
                "cached": False
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ExternalSubmissionView(APIView):
    """Get external platform submissions"""
    
    def get(self, request):
        # Get current user from token
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
        
        platform = request.GET.get('platform')
        limit = int(request.GET.get('limit', 100))
        
        if not platform:
            return Response({"error": "Platform parameter required"}, status=400)
        
        # Handle 'all' platform - fetch from all platforms
        if platform == 'all':
            all_submissions = []
            for profile in user.platform_profiles:
                try:
                    submissions = []
                    if profile.platform == "codeforces":
                        submissions = fetch_cf_submissions(profile.handle, limit)
                    elif profile.platform == "leetcode":
                        submissions = fetch_leetcode_submissions(profile.handle, limit)
                    elif profile.platform == "codechef":
                        submissions = fetch_codechef_submissions(profile.handle, limit)
                    elif profile.platform == "atcoder":
                        submissions = fetch_atcoder_submissions(profile.handle, limit)
                    
                    all_submissions.extend(submissions)
                except Exception as e:
                    print(f"Error fetching submissions for {profile.platform}/{profile.handle}: {e}")
                    continue
            
            return Response({
                "platform": "all",
                "submissions": all_submissions,
                "count": len(all_submissions)
            })
        
        profile = user.get_platform_profile(platform)
        if not profile:
            return Response({"error": f"No {platform} profile found"}, status=404)
        
        try:
            submissions = []
            if platform == "codeforces":
                submissions = fetch_cf_submissions(profile.handle, limit)
            elif platform == "leetcode":
                submissions = fetch_leetcode_submissions(profile.handle, limit)
            elif platform == "codechef":
                submissions = fetch_codechef_submissions(profile.handle, limit)
            elif platform == "atcoder":
                submissions = fetch_atcoder_submissions(profile.handle, limit)
            
            return Response({
                "platform": platform,
                "handle": profile.handle,
                "submissions": submissions,
                "count": len(submissions)
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class TagStatsView(APIView):
    """Get user's tag statistics from external platforms"""
    
    def get(self, request):
        # Get current user from token
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
        
        # Check if user has any platform profiles
        if not user.platform_profiles:
            return Response({"error": "No platform profiles found. Please add a platform first."}, status=404)
        
        try:
            # Get tag statistics (uses caching internally)
            tag_stats = get_tag_stats(user)
            
            return Response({
                "user_id": str(user.id),
                "tags": tag_stats,
                "total_tags": len(tag_stats),
                "total_problems": sum(tag_stats.values())
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class UpdateProfileView(APIView):
    """Update user profile including name, department, year, and profile photo"""
    
    def put(self, request):
        # Get current user from token
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
        
        # Update allowed fields
        if 'name' in request.data:
            user.name = request.data['name']
        if 'department' in request.data:
            user.department = request.data['department']
        if 'year' in request.data:
            user.year = request.data['year']
        if 'profile_photo' in request.data:
            user.profile_photo = request.data['profile_photo']
        
        user.save()
        
        # Update token user data
        updated_payload = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name
        }
        
        updated_token = jwt.encode(updated_payload, settings.SECRET_KEY, algorithm="HS256")
        
        return Response({
            "message": "Profile updated successfully",
            "token": updated_token,
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "department": user.department,
                "year": user.year,
                "profile_photo": user.profile_photo,
                "role": user.role
            }
        })