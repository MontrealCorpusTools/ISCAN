import os
import subprocess
import shutil
from django.contrib import admin

from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.conf import settings

from .models import Database, Corpus, CorpusPermissions, Query, Enrichment, BackgroundTask

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

@admin.register(BackgroundTask)
class BackgroundTaskAdmin(admin.ModelAdmin):
    actions = [delete_selected]


@admin.register(Query)
class QueryAdmin(admin.ModelAdmin):
    actions = [delete_selected]
    list_display = ['name', 'corpus', 'user', 'running', 'result_count']


@admin.register(Enrichment)
class EnrichmentAdmin(admin.ModelAdmin):
    actions = [delete_selected]

# Define a new User admin
class UserAdmin(UserAdmin):
    actions = [delete_selected]

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
