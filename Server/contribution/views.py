# contribution/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.queryset.visitor import Q

from account.models import Account
from blog.models import Blog
from contest.models import Contest
from blog.views import get_user_from_request


class ContributionRankingAPIView(APIView):
    """
    Simple API to get user contributions and ranking
    Returns: user name, total contributions, and rank
    """
    
    def get(self, request):
        """
        Get all users with their contribution counts, sorted by rank
        Query params:
        - limit: Number of top users to return (optional)
        """
        
        # Check authentication (optional - remove if you want public access)
        # user = get_user_from_request(request)
        # if not user:
        #     return Response({"error": "Authentication required"}, status=401)
        
        try:
            # Get limit from query params (default: return all users)
            limit = request.GET.get('limit')
            if limit:
                try:
                    limit = int(limit)
                except ValueError:
                    limit = None
            
            # Get all active users
            users = Account.objects.filter(is_deleted=False)
            
            # Calculate contributions for each user
            ranking = []
            for user_account in users:
                # Count published blogs
                blogs_count = Blog.objects.filter(
                    author=user_account, 
                    is_published=True
                ).count()
                
                # Count contests created
                contests_count = Contest.objects.filter(
                    created_by=user_account
                ).count()
                
                total = blogs_count + contests_count
                
                # Only include users with at least one contribution
                if total > 0:
                    ranking.append({
                        "user_id": str(user_account.id),
                        "name": user_account.name,
                        "total_contributions": total,
                        "blogs": blogs_count,
                        "contests": contests_count
                    })
            
            # Sort by total contributions (highest first)
            ranking.sort(key=lambda x: x['total_contributions'], reverse=True)
            
            # Add rank numbers
            for idx, user_data in enumerate(ranking, start=1):
                user_data['rank'] = idx
            
            # Apply limit if specified
            if limit:
                ranking = ranking[:limit]
            
            return Response({
                "count": len(ranking),
                "ranking": ranking
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in ContributionRankingAPIView: {str(e)}")
            return Response({
                "error": f"Failed to fetch rankings: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        