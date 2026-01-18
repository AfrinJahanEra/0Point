from django.urls import path
from .views import ExternalContestList

urlpatterns = [
    path("external/contests/", ExternalContestList.as_view()),
]
