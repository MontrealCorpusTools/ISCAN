
from .models import Database, Corpus

from django.forms import ModelForm

import logging
log = logging.getLogger(__name__)

class CorpusForm(ModelForm):
    class Meta:
        model = Corpus
        fields = ['name', 'source_directory', 'database']