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
    
    def signal_handler(signum, frame):
        """Handle shutdown signals gracefully"""
        print("\n\nReceived shutdown signal, stopping server...")
        if process:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                print("Force killing server...")
                process.kill()
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Use subprocess instead of os.system for better control
        # Add timeout settings for graceful shutdown with Python 3.13
        process = subprocess.Popen(
            [
                'daphne',
                '-b', bind_address,
                '-p', str(port),
                '--application-close-timeout', '20',
                '--ping-interval', '20',
                '--ping-timeout', '30',
                'zeropoint.asgi:application'
            ],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        
        # Wait for the process to complete
        process.wait()
        
    except Exception as e:
        print(f"\n\nServer error: {e}")
        if process:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("Force killing server...")
                process.kill()
        sys.exit(1)


if __name__ == '__main__':
    main()