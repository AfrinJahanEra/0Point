from rest_framework.views import APIView
from rest_framework.response import Response
from crossPlatform.models import ExternalContest
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

class ExternalContestList(APIView):
    """
    GET /external/contests/?platform=codeforces
    Returns contests from last 60 days + future contests
    """

    def get(self, request):
        platform = request.GET.get("platform", "codeforces")

        now = make_aware(datetime.utcnow())
        cutoff = now - timedelta(days=60)

        # 🔑 IMPORTANT QUERY
        contests = ExternalContest.objects(
            platform=platform,
            start_time__gte=cutoff
        ).order_by("-start_time")

        return Response([
            {
                "external_id": c.external_id,
                "title": c.title,
                "platform": "cf",
                "start_time": c.start_time,
                "duration_seconds": c.duration_seconds,
                "status": c.status,  # live / upcoming / finished
                "url": c.url,
            }
            for c in contests
        ])
