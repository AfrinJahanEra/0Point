from pathlib import Path
import os
from mongoengine import connect
import cloudinary
from dotenv import load_dotenv
# zeropoint/settings.py
import mimetypes



load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'channels',
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
    # 'daphne',
    'compiler',
    'virtual',
    'discussion',
    'clarification',
    'testcontest',
    'crossPlatform',
    'blog',
]
JD_CLIENT_ID = os.getenv('JD_CLIENT_ID')
JD_CLIENT_SECRET = os.getenv('JD_CLIENT_SECRET')

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'pdf.middleware.MediaCORSHeadersMiddleware',
]

ROOT_URLCONF = 'zeropoint.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'zeropoint.wsgi.application'
ASGI_APPLICATION = "zeropoint.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

USE_MONGO = os.getenv('USE_MONGO', 'true').lower() == 'true'
MONGO_URI = os.getenv('MONGO_URI')

if USE_MONGO and MONGO_URI:
    try:
        connect(
            db=os.getenv('MONGO_DB_NAME', 'zeropoint'),
            host=MONGO_URI,
            alias='default',
        )
    except Exception as e:
        print(f"MongoDB connection failed: {e}")

# Fix MIME type for PDFs (critical for iframe)
mimetypes.add_type("application/pdf", ".pdf", strict=True)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': None,
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173'),
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-csrftoken",
]

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Dhaka'   # ✅ CHANGE THIS
USE_TZ = True             # ✅ CHANGE THIS

USE_I18N = True

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'




