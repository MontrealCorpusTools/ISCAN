import time
import socket
import pytest


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
from django.test import override_settings, TestCase, LiveServerTestCase
from django.contrib.staticfiles.testing import StaticLiveServerTestCase

@pytest.mark.xfail
@pytest.mark.usefixtures("chrome_init")
class TestDatabase(StaticLiveServerTestCase):
    port = 8080

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
    def test_a_static(self):
        self.chrome.get('http://127.0.0.1:8080/static/node_modules/angular/angular.js')

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_databases_chrome(self):
        self.chrome.get('http://127.0.0.1:8080')
        for entry in self.chrome.get_log('browser'):
            print(entry['message'])

        self.chrome.find_element_by_link_text("Log in").click() 
        self.chrome.find_element_by_id("id_username").send_keys('testuser')
        self.chrome.find_element_by_id("id_password").send_keys('12345')
        self.chrome.find_element_by_id("loginForm").submit()
        self.chrome.implicitly_wait(30)
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
       # for filepath, csv_type in [("{}/speaker_info.csv".format(self.CSV_DIR), "Speaker CSV"), ("{}/can_comparison.csv".format(self.CSV_DIR), "Lexicon CSV")]:
       #     self.chrome.find_element_by_xpath(self.get_enrichment_xpath("csv-property")).click()

       #     #Name
       #     self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/label[1]/input").send_keys("{} enrichment".format(csv_type))

       #     #Type of CSV
       #     csv_opt = Select(self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/label[2]/select"))
       #     csv_opt.select_by_visible_text(csv_type)
       #     #File
       #     self.chrome.find_element_by_id("CSV-properties-file").send_keys(filepath)

       #     #submit 
       #     time.sleep(5)
       #     submit = self.chrome.find_element_by_xpath("/html/body/div/main/div/div/div/div/button")
       #     submit.click()

        #run enrichments
        table_xpath = "/html/body/div/main/div/div/div[1]/div[1]/table/tbody"
        #Run first 4 enrichments
        for i in range(1, 3):
            run_btn_path = "/html/body/div/main/div/div/div[1]/div[1]/table/tbody/tr[{}]/td[7]/button[1]".format(i)
            self.chrome.find_element_by_xpath(run_btn_path).click()
            #TODO: Make this wait relay on if the enrichment has actually run.
            time.sleep(5)
            wait.until(EC.element_to_be_clickable((By.XPATH, run_btn_path)))
        #Praat script
        self.chrome.find_element_by_xpath(self.get_enrichment_xpath("acoustics")).click()



