from django.contrib import admin

# Register your models here.

from . import models


class AnnotationCategoryAdmin(admin.ModelAdmin):
    pass


class ItemTypeAdmin(admin.ModelAdmin):
    pass


class AnnotationCategoryValueAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.AnnotationCategory, AnnotationCategoryAdmin)
admin.site.register(models.AnnotationCategoryValue, AnnotationCategoryValueAdmin)
admin.site.register(models.ItemType, ItemTypeAdmin)
