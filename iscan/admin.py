import os
import subprocess
import shutil
from django.contrib import admin

from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.conf import settings

from .models import Database, Corpus, CorpusPermissions, Query, Enrichment

import logging
log = logging.getLogger(__name__)

admin.site.disable_action('delete_selected')


def delete_selected(self, request, queryset):
    for obj in queryset:
        obj.delete()


@admin.register(Corpus)
class CorpusAdmin(admin.ModelAdmin):
    pass


@admin.register(Database)
class DatabaseAdmin(admin.ModelAdmin):
    actions = [delete_selected]


@admin.register(CorpusPermissions)
class CorpusPermissionsAdmin(admin.ModelAdmin):
    pass


@admin.register(Query)
class QueryAdmin(admin.ModelAdmin):
    actions = [delete_selected]
    list_display = ['name', 'corpus', 'user', 'running', 'result_count']


@admin.register(Enrichment)
class EnrichmentAdmin(admin.ModelAdmin):
    actions = [delete_selected]

def create_tutorial_corpus(self, request, queryset):
    for obj in queryset:
        tutorial_name = 'spade-tutorial'
        base_dir = os.path.join(settings.SOURCE_DATA_DIRECTORY, tutorial_name)
        user_tutorial_name = 'spade-tutorial-{}'.format(obj.username)
        out_dir = os.path.join(settings.SOURCE_DATA_DIRECTORY, user_tutorial_name)
        print(user_tutorial_name, out_dir)
        if os.path.exists(out_dir):
            continue
        if not os.path.exists(base_dir):
            git_string = 'git+ssh://{}@{}:{}'.format(settings.SPADE_CONFIG['user'],
                                                      settings.SPADE_CONFIG['host'],
                                                      os.path.join(settings.SPADE_CONFIG['base_path'], tutorial_name))
            subprocess.call(['git', 'clone', git_string], cwd=settings.SOURCE_DATA_DIRECTORY)
        shutil.copytree(base_dir, out_dir)
        d, _ = Database.objects.get_or_create(name=user_tutorial_name)
        c, _ = Corpus.objects.get_or_create(name=user_tutorial_name, database=d)
        p = CorpusPermissions.objects.create(corpus=c, user=obj, can_edit=True, can_annotate=True, can_view_annotations=True,
                                             can_listen=True, can_view_detail=True, can_enrich=True, can_access_database=True)

# Define a new User admin
class UserAdmin(UserAdmin):
    actions = [create_tutorial_corpus]

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)