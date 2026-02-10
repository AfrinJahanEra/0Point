from mongoengine import Document, StringField, FloatField, IntField, DateTimeField, DictField, ListField, BooleanField
from datetime import datetime


class DifficultyPredictionModel(Document):
    """Store trained model metadata"""
    model_name = StringField(required=True)
    model_version = StringField(required=True)
    model_path = StringField(required=True)
    accuracy = FloatField()
    precision = FloatField()
    recall = FloatField()
    f1_score = FloatField()
    trained_at = DateTimeField(default=datetime.utcnow)
    training_samples = IntField()
    is_active = BooleanField(default=True)
    
    meta = {
        'collection': 'difficulty_prediction_models'
    }


class PredictionHistory(Document):
    """Track prediction history"""
    problem_id = StringField()
    problem_title = StringField()
    problem_statement = StringField()
    problem_tags = ListField(StringField())
    predicted_difficulty = StringField()
    confidence_score = FloatField()
    prediction_details = DictField()
    created_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'prediction_history',
        'indexes': ['problem_id', 'created_at']
    }
