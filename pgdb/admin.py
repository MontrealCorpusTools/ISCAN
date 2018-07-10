from django.contrib import admin

from .models import Database, Corpus, CorpusPermissions, Query, Enrichment

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
