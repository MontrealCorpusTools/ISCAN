import time

from django.test import LiveServerTestCase
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from django.contrib.auth.models import Group, User

class SeleniumTest(StaticLiveServerTestCase):

    @classmethod
    def setUpClass(cls):
        cls.host = "ps-app"
        cls.port = 24465
        super(SeleniumTest, cls).setUpClass()


    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    def setUp(self):
        self.chrome = webdriver.Remote(
                command_executor='http://selenium_hub:4444/wd/hub',
                desired_capabilities=DesiredCapabilities.CHROME
                )
        self.chrome.implicitly_wait(10)
        self.firefox = webdriver.Remote(
                command_executor='http://selenium_hub:4444/wd/hub',
                desired_capabilities=DesiredCapabilities.FIREFOX
                )
        self.firefox.implicitly_wait(10)
        self.docker_url = "http://ps-app:{}".format(self.server_thread.port)

    def tearDown(self):
        self.chrome.quit()
        self.firefox.quit()


    def test_databases_chrome(self):
        self.chrome.get(self.docker_url)
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.chrome.find_element_by_link_text("Log in").click() 
        self.chrome.find_element_by_id("username").send_keys('testuser')
        self.chrome.find_element_by_id("password").send_keys('12345')
        self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/form").submit()
        print(self.chrome.get_log("browser"))

        time.sleep(5)

