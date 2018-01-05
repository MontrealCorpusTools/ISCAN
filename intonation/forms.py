from django import forms


class PitchAnalysisForm(forms.Form):
    source = forms.ChoiceField(choices=[('reaper', 'REAPER'), ('praat', 'Praat')])
    min_pitch = forms.IntegerField(max_value=500, min_value=0, initial=50)
    max_pitch = forms.IntegerField(max_value=1000, min_value=0, initial=500)

