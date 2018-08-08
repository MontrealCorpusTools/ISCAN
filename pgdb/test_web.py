from django.test import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class SeleniumTest(LiveServerTestCase):

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

    def test_visit_site(self):
        self.firefox.get(self.docker_url)
        self.assertIn(self.firefox.title, 'ISCAN')

