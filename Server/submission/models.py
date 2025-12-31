#submission/models.py
from mongoengine import Document, fields
from datetime import datetime, timedelta
import uuid

def dhaka_now():
    return datetime.now()  # naive datetime, assumed Dhaka local time

class Submission(Document):
    """Model for storing contest submissions"""
    
    id = fields.StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    contest = fields.ReferenceField('Contest', required=True, reverse_delete_rule=2)
    
    problem_index = fields.StringField(required=True)  # A, B, C, etc.
    problem_code = fields.StringField(required=True)
    problem_title = fields.StringField()
    
    user = fields.ReferenceField('Account', required=True, reverse_delete_rule=2)
    user_id = fields.StringField()
    
    code = fields.StringField(required=True)
    language = fields.StringField(required=True, choices=['python', 'cpp', 'java', 'javascript', 'c'])
    
    verdict = fields.StringField(required=True, default='PENDING', choices=['PENDING', 'RUNNING', 'AC', 'WA', 'TLE', 'MLE', 'CE', 'RE', 'SE'])
    execution_time = fields.IntField(default=0)  # milliseconds
    memory = fields.IntField(default=0)  # KB
    
    passed_test_cases = fields.IntField(default=0)
    total_test_cases = fields.IntField(default=0)
    failed_test_case = fields.IntField(default=-1)
    
    error_message = fields.StringField()
    compile_output = fields.StringField()
    
    submitted_at = fields.DateTimeField(default=dhaka_now)
    judged_at = fields.DateTimeField()
    
    contest_time = fields.FloatField(default=0)
    
    is_public = fields.BooleanField(default=True)
    is_current_user = fields.BooleanField(default=False)
    
    meta = {
        'collection': 'submissions',
        'indexes': [
            {'fields': ['contest', 'submitted_at'], 'name': 'contest_time_idx'},
            {'fields': ['contest', 'user'], 'name': 'contest_user_idx'},
            {'fields': ['contest', 'problem_index'], 'name': 'contest_problem_idx'},
            {'fields': ['contest', 'verdict'], 'name': 'contest_verdict_idx'},
            {'fields': ['user', 'submitted_at'], 'name': 'user_time_idx'},
            {'fields': ['submitted_at'], 'name': 'submitted_at_idx'},
        ],
        'ordering': ['-submitted_at']
    }

    def calculate_contest_time(self, contest_start_time):
        if contest_start_time and self.submitted_at:
            time_diff = self.submitted_at - contest_start_time
            self.contest_time = time_diff.total_seconds() / 60
        return self.contest_time or 0

    def to_dict(self):
        user_name = getattr(self.user, 'name', '') or getattr(self.user, 'username', '') \
                    or (getattr(self.user, 'email', '').split('@')[0] if getattr(self.user, 'email', '') else f"User_{str(self.user.id)[:8]}")
        user_email = getattr(self.user, 'email', '')

        submitted_at_dhaka = self.submitted_at or dhaka_now()
        judged_at_dhaka = self.judged_at

        return {
            'id': self.id,
            'contest_id': str(self.contest.id),
            'problem_index': self.problem_index,
            'problem_code': self.problem_code,
            'problem_title': self.problem_title,
            'user': str(self.user.id),
            'user_name': user_name,
            'user_email': user_email,
            'user_avatar': getattr(self.user, 'avatar_url', None),
            'user_rating': getattr(self.user, 'rating', 0),
            'code': self.code,
            'language': self.language,
            'verdict': self.verdict,
            'execution_time': self.execution_time,
            'memory': self.memory,
            'passed_test_cases': self.passed_test_cases,
            'total_test_cases': self.total_test_cases,
            'failed_test_case': self.failed_test_case,
            'error_message': self.error_message,
            'compile_output': self.compile_output,
            'submitted_at': submitted_at_dhaka.isoformat() if submitted_at_dhaka else None,
            'judged_at': judged_at_dhaka.isoformat() if judged_at_dhaka else None,
            'contest_time': self.contest_time,
            'is_public': self.is_public,
            'time': submitted_at_dhaka.isoformat() if submitted_at_dhaka else None,
        }


    