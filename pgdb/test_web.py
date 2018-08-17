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
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import TimeoutException
from django.contrib.auth.models import Group, User
from django.test import override_settings

class SeleniumTest(StaticLiveServerTestCase):

    CSV_DIR = "/site/proj/csvs"

    @classmethod
    def setUpClass(cls):
        cls.host = "ps-app" 
        cls.port = 24465

        super(SeleniumTest, cls).setUpClass()


    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    def setUp(self):
        d_chrome = DesiredCapabilities.CHROME
        d_chrome['loggingPrefs'] = { 'browser':'ALL' }
        self.chrome = webdriver.Remote(
                command_executor='http://selenium_hub:4444/wd/hub',
                desired_capabilities=d_chrome
                )
        self.chrome.implicitly_wait(10)

        d_firefox = DesiredCapabilities.FIREFOX
        d_firefox['loggingPrefs'] = { 'browser':'ALL' }
        self.firefox = webdriver.Remote(
                command_executor='http://selenium_hub:4444/wd/hub',
                desired_capabilities=d_firefox
                )
        self.firefox.implicitly_wait(10)
        self.docker_url = "http://ps-app:{}".format(self.server_thread.port)

    def tearDown(self):
        self.chrome.quit()
        self.firefox.quit()

    def get_enrichment_xpath(self, enrichment_type):
        enrichment_button_dict = {"phone_subset": "ul[1]/li[1]/button",
                                  "hierachy": "ul[1]/li[2]/button",
                                  "stress":  "ul[1]/li[3]/button",
                                  "csv-property": "ul[1]/li[4]/button",
                                  "acoustics": "ul[1]/li[5]/button",
                                  "pauses": "ul[2]/li[1]/button",
                                  "utterances": "ul[2]/li[2]/button",
                                  "syllables": "ul[2]/li[3]/button"}

        return "/html/body/div/main/div/div/div[1]/div[2]/{}".format(enrichment_button_dict[enrichment_type])

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_databases_chrome(self):
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.chrome.get(self.docker_url)
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
        wait = WebDriverWait(self.chrome, 120)
        element = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div/div/table/tbody/tr/td[6]/button[2]")))

        #Go to corpus
        self.chrome.find_element_by_link_text("Corpora").click()
        self.chrome.find_element_by_link_text("acoustic").click()
        #Import
        import_button = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div[3]/button")))
        import_button.click()
        self.chrome.refresh()

        enrichment_button = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div[1]/div[2]/div/button")))
        enrichment_button.click()



        #Encode sibilants
        self.chrome.find_element_by_xpath(self.get_enrichment_xpath("phone_subset")).click()
        sibilants_but = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div/div[2]/div[2]/button[1]")))
        sibilants_but.click()
        self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div[1]/button[1]").click()
        #Encode syllabics
        self.chrome.find_element_by_xpath(self.get_enrichment_xpath("phone_subset")).click()
        syllabics_but = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/main/div/div/div/div[2]/div[2]/button[2]")))
        syllabics_but.click()
        self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div[1]/button[1]").click()

        #Properties from CSV
        for filepath, csv_type in [("{}/speaker_info.csv".format(self.CSV_DIR), "Speaker CSV"), ("{}/can_comparison.csv".format(self.CSV_DIR), "Lexicon CSV")]:
            self.chrome.find_element_by_xpath(self.get_enrichment_xpath("csv-property")).click()

            #Name
            self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/label[1]/input").send_keys("{} enrichment".format(csv_type))

            #Type of CSV
            csv_opt = Select(self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/label[2]/select"))
            csv_opt.select_by_visible_text(csv_type)
            #File
            self.chrome.find_element_by_id("CSV-properties-file").send_keys(filepath)

            #submit 
            print(self.chrome.get_log("browser"))
            submit = self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/button")
            submit.click()

        #run enrichments
        table_xpath = "/html/body/div/main/div/div/div[1]/div[1]/table/tbody"
        #Run first 4 enrichments
        for i in range(1, 5):
            run_btn_path = "/html/body/div/main/div/div/div[1]/div[1]/table/tbody/tr[{}]/td[7]/button[1]".format(i)
            self.chrome.find_element_by_xpath(run_btn_path).click()
            #TODO: Make this wait relay on if the enrichment has actually run.
            time.sleep(5)
            wait.until(EC.element_to_be_clickable((By.XPATH, run_btn_path)))
        #Praat script
        self.chrome.find_element_by_xpath(self.get_enrichment_xpath("acoustics")).click()



