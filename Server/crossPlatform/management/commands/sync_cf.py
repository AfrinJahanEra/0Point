from django.core.management.base import BaseCommand
from crossPlatform.services.codeforces import sync_codeforces_contests

class Command(BaseCommand):
    help = "Sync Codeforces contests"

    def handle(self, *args, **kwargs):
        sync_codeforces_contests()
        self.stdout.write(self.style.SUCCESS("Codeforces synced"))
