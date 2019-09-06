import os
import sys
import pytest
import selenium

import django
from django.core import management


def pytest_configure(config):
    test_dir = os.path.dirname(os.path.abspath(__file__))
    test_data_dir = os.path.join(test_dir, 'data')
    pg_data_dir = os.path.join(test_data_dir, 'data')
    base_dir = os.path.dirname(test_dir)
    from django.conf import settings

    settings.configure(
        DEBUG_PROPAGATE_EXCEPTIONS=True,
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': os.path.join(os.path.dirname(__file__), 'test.db'),
                'TEST_NAME': os.path.join(os.path.dirname(__file__), 'test.db')
            }
        },
        SITE_ID=1,
        SECRET_KEY='not very secret in tests',
        USE_I18N=True,
        USE_L10N=True,
        STATIC_URL='/static/',
        ROOT_URLCONF='tests.urls',
        ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver', '0.0.0.0', '132.206.84.241'],
        TEMPLATES=[
            {
                'BACKEND': 'django.template.backends.django.DjangoTemplates',
                # 'DIRS': [],
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
        ],
        MIDDLEWARE=(
            'corsheaders.middleware.CorsMiddleware',
            'django.contrib.sessions.middleware.SessionMiddleware',
            'django.contrib.auth.middleware.AuthenticationMiddleware',
            'django.middleware.common.CommonMiddleware',
            'django.middleware.csrf.CsrfViewMiddleware',
            'django.middleware.locale.LocaleMiddleware',
            'django.contrib.messages.middleware.MessageMiddleware',
            'django.middleware.clickjacking.XFrameOptionsMiddleware',
            'django.middleware.security.SecurityMiddleware',
        ),
        INSTALLED_APPS=(
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
            'iscan',
            'iscan.annotator',
            'iscan.intonation',
            'sekizai',
            'rest_auth',
            'allauth',
            'allauth.account',
            'allauth.socialaccount',
            'rest_auth.registration',
        ),
        CORS_ALLOW_CREDENTIALS=True,

        CORS_ORIGIN_WHITELIST=(
            'localhost:8080',
            '127.0.0.1:8080'
        ),
        REST_AUTH_SERIALIZERS={
            'USER_DETAILS_SERIALIZER ': 'iscan.serializers.UserSerializer'
        },
        REST_FRAMEWORK = {
            'DEFAULT_AUTHENTICATION_CLASSES': (
                'rest_framework.authentication.TokenAuthentication',
                'rest_framework.authentication.BasicAuthentication',
                'rest_framework.authentication.SessionAuthentication',
            )
        },
        STATIC_ROOT = os.path.join(test_dir, 'static'),
        SOURCE_DATA_DIRECTORY=os.path.join(test_data_dir, 'source'),
        STATICFILES_DIRS=[
            # os.path.join(ANGULAR_APP_DIR),
            # os.path.join(PROJECT_DIR, 'static'),
            ('node_modules', os.path.join(base_dir, 'node_modules')),
        ],
        IS_TESTING=True,
        DOCKER=False,
        POLYGLOT_DATA_DIRECTORY=pg_data_dir,

        SPADE_CONFIG={},

        POLYGLOT_TEMP_DIR=os.path.join(pg_data_dir, 'downloads'),

        POLYGLOT_QUERY_DIRECTORY=os.path.join(pg_data_dir, 'queries'),

        POLYGLOT_ENRICHMENT_DIRECTORY=os.path.join(pg_data_dir, 'enrichments'),

        NEO4J_VERSION='3.4.5',

        INFLUXDB_VERSION='1.2.4',

        BASE_NEO4J_PORT=7400,

        BASE_INFLUXDB_PORT=8400,
        CELERY_ALWAYS_EAGER=True,
    )

    django.setup()
    management.call_command('makemigrations')
    management.call_command('migrate')


@pytest.fixture(scope="session")
def chrome_init(request):
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

    d_chrome = DesiredCapabilities.CHROME
    d_chrome['loggingPrefs'] = {'browser': 'ALL'}
    #chrome = webdriver.Remote(
    #    command_executor='http://localhost:4444/wd/hub',
    #    desired_capabilities=d_chrome
    #)
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome = webdriver.Chrome(options=chrome_options)
    chrome.implicitly_wait(10)

    session = request.node
    for item in session.items:
        cls = item.getparent(pytest.Class)
        setattr(cls.obj, "chrome", chrome)
    yield
    chrome.close()


@pytest.fixture(scope="session")
def firefox_init(request):
    from selenium import webdriver
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

    d_firefox = DesiredCapabilities.FIREFOX
    d_firefox['loggingPrefs'] = {'browser': 'ALL'}
    firefox = webdriver.Remote(
        command_executor='http://localhost:4444/wd/hub',
        desired_capabilities=d_firefox
    )
    firefox.implicitly_wait(10)

    #firefox = webdriver.Firefox()

    session = request.node
    for item in session.items:
        cls = item.getparent(pytest.Class)
        setattr(cls.obj, "firefox", firefox)
    yield
    firefox.quit()

def pytest_runtest_makereport(item, call):
    if "incremental" in item.keywords:
        if call.excinfo is not None:
            parent = item.parent
            parent._previousfailed = item


def pytest_runtest_setup(item):
    if "incremental" in item.keywords:
        previousfailed = getattr(item.parent, "_previousfailed", None)
        if previousfailed is not None:
            pytest.xfail("previous test failed (%s)" % previousfailed.name)