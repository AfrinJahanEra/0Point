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
    'problem',
    'testcase',
    'submission',
    'leaderboard',
    'announcement',
    'tutorial',
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
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # must be high up
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
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
    # Try local MongoDB first (more reliable for development)
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
        print("Successfully connected to local MongoDB")
        return True
    except Exception as local_e:
        print(f"Warning: Could not connect to local MongoDB: {local_e}")
        
        # Try MongoDB Atlas as fallback
        try:
            mongo_uri = os.getenv('MONGO_URI')
            db_name = os.getenv('MONGO_DB_NAME', 'zeropoint')
            
            # Simple connection without complex URI manipulation
            connect(
                db=db_name,
                host=mongo_uri,
                alias='default',
                ssl=True,
                ssl_cert_reqs=False,
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
            print("App will run with limited functionality - database operations will fail")
            return False

connect_to_mongo()

ASGI_APPLICATION = "zeropoint.asgi.application"

# For development, using in-memory channel layer
# For production with Redis, uncomment the Redis configuration below
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    },
}

# Production Redis configuration (uncomment when Redis is available):
# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels_redis.core.RedisChannelLayer",
#         "CONFIG": {
#             "hosts": [("127.0.0.1", 6379)],
#         },
#     },
# }

# if os.getenv('DJANGO_ENV') == 'production':
#     REDIS_URL = os.getenv('REDIS_URL') 
# else:
#     REDIS_URL = 'redis://127.0.0.1:6379' 


# CHANNEL_LAYERS = {
#     'default': {
#         'BACKEND': 'channels_redis.core.RedisChannelLayer',
#         'CONFIG': {
#             'hosts': [REDIS_URL],
#         },
#     },
# }

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
    # 'https://tech-sage-5poh.vercel.app',
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

TIME_ZONE = 'Asia/Dhaka'   
USE_TZ = True             

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



