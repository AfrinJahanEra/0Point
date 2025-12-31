# pdf/urls.py
from django.urls import path
from .views import PDFSessionView

urlpatterns = [
    path('upload/session/<uuid:session_id>/', PDFSessionView.as_view(), name='pdf-session'),
]