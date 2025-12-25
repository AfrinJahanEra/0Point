from django.urls import path
from .views import CreateSession

urlpatterns = [
    path('create-session/', CreateSession.as_view(), name='create-session'),
]