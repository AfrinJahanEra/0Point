from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_user_notifications, name='get_user_notifications'),
    path('<str:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('<str:notification_id>/delete/', views.delete_notification, name='delete_notification'),
]
