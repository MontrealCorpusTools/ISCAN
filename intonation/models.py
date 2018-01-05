from django.db import models

# Create your models here.


class ItemType(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class AnnotationCategory(models.Model):
    item_type = models.ForeignKey(ItemType, on_delete=models.CASCADE, related_name='categories')
    label = models.CharField(max_length=100)

    def __str__(self):
        return '{} {}'.format(self.item_type, self.label)


class AnnotationCategoryValue(models.Model):
    category = models.ForeignKey(AnnotationCategory, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=100)

    def __str__(self):
        return '{} = {}'.format(self.category, self.value)
