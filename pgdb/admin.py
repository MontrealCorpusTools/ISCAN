from django.contrib import admin

from .models import Database, Corpus

admin.site.disable_action('delete_selected')


def delete_selected(self, request, queryset):
    for obj in queryset:
        obj.delete()


class DatabaseAdmin(admin.ModelAdmin):
    actions = [delete_selected]


admin.site.register(Database, DatabaseAdmin)
admin.site.register(Corpus)
