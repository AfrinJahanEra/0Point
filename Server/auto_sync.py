import schedule
import time
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zeropoint.settings")  # ← CHANGE THIS!
django.setup()

from django.core.management import call_command

def sync_job():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Running sync_cf...")
    call_command("sync_cf")
    print("Done!\n")

# Run every 60 seconds
schedule.every(60).seconds.do(sync_job)

print("Started automatic Codeforces sync (every 60 seconds)")

while True:
    schedule.run_pending()
    time.sleep(1)