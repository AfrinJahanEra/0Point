# clarification/utils.py
from datetime import datetime
from .models import Clarification


def notify_organizers_new_clarification(clarification):
    """Notify organizers about new clarification (placeholder)"""
    # In real implementation, you would:
    # 1. Send notifications to online organizers
    # 2. Send email notifications
    # 3. Update organizer dashboard
    
    print(f"DEBUG: New clarification submitted: {clarification.title}")
    print(f"DEBUG: Problem: {clarification.problem_index or 'General'}")
    print(f"DEBUG: Author: {clarification.author.name if clarification.author else 'Unknown'}")


def can_user_ask_clarification(user, contest):
    """Check if user can ask clarification for this contest"""
    if not user:
        return False
    
    # Check contest status
    from contest.views import get_contest_status
    contest_status = get_contest_status(contest)
    
    if contest_status not in ["live", "upcoming", "test"]:
        return False
    
    # For test contests, anyone can ask
    if contest_status == "test":
        return True
    
    # For regular contests, check registration
    from contest.models import ContestRegistration
    is_registered = ContestRegistration.objects.filter(
        user=user, contest=contest
    ).first()
    
    return bool(is_registered)


def get_clarification_stats(contest, user=None):
    """Get clarification statistics for a contest"""
    total = Clarification.objects(contest=contest).count()
    published = Clarification.objects(contest=contest, is_published=True).count()
    pending = Clarification.objects(contest=contest, status='pending').count()
    answered = Clarification.objects(contest=contest, is_answered=True).count()
    
    stats = {
        "total": total,
        "published": published,
        "pending": pending,
        "answered": answered,
        "unanswered": published - answered
    }
    
    # Add user-specific stats if user provided
    if user:
        user_total = Clarification.objects(contest=contest, author=user).count()
        user_pending = Clarification.objects(
            contest=contest, author=user, status='pending'
        ).count()
        user_answered = Clarification.objects(
            contest=contest, author=user, is_answered=True
        ).count()
        
        stats["user"] = {
            "total": user_total,
            "pending": user_pending,
            "answered": user_answered
        }
    
    return stats