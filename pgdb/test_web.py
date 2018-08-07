from django.test import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class SeleniumTest(LiveServerTestCase):

    def setUp(self):
        #self.chrome = webdriver.Remote(
        #        command_executor='http://selenium_hub:4444/wd/hub',
        #        desired_capabilities=DesiredCapabilities.CHROME
        #        )
        #self.chrome.implicitly_wait(10)
        self.firefox = webdriver.Remote(
                command_executor='http://selenium_hub:4444/wd/hub',
                desired_capabilities=DesiredCapabilities.FIREFOX
                )
        self.firefox.implicitly_wait(10)

    def test_visit_site(self):
        self.firefox.get(self.live_server_url)
        self.assertIn(self.firefox.title, 'ISCAN')

