from datetime import datetime
from account.models import Account, IPAddress


def migrate_existing_data():
    """Fix existing user data to be compatible with new schema"""
    users = Account.objects.all()
    fixed_count = 0
    
    for user in users:
        try:
            # If user has old ip_address field, move it to ip_addresses
            if hasattr(user, 'ip_address') and user.ip_address:
                # Check if this IP already exists in ip_addresses
                ip_exists = False
                for ip_obj in user.ip_addresses:
                    if ip_obj.address == user.ip_address:
                        ip_exists = True
                        break
                
                # Add to ip_addresses if not exists
                if not ip_exists:
                    ip_obj = IPAddress(
                        address=user.ip_address,
                        last_used=user.created_at or datetime.utcnow()
                    )
                    user.ip_addresses.append(ip_obj)
            
            # Save only if we made changes
            if user.is_modified():
                user.save()
                fixed_count += 1
                print(f"Fixed user: {user.email}")
                
        except Exception as e:
            print(f"Error fixing user {user.email}: {str(e)}")
    
    print(f"Migration complete. Fixed {fixed_count} users.")
    return fixed_count


if __name__ == "__main__":
    migrate_existing_data()