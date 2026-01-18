# Server/auto_sync.py   (very minimal version)
import schedule
import time
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zeropoint.settings")
django.setup()

from django.core.management import call_command

def job():
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{ts}] Syncing all contests...")
    call_command("sync_all_contests")
    print(f"[{ts}] Done ✓\n")

# Choose one:
schedule.every(30).minutes.do(job)
# schedule.every(1).hour.do(job)
# schedule.every(4).hours.do(job)

print("Auto-sync (all platforms) started")
print(f"Interval: every {schedule.jobs[0].interval} {schedule.jobs[0].unit}")
print("="*65)

while True:
    schedule.run_pending()
    time.sleep(1)