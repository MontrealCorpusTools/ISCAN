import os
import sys
import subprocess
import traceback
import signal
import time
import logging
import shutil
from django.db import models
from django.conf import settings

from polyglotdb import CorpusContext
from polyglotdb.config import CorpusConfig

from .utils import download_influxdb, download_neo4j, extract_influxdb, extract_neo4j, make_influxdb_safe

# Create your models here.


class Database(models.Model):
    RUNNING = 'R'
    STOPPED = 'S'
    ERROR = 'E'
    STATUS_CHOICES = (
        (STOPPED, 'Stopped'),
        (RUNNING, 'Running'),
        (ERROR, 'Error'),
    )
    name = models.CharField(max_length=100, unique=True)
    neo4j_http_port = models.SmallIntegerField()
    neo4j_https_port = models.SmallIntegerField()
    neo4j_bolt_port = models.SmallIntegerField()
    neo4j_admin_port = models.SmallIntegerField()
    influxdb_http_port = models.SmallIntegerField()
    influxdb_udp_port = models.SmallIntegerField()
    influxdb_admin_port = models.SmallIntegerField()
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default=STOPPED)
    neo4j_pid = models.IntegerField(null=True, blank=True)
    influxdb_pid = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name

    @property
    def directory(self):
        return os.path.join(settings.POLYGLOT_DATA_DIRECTORY, self.name)

    @property
    def neo4j_exe_path(self):
        exe_name = 'neo4j'
        if sys.platform.startswith('win'):
            exe_name += '.bat'
        return os.path.join(self.directory, 'neo4j', 'bin', exe_name)

    @property
    def influxdb_exe_path(self):
        if sys.platform == 'darwin':
            return 'influxd'
        elif sys.platform.startswith('win'):
            return os.path.join(self.directory, 'influxdb', 'influxd.exe')
        else:
            return os.path.join(self.directory, 'influxdb', 'usr', 'bin', 'influxd')

    @property
    def log_path(self):
        return os.path.join(self.directory, 'error.log')

    @property
    def influxdb_conf_path(self):
        return os.path.join(self.directory, 'influxdb', 'influxdb.conf')

    @property
    def neo4j_log_path(self):
        return os.path.join(self.directory, 'neo4j.log')

    @property
    def influxdb_log_path(self):
        return os.path.join(self.directory, 'influxdb.log')

    def start(self):
        if self.status in ['R']:
            print('R status')
            return False
        if self.influxdb_pid is not None or self.neo4j_pid is not None:
            print('pids are not None')
            return False
        try:
            with open(self.influxdb_log_path, 'a') as logf:
                influx_proc = subprocess.Popen([self.influxdb_exe_path, '-config', self.influxdb_conf_path],
                                               stdout=logf,
                                               stderr=logf,
                                               stdin=subprocess.DEVNULL,
                                               restore_signals=False,
                                               start_new_session=True)
                self.influxdb_pid = influx_proc.pid
            existing_neo4js = []
            if sys.platform.startswith('win'):
                neo4j_finder = 'WMIC PROCESS get Processid,Caption,Commandline'
            else:
                neo4j_finder = 'ps S'
            proc = subprocess.Popen(neo4j_finder, shell=True,
                                    stdout=subprocess.PIPE)
            stdout, stderr = proc.communicate()
            for line in stdout.decode('utf8').splitlines():
                if 'neo4j' in line and 'java' in line:
                    print(line.strip().split())
                    existing_neo4js.append(int(line.strip().split()[0]))

            with open(self.neo4j_log_path, 'a') as logf:
                neo4j_proc = subprocess.Popen([self.neo4j_exe_path, 'start'],
                                              stdout=logf,
                                              stderr=logf,
                                              stdin=subprocess.DEVNULL)
                neo4j_proc.communicate()
            neo4j_pid = None
            begin = time.time()
            while neo4j_pid is None:
                time.sleep(0.1)
                if time.time() - begin > 10:
                    return False
                proc = subprocess.Popen(neo4j_finder, shell=True,
                                        stdout=subprocess.PIPE)
                stdout, stderr = proc.communicate()
                for line in stdout.decode('utf8').splitlines():
                    if 'neo4j' in line and 'java' in line:
                        pid = int(line.strip().split()[0])
                        if pid in existing_neo4js:
                            continue
                        neo4j_pid = pid
                        break
            self.neo4j_pid = neo4j_pid
            self.status = 'R'
            self.save()
            time.sleep(5)
        except Exception as e:
            with open(self.log_path, 'a') as f:
                exc_type, exc_value, exc_traceback = sys.exc_info()
                traceback.print_tb(exc_traceback, limit=1, file=f)
            return False
        return True

    def stop(self):
        print(self.neo4j_pid)
        if self.neo4j_pid is None:
            raise Exception('Neo4j PID is None')
        if self.status in ['S', 'E']:
            raise Exception('Database is already stopped')
        try:
            os.kill(self.influxdb_pid, signal.SIGINT)
        except ProcessLookupError:
            with open(self.log_path, 'a') as f:
                f.write('Could not find influxdb running with PID {}\n'.format(self.influxdb_pid))
        except Exception as e:
            with open(self.log_path, 'a') as f:
                exc_type, exc_value, exc_traceback = sys.exc_info()
                traceback.print_tb(exc_traceback, limit=1, file=f)
        with open(self.neo4j_log_path, 'a') as logf:
            neo4j_proc = subprocess.Popen([self.neo4j_exe_path, 'stop'],
                                          stdout=logf,
                                          stderr=logf,
                                          stdin=subprocess.DEVNULL)
            neo4j_proc.communicate()
        #try:
        #    sig = signal.SIGTERM
            #if sys.platform.startswith('win'):
            #    sig = signal.CTRL_C_EVENT
        #    print(self.neo4j_pid)
        #    os.kill(self.neo4j_pid, sig)
        #except ProcessLookupError:
        #    with open(self.log_path, 'a') as f:
        #        f.write('Could not find neo4j running with PID {}\n'.format(self.neo4j_pid))
        #except Exception as e:
        #    with open(self.log_path, 'a') as f:
        #        exc_type, exc_value, exc_traceback = sys.exc_info()
        #        traceback.print_exception(exc_type, exc_value, exc_traceback,
        #                                  limit=2, file=f)

        self.influxdb_pid = None
        self.neo4j_pid = None
        self.status = 'S'
        self.save()
        time.sleep(10)
        return True

    def install(self):
        shutil.rmtree(self.directory, ignore_errors=True)
        archive_path = download_neo4j()
        extract_neo4j(self.name, archive_path)
        if sys.platform == 'darwin':
            subprocess.call(['brew', 'update'])
            subprocess.call(['brew', 'install', 'influxdb'])
        else:
            archive_path = download_influxdb()
            extract_influxdb(self.name, archive_path)
        self.configure()

    def configure(self):
        # NEO4J CONFIG
        neo4j_conf_path = os.path.join(self.directory, 'neo4j', 'conf', 'neo4j.conf')
        base_pgdb_dir = os.path.dirname(os.path.abspath(__file__))
        neo4j_template_path = os.path.join(base_pgdb_dir, 'config', 'neo4j.conf')
        with open(neo4j_template_path, 'r') as f:
            template = f.read()

        with open(neo4j_conf_path, 'w') as f:
            f.write(template.format(http_port=self.neo4j_http_port,
                                    https_port=self.neo4j_https_port,
                                    bolt_port=self.neo4j_bolt_port,
                                    auth_enabled='false'
                                    ))

        # INFLUXDB CONFIG
        influxdb_conf_path = os.path.join(self.directory, 'influxdb', 'influxdb.conf')
        base_pgdb_dir = os.path.dirname(os.path.abspath(__file__))
        influxdb_template_path = os.path.join(base_pgdb_dir, 'config', 'influxdb.conf')
        with open(influxdb_template_path, 'r') as f:
            template = f.read()
        with open(influxdb_conf_path, 'w') as f:
            f.write(template.format(http_port=self.influxdb_http_port,
                                    udp_port=self.influxdb_udp_port,
                                    admin_port=self.influxdb_admin_port,
                                    auth_enabled='false',
                                    data_directory=make_influxdb_safe(
                                        os.path.join(self.directory, 'influxdb', 'data')),
                                    wal_directory=make_influxdb_safe(
                                        os.path.join(self.directory, 'influxdb', 'wal')),
                                    meta_directory=make_influxdb_safe(
                                        os.path.join(self.directory, 'influxdb', 'meta'))))

    def save(self, *args, **kwargs):
        super(Database, self).save(*args, **kwargs)
        if not os.path.exists(self.directory):
            self.install()

    def delete(self, *args, **kwargs):
        if self.status == 'R':
            self.stop()
        shutil.rmtree(self.directory, ignore_errors=True)
        super(Database, self).delete()


class Corpus(models.Model):
    class Meta:
        verbose_name_plural = "corpora"

    MFA = 'M'
    FAVE = 'F'
    LABBCAT = 'L'
    PARTITUR = 'P'
    TIMIT = 'T'
    BUCKEYE = 'B'
    FORMAT_CHOICES = (
        (MFA, 'MFA forced aligned TextGrids'),
        (FAVE, 'FAVE forced aligned TextGrids'),
        (LABBCAT, 'LaBB-CAT TextGrid output'),
        (PARTITUR, 'Partitur files'),
        (TIMIT, 'TIMIT'),
        (BUCKEYE, 'Buckeye'),
    )
    name = models.CharField(max_length=100, unique=True)
    source_directory = models.FilePathField(path=settings.SOURCE_DATA_DIRECTORY,
                                            allow_files=False, allow_folders=True, default='')
    input_format = models.CharField(max_length=1, choices=FORMAT_CHOICES, default='M')
    database = models.ForeignKey(Database, on_delete=models.CASCADE, related_name='corpora')

    NOT_IMPORTED = 'NI'
    IMPORTED = 'I'
    IMPORT_RUNNING = 'IR'
    ENRICHMENT_RUNNING = 'ER'
    ACOUSTICS_RUNNING = 'AR'
    STATUS_CHOICES = (
        (NOT_IMPORTED, 'Not imported'),
        (IMPORTED, 'Imported'),
        (IMPORT_RUNNING, 'Import running'),
        (ENRICHMENT_RUNNING, 'Enrichment running'),
        (ACOUSTICS_RUNNING, 'Acoustics running'),
    )
    status = models.CharField(max_length=2, default=NOT_IMPORTED, choices=STATUS_CHOICES)
    current_task_id = models.CharField(max_length=250, blank=True, null=True)

    def __str__(self):
        return self.name

    @property
    def data_directory(self):
        return os.path.join(self.database.directory, self.name)

    @property
    def config(self):
        c = CorpusConfig(str(self), data_dir=self.data_directory)
        c.acoustic_user = None
        c.acoustic_password = None
        c.acoustic_host = 'localhost'
        c.acoustic_port = self.database.influxdb_http_port
        c.graph_user = None
        c.graph_password = None
        c.graph_host = 'localhost'
        c.graph_port = self.database.neo4j_http_port
        c.bolt_port = self.database.neo4j_bolt_port

        return c

    def delete(self, *args, **kwargs):
        with CorpusContext(self.config) as c:
            c.reset()
        super(Corpus, self).delete()


class Speaker(models.Model):
    name = models.CharField(max_length=100)
    corpus = models.ForeignKey(Corpus, on_delete=models.CASCADE, related_name='speakers')

    def __str__(self):
        return self.name


class Discourse(models.Model):
    name = models.CharField(max_length=100)
    corpus = models.ForeignKey(Corpus, on_delete=models.CASCADE, related_name='discourses')

    def __str__(self):
        return self.name


class SoundFile(models.Model):
    file_path = models.FilePathField(path=settings.SOURCE_DATA_DIRECTORY, match="*.wav",
                                     recursive=True, max_length=250)
    low_freq_path = models.FilePathField(path=settings.POLYGLOT_DATA_DIRECTORY, match="*.wav",
                                         recursive=True, max_length=250)
    vowel_freq_path = models.FilePathField(path=settings.POLYGLOT_DATA_DIRECTORY, match="*.wav",
                                           recursive=True, max_length=250)
    consonant_freq_path = models.FilePathField(path=settings.POLYGLOT_DATA_DIRECTORY, match="*.wav",
                                               recursive=True, max_length=250)

    duration = models.FloatField()

    num_channels = models.IntegerField(2)

    discourse = models.OneToOneField(Discourse, on_delete=models.CASCADE, related_name='sound_file')

    def __str__(self):
        return os.path.basename(self.file_path)


class PraatScript(models.Model):
    name = models.CharField(max_length=100, unique=True)

    file_path = models.FileField()

    description = models.TextField()

    def __str__(self):
        return self.name


class AcousticAnalysis(models.Model):
    name = models.CharField(max_length=100, unique=True)

    PRAAT = 'P'
    REAPER = 'R'
    ACOUSTICSIM = 'A'
    SOURCE_CHOICES = (
        (PRAAT, 'Praat'),
        (REAPER, 'REAPER'),
        (REAPER, 'Acousticsim'),
    )
    SPEAKER_ADAPTED = 'S'
    BASIC = 'B'
    GENDERED = 'G'
    ALGORITHM_CHOICES = (
        (SPEAKER_ADAPTED, 'Speaker-adapted'),
        (BASIC, 'Basic'),
        (GENDERED, 'Gendered'),
    )

    source = models.CharField(max_length=1, choices=SOURCE_CHOICES, default=PRAAT)

    algorithm = models.CharField(max_length=1, choices=ALGORITHM_CHOICES, default=SPEAKER_ADAPTED)
    script = models.ForeignKey(PraatScript, on_delete=models.CASCADE, related_name='analyses', null=True, blank=True)

    TIME_SERIES = 'T'
    POINT = 'P'
    TYPE_CHOICES = (
        (TIME_SERIES, 'Time series'),
        (POINT, 'Point'),
    )

    type = models.CharField(max_length=1, choices=TYPE_CHOICES)


class Query(models.Model):
    name = models.CharField(unique=True, max_length=100)
    export_file_name = models.CharField(max_length=250)
    #query = models.