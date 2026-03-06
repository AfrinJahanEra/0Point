from mongoengine import Document, IntField, StringField, ListField, DictField, DateTimeField
from datetime import datetime


class UserRecommendation(Document):
    """Separate collection for fast caching of AI recommendations"""
    user_id          = StringField(required=True, unique=False)
    generated_at     = DateTimeField(default=datetime.utcnow, required=True)
    recommendations  = ListField(DictField(), default=list)   # list of problem dicts
    practice_plan    = StringField(default="")
    weak_snapshot    = DictField(default=dict)                # {category: score, ...} at generation time
    version          = IntField(default=1)
    source           = StringField(default="groq-llama3.1")

    meta = {
        'collection': 'user_recommendations',
        'indexes': [
            {'fields': ['user_id', '-generated_at']},
            {'fields': ['user_id']}
        ],
        'ordering': ['-generated_at']
    }

    @classmethod
    def get_latest(cls, user_id):
        return cls.objects(user_id=str(user_id)).order_by('-generated_at').first()

    @classmethod
    def invalidate(cls, user_id):
        cls.objects(user_id=str(user_id)).delete()