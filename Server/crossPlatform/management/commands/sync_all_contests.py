# crossPlatform/management/commands/sync_all_contests.py
from django.core.management.base import BaseCommand
from mongoengine.connection import get_connection
from pymongo.errors import ServerSelectionTimeoutError


class Command(BaseCommand):
    help = "Sync contests from all supported platforms"

    def handle(self, *args, **kwargs):
        print("Starting full contest sync...")
        
        # Check if database connection is available
        try:
            # Attempt to get the connection to check if it's working
            conn = get_connection()
            print("Database connection is available.")
        except Exception:
            print("Database connection is not available. Skipping contest sync.")
            self.stdout.write(self.style.WARNING("Database unavailable - sync skipped"))
            return
        
        # Import services only if database connection is available
        from crossPlatform.services.atcoder import sync_atcoder_contests
        from crossPlatform.services.codeforces import sync_codeforces_contests
        from crossPlatform.services.leetcode import sync_leetcode_contests
        from crossPlatform.services.codechef import sync_codechef_contests

        try:
            sync_codeforces_contests()
            self.stdout.write(self.style.SUCCESS("→ Codeforces done"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"→ Codeforces failed: {e}"))

        try:
            sync_leetcode_contests()
            self.stdout.write(self.style.SUCCESS("→ LeetCode done"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"→ LeetCode failed: {e}"))

        try:
            sync_codechef_contests()
            self.stdout.write(self.style.SUCCESS("→ CodeChef done"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"→ CodeChef failed: {e}"))

        try:
            sync_atcoder_contests()
            self.stdout.write(self.style.SUCCESS("→ AtCoder done"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"→ AtCoder failed: {e}"))
        
        self.stdout.write(self.style.SUCCESS("\nAll platforms synchronized!"))