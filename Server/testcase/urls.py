from django.urls import path
from .views import (
    TestcaseCreateAPIView,
    TestcaseListByProblemAPIView,
    TestcaseDetailAPIView,
    TestcaseUpdateAPIView,
    TestcaseDeleteAPIView,
)

urlpatterns = [
    path("testcases/", TestcaseCreateAPIView.as_view(), name="testcase-create"),
    path("problems/<str:problem_id>/testcases/", TestcaseListByProblemAPIView.as_view(), name="problem-testcases"),
    path("testcases/<str:testcase_id>/", TestcaseDetailAPIView.as_view(), name="testcase-detail"),
    path("testcases/<str:testcase_id>/update/", TestcaseUpdateAPIView.as_view(), name="testcase-update"),
    path("testcases/<str:testcase_id>/delete/", TestcaseDeleteAPIView.as_view(), name="testcase-delete"),
]
