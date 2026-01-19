# crossPlatform/management/commands/sync_all_contests.py
from django.core.management.base import BaseCommand
from crossPlatform.services.atcoder import sync_atcoder_contests
from crossPlatform.services.codeforces import sync_codeforces_contests
from crossPlatform.services.leetcode import sync_leetcode_contests
from crossPlatform.services.codechef import sync_codechef_contests



class Command(BaseCommand):
    help = "Sync contests from all supported platforms"

    def handle(self, *args, **kwargs):
        print("Starting full contest sync...")

        sync_codeforces_contests()
        self.stdout.write(self.style.SUCCESS("→ Codeforces done"))

        sync_leetcode_contests()
        self.stdout.write(self.style.SUCCESS("→ LeetCode done"))

        sync_codechef_contests()
        self.stdout.write(self.style.SUCCESS("→ CodeChef done"))

        sync_atcoder_contests()
        self.stdout.write(self.style.SUCCESS("→ AtCoder done"))

     
        self.stdout.write(self.style.SUCCESS("\nAll platforms synchronized!"))