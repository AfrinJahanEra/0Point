import os
import sys
import signal
import subprocess
from django.core.management import execute_from_command_line
from django.conf import settings
from daphne.cli import CommandLineInterface
from zeropoint.asgi import application


def main():
    # Set the default port from Render's environment variable
    port = int(os.environ.get('PORT', 8000))
    bind_address = os.environ.get('BIND_ADDRESS', '0.0.0.0')
    
    # Run Django setup
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zeropoint.settings')
    
    print(f"Starting Daphne server on {bind_address}:{port}")
    print("Press Ctrl+C to stop the server")
    
    # Start Daphne server with subprocess for better control
    process = None
    try:
        # Use subprocess instead of os.system for better control
        process = subprocess.Popen(
            ['daphne', '-b', bind_address, '-p', str(port), 'zeropoint.asgi:application'],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        # Wait for the process to complete
        process.wait()
        
    except KeyboardInterrupt:
        print("\n\nShutting down server gracefully...")
        if process:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("Force killing server...")
                process.kill()
        print("Server stopped.")
        sys.exit(0)


if __name__ == '__main__':
    main()