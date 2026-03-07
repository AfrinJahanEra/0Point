"""Clear all old recommendation cache from database"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zeropoint.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from recommendation.models import UserRecommendation

print("Clearing all old recommendation cache...")

# Count before deletion
count = UserRecommendation.objects.count()
print(f"Found {count} cached recommendations")

# Delete all
UserRecommendation.objects.delete()

# Verify deletion
remaining = UserRecommendation.objects.count()
print(f"Remaining after deletion: {remaining}")

print("\nDone! Old cached recommendations cleared.")
print("Now restart your server and the next request will fetch real problems from Codeforces API.")
