from rest_framework.views import APIView
from rest_framework.response import Response
from crossPlatform.models import ExternalContest
from datetime import datetime, timedelta
from django.utils.timezone import make_aware


class ExternalContestList(APIView):
    def get(self, request):
        platform = request.GET.get("platform", "codeforces")
        now = make_aware(datetime.utcnow())
        cutoff = now - timedelta(days=60)

        contests = ExternalContest.objects(
            platform=platform,
            start_time__gte=cutoff
        ).order_by("-start_time")

        return Response([
            {
                "external_id": c.external_id,
                "title": c.title,
                "platform": "cf",
                "start_time": c.start_time.isoformat(),
                "duration_seconds": c.duration_seconds,
                "duration_formatted": c.duration_formatted,
                "participants": c.participants,
                "status": c.status,
                "url": c.url,
            }
            for c in contests
        ])