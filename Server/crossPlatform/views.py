from rest_framework.views import APIView 
from rest_framework.response import Response
from crossPlatform.models import ExternalContest
from datetime import datetime, timezone
from django.utils.timezone import make_aware

class ExternalContestList(APIView):
    """
    GET /external/contests/?platform=codeforces
    """

    def get(self, request):
        platform = request.GET.get("platform", "codeforces")

        contests = ExternalContest.objects(platform=platform).order_by("-start_time")

        now = make_aware(datetime.utcnow())
        result = []

        for c in contests:
            # Ensure start_time is timezone-aware
            start_time = c.start_time
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)

            # Determine contest status
            if c.status == "CODING":
                status = "live"
            elif start_time > now:
                status = "upcoming"
            else:
                status = "past"

            result.append({
                "external_id": c.external_id,
                "title": c.title,
                "platform": "cf",
                "start_time": start_time,
                "duration_seconds": c.duration_seconds,
                "status": status,
                "url": c.url,
            })

        return Response(result)
