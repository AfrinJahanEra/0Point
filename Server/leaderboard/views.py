from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from contest.views import get_contest_status
from contest.utils.auth import get_user_from_request
from contest.models import Contest
from .models import ContestLeaderboard, LeaderboardEntry
from .serializers import FreezeSerializer, RecalculateSerializer
from .services import calculate_leaderboard
from submission.models import Submission

class LeaderboardView(APIView):
    """
    GET /contests/<id>/leaderboard/
    """
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        contest_status = get_contest_status(contest)
        current_user = get_user_from_request(request)
        current_user_id = str(current_user.id) if current_user else None

        # ====== Contest timing as naive Asia/Dhaka datetime ======
        if contest.start_time and contest.duration:
            start_time_dhaka = contest.start_time  # assume naive is Asia/Dhaka
            contest_end_time = start_time_dhaka + timedelta(minutes=contest.duration * 60)
        else:
            start_time_dhaka = None
            contest_end_time = None

        # ====== Filter submissions within contest duration ======
        if start_time_dhaka and contest_end_time:
            valid_submissions = Submission.objects(
                contest=contest,
                submitted_at__gte=start_time_dhaka,
                submitted_at__lte=contest_end_time
            ).order_by("submitted_at")
        else:
            valid_submissions = Submission.objects(contest=contest).order_by("submitted_at")

        # ====== Group submissions by user ======
        user_submissions = {}
        for submission in valid_submissions:
            user_id = str(submission.user.id)
            if user_id not in user_submissions:
                user_submissions[user_id] = {
                    "user": submission.user,
                    "submissions": []
                }
            user_submissions[user_id]["submissions"].append(submission)

        actual_problems = sorted([p.index for p in contest.problems])
        results = []

        for user_id, data in user_submissions.items():
            user = data["user"]
            problem_results = {}
            total_score = 0
            total_penalty = 0
            problems_solved = 0

            problem_points = {p.index: getattr(p, "points", 100) for p in contest.problems}

            # Group submissions by problem
            problem_submissions = {}
            for sub in data["submissions"]:
                idx = sub.problem_index
                if idx not in problem_submissions:
                    problem_submissions[idx] = []
                problem_submissions[idx].append(sub)

            for problem_index, subs_list in problem_submissions.items():
                subs_list.sort(key=lambda x: x.submitted_at)
                accepted = False
                tries = 0
                penalty = 0
                solved_time = 0
                points_earned = 0

                for sub in subs_list:
                    tries += 1
                    if sub.verdict == "AC":
                        accepted = True
                        if start_time_dhaka:
                            solved_time = (sub.submitted_at - start_time_dhaka).total_seconds() / 60
                        points_earned = problem_points.get(problem_index, 100)
                        if tries > 1:
                            penalty += (tries - 1) * 20
                        break

                time_penalty = solved_time + penalty
                problem_results[problem_index] = {
                    "tries": tries,
                    "time": solved_time,
                    "penalty": penalty,
                    "verdict": "ACCEPTED" if accepted else "WRONG_ANSWER",
                    "points": points_earned,
                    "max_points": problem_points.get(problem_index, 100),
                    "accepted": accepted,
                    "has_submissions": tries > 0
                }

                if accepted:
                    total_score += points_earned
                    total_penalty += time_penalty
                    problems_solved += 1

            is_current_user = current_user_id == user_id if current_user_id else False
            user_rating = getattr(user, "rating", 1500)

            submissions_display = []
            for problem in actual_problems:
                pdata = problem_results.get(problem, {})
                status = "NA"
                points = 0
                tries = 0
                if pdata:
                    tries = pdata.get("tries", 0)
                    if pdata.get("accepted"):
                        status = "AC"
                        points = pdata.get("points", 0)
                    elif tries > 0:
                        status = "WA"
                submissions_display.append({
                    "problem": problem,
                    "status": status,
                    "points": points,
                    "tries": tries
                })

            results.append({
                "rank": 0,
                "username": getattr(user, "username", getattr(user, "name", "Anonymous")),
                "name": getattr(user, "name", "Anonymous"),
                "country": getattr(user, "country", "Unknown"),
                "institution": getattr(user, "institution", "Unknown"),
                "score": total_score,
                "points": total_score,
                "problemsSolved": problems_solved,
                "penalty": total_penalty,
                "rating": user_rating,
                "ratingChange": 0,
                "isCurrentUser": is_current_user,
                "submissions": submissions_display,
                "problemResults": problem_results
            })

        # ====== Sort and assign ranks ======
        results.sort(key=lambda x: (-x["score"], x["penalty"]))
        last_score = last_penalty = None
        current_rank = 0
        for i, participant in enumerate(results):
            if participant["score"] != last_score or participant["penalty"] != last_penalty:
                current_rank = i + 1
                last_score = participant["score"]
                last_penalty = participant["penalty"]
            participant["rank"] = current_rank

        # ====== Calculate rating changes if contest is past ======
        if contest_status == "past":
            all_ratings = [p["rating"] for p in results]
            for participant in results:
                expected_rank = self.calculate_expected_rank(participant["rating"], all_ratings)
                actual_rank = participant["rank"]
                participant["ratingChange"] = self.calculate_rating_change(
                    participant["rating"], expected_rank, actual_rank, len(results)
                )

        return Response({
            "leaderboard": results,
            "contest_status": contest_status,
            "total_participants": len(results),
            "problems": actual_problems,
            "contest_info": {
                "start_time": start_time_dhaka.isoformat() if start_time_dhaka else None,
                "end_time": contest_end_time.isoformat() if contest_end_time else None,
                "duration": contest.duration
            }
        })

    def calculate_expected_rank(self, user_rating, all_ratings):
        expected_score = 0
        for other_rating in all_ratings:
            if user_rating != other_rating:
                expected_score += 1 / (1 + 10 ** ((other_rating - user_rating) / 400))
        return expected_score + 1

    def calculate_rating_change(self, user_rating, expected_rank, actual_rank, total_participants):
        k_factor = 32
        performance_diff = expected_rank - actual_rank
        return int(round(performance_diff * (k_factor / total_participants)))

class FreezeLeaderboardView(APIView):
    """
    PATCH /contests/<id>/leaderboard/freeze/
    """
    def patch(self, request, contest_id):
        user = get_user_from_request(request)
        if not user or user.role != "admin":
            return Response({"error": "Admin only"}, status=403)

        serializer = FreezeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        is_frozen = serializer.validated_data["is_frozen"]

        lb = ContestLeaderboard.objects(contest=contest).first()
        if not lb:
            lb = ContestLeaderboard(contest=contest)

        lb.is_frozen = is_frozen
        if is_frozen:
            lb.frozen_at = datetime.utcnow()

        lb.save()

        return Response({"message": f"Leaderboard {'frozen' if is_frozen else 'unfrozen'}"})

class RecalculateLeaderboardView(APIView):
    """
    POST /contests/<id>/leaderboard/recalculate/
    """
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user or user.role != "admin":
            return Response({"error": "Admin only"}, status=403)

        serializer = RecalculateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        apply_freeze = serializer.validated_data["apply_freeze"]

        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Not found"}, status=404)

        entries = calculate_leaderboard(contest, apply_freeze=apply_freeze)

        return Response({
            "message": "Leaderboard recalculated",
            "entries": len(entries)
        })
    

