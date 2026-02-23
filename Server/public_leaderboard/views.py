# leaderboard/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from account.models import Account
from contest.models import ContestRegistration
from .serializers import LeaderboardSerializer


class GlobalLeaderboardView(APIView):

    def get(self, request):

        # Fetch active users sorted by rating descending
        users = Account.objects(
            is_deleted=False,
            is_inactive=False
        ).order_by('-rating')

        leaderboard_data = []
        current_rank = 1

        for index, user in enumerate(users):

            # Count contests participated
            contests_count = ContestRegistration.objects(
                user=user
            ).count()

            leaderboard_data.append({
                "user_id": str(user.id),
                "username": user.name,
                "total_points": user.rating,
                "department": user.department,
                "contests_participated": contests_count,
                "rank": current_rank
            })

            current_rank += 1

        serializer = LeaderboardSerializer(leaderboard_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

