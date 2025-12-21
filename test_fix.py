import sys
import os

# Add the server directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Server'))

try:
    # Try to import the models to test if the fix worked
    from interview.models import SessionInvitation
    print("SUCCESS: SessionInvitation model imported successfully!")
    print("The timedelta import fix worked correctly.")
except Exception as e:
    print(f"ERROR: {e}")
    print("The fix did not work. Please check the implementation.")