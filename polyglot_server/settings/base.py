# Django settings for polyglot_server project.
import os
import sys


def env(key, default=None):
    """Retrieves env vars and makes Python boolean replacements"""
    val = os.getenv(key, default)

    if val == 'True':
        val = True
    elif val == 'False':
        val = False
    return val


def env_list(key, default=""):
    val = os.getenv(key, default)
    return val.split(",")


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PROJECT_DIR = env(
    "DJANGO_PROJECT_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

SITE_DIR = env(
    "SITE_DIR",
    os.path.abspath(os.path.join(PROJECT_DIR, '..', '..', '..')))


sys.path.insert(0, os.path.join(PROJECT_DIR, 'apps', ))

DEBUG = env("DJANGO_DEBUG", False)
DOCKER = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS


DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'postgres',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'db',
        'PORT': '5432'}}

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
#ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", '*')
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver', '0.0.0.0', '132.206.84.241']

INSTALLED_APPS = (
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sitemaps',

    'django_extensions',
    'compressor',
    'django_celery_results',

    'rest_framework',
    'rest_framework.authtoken',
    'pgdb',
    'annotator',
    'intonation',
    'sekizai',

)

MIDDLEWARE = (
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.common.CommonMiddleware',
    'htmlmin.middleware.HtmlMinifyMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',

    'htmlmin.middleware.MarkRequestMiddleware',
)

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

LANGUAGES = (
    ('en-us', 'English'),
)

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = env(
    "DJANGO_MEDIA_ROOT",
    os.path.abspath(os.path.join(SITE_DIR, 'htdocs', 'media')))

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = env(
    "DJANGO_STATIC_ROOT",
    os.path.abspath(os.path.join(SITE_DIR, 'htdocs', 'static')))
#STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = [
    # os.path.join(ANGULAR_APP_DIR),
    #os.path.join(PROJECT_DIR, 'static'),
    ('node_modules', '/site/proj/node_modules'),
]

TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',

    'compressor.finders.CompressorFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = env(
    "DJANGO_SECRET_KEY", '1s(wsqn%(gvu92f%%l2(vwaiewz_6xnx&9v15z^40-jq3&0%)0')

CORS_ALLOW_CREDENTIALS = True

#CORS_ORIGIN_ALLOW_ALL = True
CORS_ORIGIN_WHITELIST = (
   'localhost:8080',
   '127.0.0.1:8080'
)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(PROJECT_DIR, 'templates')],
        #'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'sekizai.context_processors.sekizai',
            ],
        },
    },
]

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

COMPRESS_ENABLED = True
COMPRESS_PRECOMPILERS = (
    ('text/x-sass', 'sass {infile} {outfile}'),
    ('text/x-scss', 'sass --scss {infile} {outfile}'),
)

ROOT_URLCONF = 'polyglot_server.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'polyglot_server.wsgi.application'

EXCLUDE_FROM_MINIFYING = ('^files/', '^admin/', '^media/')

CELERY_RESULT_BACKEND = 'django-db'
CELERY_BROKER_URL = env("CELERY_BROKER_URL",
                        "amqp://guest:guest@localhost:5672//")

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
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    )
}

# Logger
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': True,
#     'formatters': {
#         'standard': {
#             'format' : "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
#             'datefmt' : "%d/%b/%Y %H:%M:%S"
#         },
#     },
#     'handlers': {
#         'null': {
#             'level':'DEBUG',
#             'class':'logging.NullHandler',
#         },
#         'logfile': {
#             'level':'DEBUG',
#             'class':'logging.handlers.RotatingFileHandler',
#             'filename': "logfile",
#             'maxBytes': 50000,
#             'backupCount': 2,
#             'formatter': 'standard',
#         },
#         'console':{
#             'level':'INFO',
#             'class':'logging.StreamHandler',
#             'formatter': 'standard'
#         },
#     },
#     'loggers': {
#         'django': {
#             'handlers':['console'],
#             'propagate': True,
#             'level':'WARN',
#         },
#         'django.db.backends': {
#             'handlers': ['console'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#         'polyglot_server': {
#             'handlers': ['console', 'logfile'],
#             'level': 'DEBUG',
#         },
#     }
# }

HTML_MINIFY = True

## Polyglot-server settings

IS_TESTING = 'test' in sys.argv

SOURCE_DATA_DIRECTORY = os.path.join('/site/proj/test_data', 'source')

POLYGLOT_DATA_DIRECTORY = os.path.join('/site/proj/test_data', 'data')

if not IS_TESTING:
    try:
        from .local_settings import *
    except ImportError:
        pass

POLYGLOT_TEMP_DIR = os.path.join(POLYGLOT_DATA_DIRECTORY, 'downloads')

POLYGLOT_QUERY_DIRECTORY = os.path.join(POLYGLOT_DATA_DIRECTORY, 'queries')

POLYGLOT_ENRICHMENT_DIRECTORY = os.path.join(POLYGLOT_DATA_DIRECTORY, 'enrichments')

NEO4J_VERSION = '3.3.3'

INFLUXDB_VERSION = '1.2.4'

BASE_NEO4J_PORT = 7400

BASE_INFLUXDB_PORT = 8400
