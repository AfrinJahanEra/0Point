# leaderboard/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from account.models import Account
from contest.models import ContestRegistration
from .serializers import LeaderboardMinimalSerializer, LeaderboardSerializer


class GlobalLeaderboardView(APIView):

    def get(self, request):
        try:
            # Fetch active users sorted by rating descending
            users = Account.objects(
                is_deleted=False,
                is_inactive=False
            ).order_by('-rating')

            leaderboard_data = []
            current_rank = 1

            for index, user in enumerate(users):
                try:
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
                except Exception as e:
                    print(f"Error processing user {user.id}: {e}")
                    continue

            serializer = LeaderboardSerializer(leaderboard_data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in GlobalLeaderboardView: {e}")
            return Response([], status=status.HTTP_200_OK)


class LeaderboardMinimalView(APIView):

    def get(self, request):
        try:
            # Fetch active users sorted by rating descending
            users = Account.objects(
                is_deleted=False,
                is_inactive=False
            ).order_by('-rating')

            leaderboard_data = []
            current_rank = 1

            for user in users:
                try:
                    leaderboard_data.append({
                        "user_id": str(user.id),
                        "username": user.name,
                        "total_points": user.rating,
                        "rank": current_rank
                    })
                    current_rank += 1
                except Exception as e:
                    print(f"Error processing user: {e}")
                    continue

            serializer = LeaderboardMinimalSerializer(leaderboard_data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in LeaderboardMinimalView: {e}")
            return Response([], status=status.HTTP_200_OK)

