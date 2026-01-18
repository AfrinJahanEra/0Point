# testcontest/models.py
import datetime
from mongoengine import Document, EmbeddedDocument, DictField
from mongoengine import (
    StringField, DateTimeField, FloatField, IntField,
    BooleanField, EmbeddedDocumentField, EmbeddedDocumentListField,
    ReferenceField, ListField
)
from account.models import Account
from contest.models import Contest, TestCase, ContestProblem

class TestContest(Document):

    meta = {'collection': 'test_contest'}
    
    # Reference to original draft contest
    original_contest = ReferenceField(Contest, required=True)
    
    # Test contest fields (copy of contest fields)
    title = StringField(required=True)
    description = StringField()
    start_time = DateTimeField(required=True)
    duration = FloatField(required=True)
    type = StringField()
    platform = StringField()
    
    # Testers who can access this test contest
    testers = ListField(StringField(), default=list)  # List of emails
    
    # Problems (embedded copy)
    problems = EmbeddedDocumentListField(ContestProblem, default=list)
    
    # Creator reference
    created_by = ReferenceField(Account, null=True)
    
    # Test contest specific fields
    visibility = StringField(choices=["test"], default="test")
    status = StringField(choices=["draft", "upcoming", "live", "past"], default="upcoming")
    
    # Timestamps
    created_at = DateTimeField()
    test_start_time = DateTimeField(required=True)
    
    # Contest settings copy
    registration_required = BooleanField(default=True)
    email_notifications = BooleanField(default=True)
    leaderboard_public = BooleanField(default=True)
    allow_practice = BooleanField(default=True)
    rating_changes = BooleanField(default=True)
    editorial_published = BooleanField(default=False)

class TestContestSubmission(Document):
    """Model for storing test contest submissions"""
    
    meta = {'collection': 'test_contest_submission'}
    
    # References
    test_contest = ReferenceField(TestContest, required=True)
    user = ReferenceField(Account, required=True)
    
    # Contest problem info
    problem_index = StringField(required=True)
    problem_code = StringField(required=True)
    problem_title = StringField()
    
    # Submission data
    code = StringField(required=True)
    language = StringField(required=True, choices=['python', 'cpp', 'java', 'javascript', 'c'])
    
    verdict = StringField(required=True, default='PENDING', 
                         choices=['PENDING', 'RUNNING', 'AC', 'WA', 'TLE', 'MLE', 'CE', 'RE', 'SE'])
    execution_time = IntField(default=0)  # milliseconds
    memory = IntField(default=0)  # KB
    
    passed_test_cases = IntField(default=0)
    total_test_cases = IntField(default=0)
    failed_test_case = IntField(default=-1)
    
    error_message = StringField()
    compile_output = StringField()
    
    # Timestamps
    submitted_at = DateTimeField(default=datetime.datetime.now)
    judged_at = DateTimeField()
    
    # Test contest timing (minutes from test_start_time)
    test_contest_time = FloatField(default=0)
    
    # Metadata
    is_public = BooleanField(default=True)
    is_test_contest = BooleanField(default=True)
    
    def calculate_test_contest_time(self, test_start_time):
        """Calculate test contest time in minutes"""
        if test_start_time and self.submitted_at:
            time_diff = self.submitted_at - test_start_time
            self.test_contest_time = time_diff.total_seconds() / 60
        return self.test_contest_time or 0
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'test_contest_id': str(self.test_contest.id),
            'user_id': str(self.user.id),
            'user_name': self.user.name,
            'user_email': self.user.email,
            'problem_index': self.problem_index,
            'problem_code': self.problem_code,
            'problem_title': self.problem_title,
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
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'judged_at': self.judged_at.isoformat() if self.judged_at else None,
            'test_contest_time': self.test_contest_time,
            'is_test_contest': self.is_test_contest
        }
    
# class TestContestRegistration(Document):
#     """Registration for test contests"""
#     meta = {'collection': 'test_contest_registration'}
#     contest = ReferenceField(TestContest)
#     user = ReferenceField(Account)
#     registered_at = DateTimeField()

# testcontest/models.py - Add these classes at the end of the file
