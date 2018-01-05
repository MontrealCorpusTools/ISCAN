
from .models import Database, Corpus

from django.forms import ModelForm


class CorpusForm(ModelForm):
    class Meta:
        model = Corpus
        fields = ['name', 'source_directory', 'database']