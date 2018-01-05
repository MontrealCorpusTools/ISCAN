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
import polyglotdb.io as pgio
from polyglotdb.config import CorpusConfig
from polyglotdb.utils import get_corpora_list

from .utils import download_influxdb, download_neo4j, extract_influxdb, extract_neo4j, make_influxdb_safe, get_pids, \
    get_used_ports


# Create your models here.


class Database(models.Model):
    """
    Database objects contain meta data about the PolyglotDB databases, namely the Neo4j graph database and the InfluxDB
    time series database.

    Database objects are the way that Neo4j and InfluxDB get installed, started and stopped.
    """
    RUNNING = 'R'
    STOPPED = 'S'
    ERROR = 'E'
    STATUS_CHOICES = (
        (STOPPED, 'Stopped'),
        (RUNNING, 'Running'),
        (ERROR, 'Error'),
    )
    name = models.CharField(max_length=100, unique=True)
    neo4j_http_port = models.SmallIntegerField(blank=True)
    neo4j_https_port = models.SmallIntegerField(blank=True)
    neo4j_bolt_port = models.SmallIntegerField(blank=True)
    neo4j_admin_port = models.SmallIntegerField(blank=True)
    influxdb_http_port = models.SmallIntegerField(blank=True)
    influxdb_meta_port = models.SmallIntegerField(blank=True)
    influxdb_udp_port = models.SmallIntegerField(blank=True)
    influxdb_admin_port = models.SmallIntegerField(blank=True)
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default=STOPPED)
    neo4j_pid = models.IntegerField(null=True, blank=True)
    influxdb_pid = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name

    @property
    def num_corpora(self):
        return self.corpora.count()

    @property
    def directory(self):
        """
        Data directory to store all databases and corpora data

        :return:
        """
        return os.path.join(settings.POLYGLOT_DATA_DIRECTORY, self.name)

    @property
    def neo4j_exe_path(self):
        """
        The path to the Neo4j executable that will start and stop the graph database.

        :return:
        """
        exe_name = 'neo4j'
        if sys.platform.startswith('win'):
            exe_name += '.bat'
        return os.path.join(self.directory, 'neo4j', 'bin', exe_name)

    @property
    def influxdb_exe_path(self):
        """
        The path to the InfluxDB executable (or command on Mac) that will start the time series database (stopping is
        done through sending an interrupt signal).

        :return:
        """
        if sys.platform == 'darwin':
            return 'influxd'
        elif sys.platform.startswith('win'):
            return os.path.join(self.directory, 'influxdb', 'influxd.exe')
        else:
            return os.path.join(self.directory, 'influxdb', 'usr', 'bin', 'influxd')

    @property
    def log_path(self):
        """
        The path to the general error log for the database.

        :return:
        """
        return os.path.join(self.directory, 'error.log')

    @property
    def influxdb_conf_path(self):
        """
        Path to the configuration file for InfluxDB that specifies ports and enabled plugins.

        :return:
        """
        return os.path.join(self.directory, 'influxdb', 'influxdb.conf')

    @property
    def neo4j_log_path(self):
        """
        The path to the log file to store stdout and stderr for starting and stopping Neo4j instances.

        :return:
        """
        return os.path.join(self.directory, 'neo4j.log')

    @property
    def influxdb_log_path(self):
        """
        The path to the log file to store stdout and stderr for InfluxDB instances.

        :return:
        """
        return os.path.join(self.directory, 'influxdb.log')

    def start(self, timeout=60):
        """
        Function to start the components of a PolyglotDB database.  By the end both the Neo4j database and the InfluxDB
        database will be connectable.  This function blocks until connnections are made or until a timeout is reached.

        :return:
        """
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
                time.sleep(1)
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
            begin = time.time()
            while True:
                time.sleep(1)
                if time.time() - begin > timeout:
                    raise Exception(
                        'Connection to the Neo4j database could not be established in the specified timeout.')
                if self.is_running:
                    break
            self.status = 'R'
            self.save()
        except Exception as e:
            with open(self.log_path, 'a') as f:
                exc_type, exc_value, exc_traceback = sys.exc_info()
                traceback.print_exception(exc_type, exc_value, exc_traceback, file=f)
            return False
        return True

    @property
    def ports(self):
        return {'graph_http_port': self.neo4j_http_port, 'graph_bolt_port': self.neo4j_bolt_port,
                'acoustic_http_port': self.influxdb_http_port}

    @property
    def is_running(self):
        """
        Returns are boolean for where the database is currently running (i.e., processing Neo4j Cypher queries).

        :return:
        """
        c = CorpusConfig('')
        c.acoustic_user = None
        c.acoustic_password = None
        c.host = 'localhost'
        c.acoustic_http_port = self.influxdb_http_port
        c.graph_user = None
        c.graph_password = None
        c.graph_http_port = self.neo4j_http_port
        c.graph_bolt_port = self.neo4j_bolt_port
        try:
            get_corpora_list(c)
            return True
        except:
            return False

    def stop(self):
        """
        Function to stop a PolyglotDB's databases.  This is done through using Neo4j's stop utility and sending an interrupt
        signal to InfluxDB.  This function blocks until both databases are detected to have closed successfully.

        :return:
        """
        if self.neo4j_pid is None:
            raise Exception('Neo4j PID is None')
        if self.status in ['S', 'E']:
            raise Exception('Database is already stopped')
        try:
            os.kill(self.influxdb_pid, signal.SIGINT)
        except ProcessLookupError:
            if os.path.exists(self.log_path):
                with open(self.log_path, 'a') as f:
                    f.write('Could not find influxdb running with PID {}\n'.format(self.influxdb_pid))
        except Exception as e:
            if os.path.exists(self.log_path):
                with open(self.log_path, 'a') as f:
                    exc_type, exc_value, exc_traceback = sys.exc_info()
                    traceback.print_tb(exc_traceback, limit=1, file=f)

        if os.path.exists(self.log_path):
            with open(self.neo4j_log_path, 'a') as logf:
                neo4j_proc = subprocess.Popen([self.neo4j_exe_path, 'stop'],
                                              stdout=logf,
                                              stderr=logf,
                                              stdin=subprocess.DEVNULL)
                neo4j_proc.communicate()

            while True:
                pids = get_pids()
                if self.influxdb_pid not in pids and self.neo4j_pid not in pids:
                    break

        self.influxdb_pid = None
        self.neo4j_pid = None
        self.status = 'S'
        self.save()
        return True

    def install(self):
        """
        Performs the initial set up of a PolyglotDB database.  Vanilla Neo4j and InfluxDB installations are extracted
        (and downloaded if not already cached) and then configured to the specifics of the database.


        """
        shutil.rmtree(self.directory, ignore_errors=True)
        archive_path = download_neo4j()
        extract_neo4j(self.name, archive_path)
        if sys.platform == 'darwin':
            subprocess.call(['brew', 'update'])
            subprocess.call(['brew', 'install', 'influxdb'])
        else:
            archive_path = download_influxdb()
            extract_influxdb(self.name, archive_path)
        self._configure()

    def _configure(self):
        """
        This function performs the configuration for the Neo4j and InfluxDB databases.

        """
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
                                    meta_port=self.influxdb_meta_port,
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
        """
        Overwrites the default save method to install the corpus on save (provided it hasn't already been installed)
        """

        used_ports = get_used_ports()
        current_ports = []
        ports = {'neo4j': settings.BASE_NEO4J_PORT, 'influxdb': settings.BASE_INFLUXDB_PORT}
        port_names = ['neo4j_http_port', 'neo4j_https_port', 'neo4j_bolt_port', 'neo4j_admin_port',
                      'influxdb_http_port', 'influxdb_meta_port', 'influxdb_udp_port', 'influxdb_admin_port']
        for p in port_names:
            p_type = 'neo4j'
            if p.startswith('influx'):
                p_type = 'influxdb'
            if not getattr(self, p):
                while True:
                    if ports[p_type] not in used_ports and ports[p_type] not in current_ports:
                        setattr(self, p, ports[p_type])
                        ports[p_type] += 1
                        break
                    ports[p_type] += 1
            current_ports.append(getattr(self, p))

        super(Database, self).save(*args, **kwargs)
        if not os.path.exists(self.directory):
            self.install()

    def delete(self, *args, **kwargs):
        """
        Overwrites the default delete method to ensure the database is stopped and cleaned up from the disc before the
         object is deleted.
        """
        if self.status == 'R':
            self.stop()
        shutil.rmtree(self.directory, ignore_errors=True)
        super(Database, self).delete()


class Corpus(models.Model):
    """
    Corpus objects contain meta data about the PolyglotDB corpora and are the primary interface for running PolyglotDB code.
    """

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
    QUERY_RUNNING = 'QR'
    STATUS_CHOICES = (
        (NOT_IMPORTED, 'Not imported'),
        (IMPORTED, 'Imported'),
        (IMPORT_RUNNING, 'Import running'),
        (ENRICHMENT_RUNNING, 'Enrichment running'),
        (ACOUSTICS_RUNNING, 'Acoustics running'),
        (QUERY_RUNNING, 'Query running'),
    )
    status = models.CharField(max_length=2, default=NOT_IMPORTED, choices=STATUS_CHOICES)
    current_task_id = models.CharField(max_length=250, blank=True, null=True)

    def __str__(self):
        return self.name

    @property
    def data_directory(self):
        """
        Data directory for the corpus, where to store all associated sound files and meta data.
        :return: str
            Corpus's data directory
        """
        return self.database.directory

    @property
    def config(self):
        """
        Generates a :class:`~polyglotdb.CorpusConfig` object for use in connecting to a corpus using the PolyglotDB API.

        :return: :class:`~polyglotdb.CorpusConfig`
            CorpusConfig object to use to connect to the PolyglotDB corpus
        """
        c = CorpusConfig(str(self), data_dir=self.data_directory)
        c.acoustic_user = None
        c.acoustic_password = None
        c.host = 'localhost'
        c.acoustic_http_port = self.database.influxdb_http_port
        c.graph_user = None
        c.graph_password = None
        c.graph_http_port = self.database.neo4j_http_port
        c.graph_bolt_port = self.database.neo4j_bolt_port

        return c

    def delete(self, *args, **kwargs):
        """
        Overwrites the default delete method to ensure that corpus information is removed from the PolyglotDB database
        before the object is deleted.

        """
        with CorpusContext(self.config) as c:
            c.reset()
        super(Corpus, self).delete()

    def import_corpus(self):
        """
        Imports a corpus object into the PolyglotDB database using parameters from the object.

        """
        with CorpusContext(self.config) as c:
            c.reset()
            if self.input_format == 'B':
                parser = pgio.inspect_buckeye(self.source_directory)
            elif self.input_format == 'F':
                parser = pgio.inspect_fave(self.source_directory)
            elif self.input_format == 'M':
                parser = pgio.inspect_mfa(self.source_directory)
            elif self.input_format == 'L':
                parser = pgio.inspect_labbcat(self.source_directory)
            elif self.input_format == 'T':
                parser = pgio.inspect_timit(self.source_directory)
            elif self.input_format == 'P':
                parser = pgio.inspect_partitur(self.source_directory)
            else:
                return False
            c.load(parser, self.source_directory)
        self.status = 'I'
        self.save()

    @property
    def is_busy(self):
        """
        Denotes whether the Corpus can be interacted with, or if it is currently running a task.

        """
        return 'R' in self.status

    def query_corpus(self, query_config):
        with CorpusContext(self.config) as c:
            q = c.query_graph(getattr(c, query_config['to_find']))
            q.from_json(c, query_config)
            results = q.all()
        return results

    def enrich_corpus(self, enrichment_config):
        """
        Function that enriches a Corpus with further information.  Several enrichments are predefined and parameters are
        specified through the enrichment_config argument, which must have a key for 'type' of enrichment.  The enrichment
        types currently supported are:

        * pause
          * Encodes pauses, requires a 'pause_words' key in `enrichment_config`
        * utterance
          * Encodes utterances, optionally can specify 'pause_length' to use in encoding
        * syllabic
          * Encodes syllabic segments, requires a 'phones' key in `enrichment_config`
        * syllable
          * Encodes syllables, optionally can specify 'algorithm' for which syllabification algorithm to use (defaults to
            'maxonset')
        * hierarchical
          * Encodes properties based on the hierarchical structure, either 'count', 'rate', or 'position' must be specified
            in `enrichment_config`, along with 'higher_annotation_type', 'lower_annotation_type', 'name' and (optionally)
            'subset'.  See X in the PolyglotDB documentation for more information about hierarchical property encoding.

        :param enrichment_config:
        """
        if enrichment_config['type'] == 'pause':
            with CorpusContext(self.config) as c:
                c.encode_pauses(enrichment_config['pause_words'])
        elif enrichment_config['type'] == 'utterance':
            with CorpusContext(self.config) as c:
                c.encode_utterances(enrichment_config.get('pause_length', 0.5))
        elif enrichment_config['type'] == 'syllabic':
            with CorpusContext(self.config) as c:
                c.encode_syllabic_segments(enrichment_config['phones'])
        elif enrichment_config['type'] == 'syllable':
            with CorpusContext(self.config) as c:
                c.encode_syllables(enrichment_config.get('algorithm', 'maxonset'))
        elif enrichment_config['type'] == 'hierarchical':
            with CorpusContext(self.config) as c:
                if enrichment_config['hierarchical_type'] == 'count':
                    c.encode_count(enrichment_config['higher_annotation_type'],
                                   enrichment_config['lower_annotation_type'], enrichment_config['name'],
                                   enrichment_config.get('subset', None))
                elif enrichment_config['hierarchical_type'] == 'rate':
                    c.encode_rate(enrichment_config['higher_annotation_type'],
                                  enrichment_config['lower_annotation_type'], enrichment_config['name'],
                                  enrichment_config.get('subset', None))
                elif enrichment_config['hierarchical_type'] == 'position':
                    c.encode_position(enrichment_config['higher_annotation_type'],
                                      enrichment_config['lower_annotation_type'], enrichment_config['name'],
                                      enrichment_config.get('subset', None))
        self.status = 'I'
        self.save()

    @property
    def has_pauses(self):
        """
        Denotes whether pauses have been encoded for the Corpus
        :return: bool
        """
        with CorpusContext(self.config) as c:
            return c.has_pauses

    @property
    def has_utterances(self):
        """
        Denotes whether utterances have been encoded for the Corpus
        :return: bool
        """
        with CorpusContext(self.config) as c:
            return c.has_utterances

    @property
    def has_syllabics(self):
        """
        Denotes whether syllabic segments have been encoded for the Corpus
        :return: bool
        """
        with CorpusContext(self.config) as c:
            return c.has_syllabics

    @property
    def has_syllables(self):
        """
        Denotes whether syllables have been encoded for the Corpus
        :return: bool
        """
        with CorpusContext(self.config) as c:
            return c.has_syllables


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
    # query = models.
