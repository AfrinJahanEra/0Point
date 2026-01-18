# crossPlatform/services/base.py

from datetime import timedelta
from django.utils import timezone
from crossPlatform.models import ExternalContest


def cleanup_old_contests(platform: str, keep_days: int = 70):
    cutoff = timezone.now() - timedelta(days=keep_days)
    deleted = ExternalContest.objects(
        platform=platform,
        start_time__lt=cutoff
    ).delete()
    print(f"Cleaned {deleted} old {platform} contests")