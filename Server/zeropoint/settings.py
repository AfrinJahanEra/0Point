from pathlib import Path
import os
from mongoengine import connect
import cloudinary
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(dotenv_path=BASE_DIR / '.env')
SECRET_KEY = os.getenv('SECRET_KEY')

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEBUG = True

ALLOWED_HOSTS = ['*']

# Fix for Python 3.13 async shutdown issues
os.environ.setdefault('ASGI_THREADS', '1')

# Suppress Python 3.13 shutdown warnings for async tasks
import warnings
import asyncio
warnings.filterwarnings('ignore', message='.*was never awaited.*')
warnings.filterwarnings('ignore', message='.*coroutine.*was never awaited.*')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'account',
    'contest',
    'submission',
    'leaderboard',
    'announcement',
    'executor',
    'mock_interview',
    'videoconference',
    'pdf',
    'ide',
    'corsheaders',
    'channels',
    'compiler',
    'virtual',
    'discussion',
    'clarification',
    'testcontest',
    'crossPlatform',
    'blog',
    'Chatapp',
    'difficulty_prediction',
    'public_leaderboard',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # must be high up
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'pdf.middleware.PDFCacheMiddleware',  # Custom middleware for PDF cache control
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # Re-enabled but configured for PDF embedding
]

ROOT_URLCONF = 'zeropoint.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'zeropoint.wsgi.application'

# Connect to MongoDB with fallback
import sys
import time

def connect_to_mongo():
    # Try MongoDB Atlas first (production database)
    try:
        mongo_uri = os.getenv('MONGO_URI')
        db_name = os.getenv('MONGO_DB_NAME', 'zeropoint')
        
        # Updated MongoDB Atlas connection with proper parameters
        connect(
            db=db_name,
            host=mongo_uri,
            alias='default',
            tls=True,
            tlsAllowInvalidCertificates=True,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            serverSelectionTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        )
        print("Successfully connected to MongoDB Atlas")
        return True
    except Exception as atlas_e:
        print(f"Warning: Could not connect to MongoDB Atlas: {atlas_e}")
        
        # Try local MongoDB as fallback
        try:
            connect(
                db='zeropoint',
                host='mongodb://localhost:27017/',
                alias='default',
                connectTimeoutMS=10000,
                socketTimeoutMS=10000,
                serverSelectionTimeoutMS=10000,
                retryWrites=True,
                w='majority'
            )
            print("Successfully connected to local MongoDB (fallback)")
            return True
        except Exception as local_e:
            print(f"Warning: Could not connect to local MongoDB: {local_e}")
            print("App will run with limited functionality - database operations will fail")
            return False

connect_to_mongo()

ASGI_APPLICATION = "zeropoint.asgi.application"

# Redis Configuration for Django Channels
if os.getenv('DJANGO_ENV') == 'production':
    REDIS_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379')
else:
    REDIS_URL = 'redis://127.0.0.1:6379'

# Channel Layers Configuration
if os.getenv('REDIS_URL'):
    # Production: Use Redis for real-time features (WebSocket support)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
    print(f"Using Redis Channel Layer: {REDIS_URL}")
else:
    # Development: Use in-memory channel layer
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        },
    }
    print("Using InMemory Channel Layer")

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'UNAUTHENTICATED_USER': None,
}

CORS_ALLOWED_ORIGINS = [
    'https://0-point.vercel.app',
    'http://localhost:5173',  
]

CORS_ALLOW_CREDENTIALS = True

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

# Email Configuration
# For development, you can switch to console backend to see emails in terminal
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Uncomment for dev
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Dhaka'   # ✅ CHANGE THIS
USE_TZ = True             # ✅ CHANGE THIS

USE_I18N = True

STATIC_URL = 'static/'
STATICFILES_DIRS = []

# Only add static directory if it exists
if (BASE_DIR / 'static').exists():
    STATICFILES_DIRS.append(BASE_DIR / 'static')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# X-Frame-Options setting to allow PDF embedding in iframes
X_FRAME_OPTIONS = 'SAMEORIGIN'

# JDoodle API Settings
JD_CLIENT_ID = os.getenv('JD_CLIENT_ID')
JD_CLIENT_SECRET = os.getenv('JD_CLIENT_SECRET')
JD_API_URL = os.getenv('JD_API_URL', 'https://api.jdoodle.com/v1/execute')



