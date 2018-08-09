import time
import socket


from celery.contrib.testing.worker import start_worker
from django.test import LiveServerTestCase
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from django.contrib.auth.models import Group, User
from django.test import override_settings

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


    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_databases_chrome(self):
        self.chrome.get(self.docker_url)
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.chrome.find_element_by_link_text("Log in").click() 
        self.chrome.find_element_by_id("username").send_keys('testuser')
        self.chrome.find_element_by_id("password").send_keys('12345')
        self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/form").submit()
        self.chrome.find_element_by_link_text("Corpora").click()
        self.chrome.find_element_by_link_text("acoustic").click()
        
        #Check warning is up
        self.assertIn("alert", self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div[2]").get_attribute("class"))

        self.chrome.find_element_by_link_text("Databases").click()

        #Starts database
        self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/table/tbody/tr/td[6]/button[1]").click()
        wait = WebDriverWait(self.chrome, 100)
        element = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div/div/table/tbody/tr/td[6]/button[2]")))

        #Go to corpus
        self.chrome.find_element_by_link_text("Corpora").click()
        self.chrome.find_element_by_link_text("acoustic").click()
        #Import
        import_button = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div[3]/button")))
        import_button.click()
        self.chrome.refresh()
        time.sleep(200)



