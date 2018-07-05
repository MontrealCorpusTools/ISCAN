from django import forms
from django.views.generic import FormView
from django.urls import reverse_lazy
from django.contrib import messages
from polyglot_server.celery import app


class RunItFormDummy(forms.Form):
    arg1 = forms.IntegerField()
    arg2 = forms.IntegerField()


class RunItView(FormView):
    form_class = RunItFormDummy
    template_name = 'runit/runit.html'
    success_url = reverse_lazy('home')

    def form_valid(self, form):
        r = app.send_task('polyglot_server.add', args=(
            form.cleaned_data.get('arg1'),
            form.cleaned_data.get('arg2')))

        messages.info(
            self.request,
            "Job submitted with id <a href='{}' target='_blank'>{}</a>".format(
                reverse_lazy("admin:django_celery_results_taskresult_changelist"), # NOQA
                r.id))
        return super(RunItView, self).form_valid(form)
