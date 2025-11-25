from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.errors import ValidationError as MEValidationError
from .serializers import TestcaseCreateSerializer, TestcaseUpdateSerializer
from .models import Testcase
from problem.models import Problem
from contest.utils.auth import get_user_from_request


class TestcaseCreateAPIView(APIView):
    """
    POST /testcases/
    Create a single testcase (sample or hidden)
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = TestcaseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        problem = Problem.objects(id=data["problem_id"]).first()
        if not problem:
            return Response({"error": "Problem not found"}, status=404)

        # Only contest creator/admin can add testcase
        if not (str(problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        tc = Testcase(
            problem=problem,
            sample=data.get("sample", False),
            input_data=data["input_data"],
            output_data=data["output_data"],
            time_limit_override=data.get("time_limit_override"),
            memory_limit_override=data.get("memory_limit_override"),
        )
        try:
            tc.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": "Testcase created",
            "id": str(tc.id),
            "sample": tc.sample
        }, status=201)


class TestcaseListByProblemAPIView(APIView):
    def get(self, request, problem_id):
        problem = Problem.objects(id=problem_id).first()
        if not problem:
            return Response({"error": "Problem not found"}, status=404)

        tcs = Testcase.objects(problem=problem)
        data = []
        for t in tcs:
            data.append({
                "id": str(t.id),
                "sample": t.sample,
                "time_limit_override": t.time_limit_override,
                "memory_limit_override": t.memory_limit_override,
            })
        return Response({"testcases": data})


class TestcaseDetailAPIView(APIView):
    """
    GET returns everything EXCEPT hidden testcase outputs to normal users
    Only problem owner/admin may view hidden details.
    """
    def get(self, request, testcase_id):
        tc = Testcase.objects(id=testcase_id).first()
        if not tc:
            return Response({"error": "Testcase not found"}, status=404)

        user = get_user_from_request(request)

        # If sample → show full details to everyone
        if tc.sample:
            return Response({
                "id": str(tc.id),
                "sample": True,
                "input_data": tc.input_data,
                "output_data": tc.output_data,
            })

        # Hidden testcase
        if not user:
            return Response({"error": "Hidden testcase"}, status=403)

        # Only contest creator/admin can view hidden testcases
        if not (str(tc.problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        return Response({
            "id": str(tc.id),
            "sample": False,
            "input_data": tc.input_data,
            "output_data": tc.output_data,
        })


class TestcaseUpdateAPIView(APIView):
    def patch(self, request, testcase_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Auth required"}, status=401)

        tc = Testcase.objects(id=testcase_id).first()
        if not tc:
            return Response({"error": "Not found"}, status=404)

        if not (str(tc.problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        serializer = TestcaseUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        for k, v in serializer.validated_data.items():
            setattr(tc, k, v)

        try:
            tc.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({"message": "Updated"})


class TestcaseDeleteAPIView(APIView):
    def delete(self, request, testcase_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Auth required"}, status=401)

        tc = Testcase.objects(id=testcase_id).first()
        if not tc:
            return Response({"error": "Not found"}, status=404)

        if not (str(tc.problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        tc.delete()
        return Response({"message": "Deleted"})
