# virtual/models.py
from mongoengine import Document, ReferenceField, DateTimeField, StringField, FloatField, BooleanField, DictField, IntField
from account.models import Account
from contest.models import Contest
import datetime

class VirtualContest(Document):
    meta = {'collection': 'virtual_contest'}
    
    # Reference to the original contest
    original_contest = ReferenceField(Contest, required=True)
    
    # User who started the virtual contest
    user = ReferenceField(Account, required=True)
    
    # Virtual contest timing
    virtual_start_time = DateTimeField(required=True)
    virtual_end_time = DateTimeField(required=True)
    
    # Status (always "past" for virtual contests)
    status = StringField(default="past")
    
    # Settings
    show_rating_changes = BooleanField(default=False)  # Won't affect real rating
    leaderboard_public = BooleanField(default=True)
    allow_practice = BooleanField(default=True)
    
    # Metadata
    created_at = DateTimeField(default=datetime.datetime.now)
    is_completed = BooleanField(default=False)
    completed_at = DateTimeField()
    
    # User progress tracking
    user_progress = DictField(default={})  # {problem_index: {attempts: int, solved: bool, best_time: float}}

class VirtualContestSubmission(Document):
    meta = {'collection': 'virtual_contest_submission'}
    
    # References
    virtual_contest = ReferenceField(VirtualContest, required=True)
    original_submission = ReferenceField('submission.Submission', null=True)
    
    # Submission data
    user = ReferenceField(Account, required=True)
    contest = ReferenceField(Contest, required=True)  # Original contest reference
    problem_index = StringField(required=True)
    problem_code = StringField(required=True)
    problem_title = StringField()
    
    code = StringField(required=True)
    language = StringField(required=True, choices=['python', 'cpp', 'java', 'javascript', 'c'])
    
    verdict = StringField(required=True, default='PENDING', 
                         choices=['PENDING', 'RUNNING', 'AC', 'WA', 'TLE', 'MLE', 'CE', 'RE', 'SE'])
    execution_time = IntField(default=0)
    memory = IntField(default=0)
    
    passed_test_cases = IntField(default=0)
    total_test_cases = IntField(default=0)
    failed_test_case = IntField(default=-1)
    
    error_message = StringField()
    compile_output = StringField()
    
    # Virtual contest timing
    virtual_submitted_at = DateTimeField(required=True)
    judged_at = DateTimeField()
    
    # Virtual contest time (minutes from virtual start)
    virtual_contest_time = FloatField(default=0)
    
    # Metadata
    is_public = BooleanField(default=True)
    is_virtual = BooleanField(default=True)
    
    def calculate_virtual_time(self, virtual_start_time):
        """Calculate virtual contest time"""
        if virtual_start_time and self.virtual_submitted_at:
            time_diff = self.virtual_submitted_at - virtual_start_time
            self.virtual_contest_time = time_diff.total_seconds() / 60
        return self.virtual_contest_time
    
    