# Server/blog/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_blog, name='create_blog'),
    path('<str:blog_id>/save-draft/', views.save_draft, name='save_draft'),
    path('<str:blog_id>/publish/', views.publish_blog, name='publish_blog'),
    path('published/', views.list_published_blogs, name='list_published_blogs'),
    path('drafts/', views.list_user_drafts, name='list_user_drafts'),
    path('<str:blog_id>/', views.get_blog, name='get_blog'),
    path('create-test/', views.create_test_blog, name='create_test_blog'),
    
    # Blog voting endpoints
    path('<str:blog_id>/vote/', views.vote_blog, name='vote_blog'),
    path('<str:blog_id>/votes/', views.get_blog_votes, name='get_blog_votes'),
    
    # Comment endpoints
    path('<str:blog_id>/comments/', views.get_blog_comments, name='get_blog_comments'),
    path('<str:blog_id>/comments/create/', views.create_comment, name='create_comment'),
    path('comments/<str:comment_id>/delete/', views.delete_comment, name='delete_comment'),
    
    # Comment voting endpoints
    path('comments/<str:comment_id>/vote/', views.vote_comment, name='vote_comment'),
    path('comments/<str:comment_id>/votes/', views.get_comment_votes, name='get_comment_votes'),
]