from django.contrib import admin

# Register your models here.
from . import models

class AnnotationFieldAdmin(admin.ModelAdmin):
    pass


class AnnotationAdmin(admin.ModelAdmin):
    pass


class AnnotationChoiceAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.AnnotationField, AnnotationFieldAdmin)
admin.site.register(models.Annotation, AnnotationAdmin)
admin.site.register(models.AnnotationChoice, AnnotationChoiceAdmin)