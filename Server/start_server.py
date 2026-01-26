import os
import sys
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
    
    # Start Daphne server with correct binding
    os.system(f'daphne -b {bind_address} -p {port} zeropoint.asgi:application')


if __name__ == '__main__':
    main()