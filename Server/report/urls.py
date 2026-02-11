from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_blog_report, name='create_blog_report'),
    path('pending/', views.get_pending_reports, name='get_pending_reports'),
    path('all/', views.get_all_reports, name='get_all_reports'),
    path('<str:report_id>/review/', views.review_report, name='review_report'),
]
