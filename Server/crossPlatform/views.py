from rest_framework.views import APIView
from rest_framework.response import Response
from crossPlatform.models import ExternalContest

class ExternalContestList(APIView):
    def get(self, request):
        platform = request.GET.get("platform", "codeforces")

        contests = ExternalContest.objects(
            platform=platform
        ).order_by("start_time")

        return Response([
            {
                "external_id": c.external_id,
                "title": c.title,
                "platform": "cf",
                "start_time": c.start_time,
                "duration_seconds": c.duration_seconds,
                "status": c.status,   # already correct
                "url": c.url,
            }
            for c in contests
        ])
