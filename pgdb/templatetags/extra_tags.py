from django import template
from django.conf import settings
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.simple_tag
@stringfilter
def get_settings_val(setting):
    return getattr(settings, setting)
