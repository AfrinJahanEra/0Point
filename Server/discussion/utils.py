# discussion/utils.py
from datetime import datetime
from .models import Comment

def find_comment_by_id(comments, comment_id):
    """Find a comment by ID in a flat list"""
    for comment in comments:
        if str(comment.id) == comment_id:
            return comment
    return None

def get_comment_depth(comments, parent_comment_id):
    """Calculate depth for a new comment"""
    if not parent_comment_id:
        return 0  # Root comment
    
    # Find parent comment
    parent_comment = find_comment_by_id(comments, parent_comment_id)
    if parent_comment:
        return parent_comment.depth + 1
    
    return 0  # Fallback

def increment_parent_reply_count(comments, parent_comment_id):
    """Increment replies_count for parent comment"""
    if parent_comment_id:
        parent_comment = find_comment_by_id(comments, parent_comment_id)
        if parent_comment:
            parent_comment.replies_count += 1
            return True
    return False