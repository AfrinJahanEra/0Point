# crossPlatform/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from crossPlatform.models import ExternalContest
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from django.http import JsonResponse

class ExternalContestList(APIView):
    def get(self, request):
        platform_param = request.GET.get("platform", "all")
        now = make_aware(datetime.utcnow())
        cutoff = now - timedelta(days=60)
        
        # Map frontend parameters to database platform names
        platform_mapping = {
            "cf": "codeforces",
            "lc": "leetcode",
            "cc": "codechef",
            "ac": "atcoder",
            "all": None  # No filtering
        }
        
        db_platform = platform_mapping.get(platform_param, platform_param)
        
        # Build queryset
        if db_platform:
            contests = ExternalContest.objects(
                platform=db_platform,
                start_time__gte=cutoff
            ).order_by("-start_time")
        else:
            # Get contests from all platforms
            contests = ExternalContest.objects(
                start_time__gte=cutoff
            ).order_by("-start_time")
        
        # Map database platform names back to frontend-friendly codes
        platform_display_mapping = {
            "codeforces": "cf",
            "leetcode": "lc",
            "codechef": "cc",
            "atcoder": "ac"
        }
        
        response_data = []
        for c in contests:
            platform_display = platform_display_mapping.get(c.platform, c.platform)
            
            response_data.append({
                "external_id": c.external_id,
                "title": c.title,
                "platform": platform_display,  # Fixed: Use actual platform
                "start_time": c.start_time.isoformat(),
                "duration_seconds": c.duration_seconds,
                "duration_formatted": c.duration_formatted,
                "participants": c.participants,
                "status": c.status,
                "url": c.url,
                "original_platform": c.platform  # Optional: for debugging
            })
        
        return Response(response_data)

