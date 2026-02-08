from django.core.management.base import BaseCommand
from account.models import Account, IPAddress
from datetime import datetime


class Command(BaseCommand):
    help = 'Migrate old ip_address field to new ip_addresses list'

    def handle(self, *args, **options):
        users = Account.objects.all()
        migrated_count = 0
        
        for user in users:
            # Check if user has old ip_address field
            if hasattr(user, 'ip_address') and user.ip_address:
                # Check if this IP already exists in the list
                ip_exists = False
                for ip_obj in user.ip_addresses:
                    if ip_obj.address == user.ip_address:
                        ip_exists = True
                        break
                
                # Add to list if not exists
                if not ip_exists:
                    ip_obj = IPAddress(
                        address=user.ip_address,
                        last_used=user.created_at or datetime.utcnow()
                    )
                    user.ip_addresses.append(ip_obj)
                    user.save()
                    migrated_count += 1
                    self.stdout.write(f"Migrated IP for user: {user.email}")
        
        self.stdout.write(
            self.style.SUCCESS(f'Migration complete. Migrated {migrated_count} users.')
        )