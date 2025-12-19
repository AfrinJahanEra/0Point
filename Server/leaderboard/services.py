from datetime import datetime, timedelta
from submission.models import Submission
from problem.models import Problem
from .models import LeaderboardEntry


def calculate_leaderboard(contest, apply_freeze=False):
    problems = Problem.objects(contest=contest)
    problem_indexes = [p.index for p in problems]

    entries = {}

    # Get all submissions of this contest
    subs = Submission.objects(problem__in=problems).order_by("submitted_at")

    contest_start = contest.start_time

    for s in subs:
        user_id = str(s.user.id)
        pindex = s.problem.index

        if user_id not in entries:
            entries[user_id] = LeaderboardEntry(
                contest=contest,
                user=s.user,
                problem_results={},
                total_score=0,
                total_penalty=0
            )

        entry = entries[user_id]

        # If freeze active → hide submissions after freeze point
        if apply_freeze:
            if datetime.utcnow() > contest.start_time + contest.duration - timedelta(minutes=5):
                entry.is_frozen = True

        # Initialize per-problem tracking
        if pindex not in entry.problem_results:
            entry.problem_results[pindex] = {"tries": 0, "time": 0, "verdict": None}

        result = entry.problem_results[pindex]

        # Already solved → ignore future submissions
        if result["verdict"] == "ACCEPTED":
            continue

        # Count wrong attempts
        if s.verdict not in ["ACCEPTED", "PENDING", "RUNNING"]:
            result["tries"] += 1

        # Accepted
        if s.verdict == "ACCEPTED":
            solve_time_min = int((s.submitted_at - contest_start).total_seconds() // 60)
            result["time"] = solve_time_min
            result["verdict"] = "ACCEPTED"

            entry.total_score += 1
            entry.total_penalty += solve_time_min + (20 * result["tries"])

    # Convert entries to list
    entries_list = list(entries.values())

    # Sort ICPC style
    entries_list.sort(key=lambda e: (-e.total_score, e.total_penalty))

    # Assign ranks
    for i, e in enumerate(entries_list, start=1):
        e.rank = i
        e.save()

    return entries_list
