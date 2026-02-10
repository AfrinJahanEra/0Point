"""
Prediction Service for Difficulty Estimation
Real-time difficulty prediction for new problems
"""

import os
import pickle
import numpy as np
import re
import pandas as pd


class DifficultyPredictionService:
    """Service for predicting problem difficulty"""
    
    def __init__(self, model_path=None):
        if model_path is None:
            # Use latest model by default
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, 'trained_models', 'latest_model.pkl')
        
        self.model_path = model_path
        self.model_data = None
        self.load_model()
    
    def load_model(self):
        """Load trained model and preprocessors"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        
        with open(self.model_path, 'rb') as f:
            self.model_data = pickle.load(f)
        
        self.model = self.model_data['model']
        self.scaler = self.model_data['scaler']
        self.feature_names = self.model_data['feature_names']
        self.model_name = self.model_data['model_name']
        self.reverse_label_mapping = self.model_data['reverse_label_mapping']
        
        print(f"Model loaded: {self.model_name}")
    
    def extract_features(self, problem_data):
        """
        Extract features from problem data
        
        Args:
            problem_data: dict with keys:
                - statement: problem statement text
                - tags: list of tags
                - test_cases: list of test cases (optional)
        
        Returns:
            numpy array of features
        """
        statement = problem_data.get('statement', '')
        tags = problem_data.get('tags', [])
        test_cases = problem_data.get('test_cases', [])
        
        features = {}
        
        # Statement features
        statement_features = self._extract_statement_features(statement)
        features.update(statement_features)
        
        # Tag features
        tag_features = self._extract_tag_features(tags)
        features.update(tag_features)
        
        # Solution features (estimated from test cases complexity)
        solution_features = self._estimate_solution_features(test_cases, statement)
        features.update(solution_features)
        
        # Convert to DataFrame with correct feature order
        feature_df = pd.DataFrame([features])
        feature_df = feature_df[self.feature_names]
        
        return feature_df.values
    
    def _extract_statement_features(self, statement):
        """Extract features from problem statement"""
        if not statement:
            return {
                'statement_length': 0,
                'statement_word_count': 0,
                'statement_avg_word_length': 0,
                'has_mathematical_notation': 0,
                'complexity_indicators': 0
            }
        
        statement = str(statement)
        words = statement.split()
        
        # Count complexity indicators
        complexity_keywords = [
            'optimize', 'minimize', 'maximize', 'optimal', 'efficient',
            'algorithm', 'complexity', 'constraint', 'recursive', 'dynamic',
            'graph', 'tree', 'matrix', 'array', 'subsequence', 'permutation',
            'shortest path', 'longest', 'minimum', 'maximum'
        ]
        complexity_count = sum(1 for keyword in complexity_keywords if keyword in statement.lower())
        
        # Check for mathematical notation
        has_math = int(bool(re.search(r'[\$\^\{\}\[\]]|\\[a-zA-Z]+', statement)))
        
        return {
            'statement_length': len(statement),
            'statement_word_count': len(words),
            'statement_avg_word_length': np.mean([len(w) for w in words]) if words else 0,
            'has_mathematical_notation': has_math,
            'complexity_indicators': complexity_count
        }
    
    def _extract_tag_features(self, tags):
        """Extract features from problem tags"""
        if not tags:
            return {
                'num_tags': 0,
                'has_dp': 0,
                'has_graph': 0,
                'has_greedy': 0,
                'has_math': 0,
                'has_implementation': 0,
                'has_data_structures': 0
            }
        
        tags_lower = [str(t).lower() for t in tags]
        
        return {
            'num_tags': len(tags),
            'has_dp': int(any('dp' in t or 'dynamic' in t for t in tags_lower)),
            'has_graph': int(any('graph' in t for t in tags_lower)),
            'has_greedy': int(any('greedy' in t for t in tags_lower)),
            'has_math': int(any('math' in t for t in tags_lower)),
            'has_implementation': int(any('implementation' in t for t in tags_lower)),
            'has_data_structures': int(any('data' in t or 'structure' in t or 'tree' in t or 'heap' in t for t in tags_lower))
        }
    
    def _estimate_solution_features(self, test_cases, statement):
        """Estimate solution complexity from test cases and statement"""
        # Default values
        features = {
            'solution_length': 500,  # Average value
            'solution_lines': 30,
            'num_loops': 1,
            'num_conditions': 2,
            'has_recursion': 0
        }
        
        # Adjust based on test case complexity
        if test_cases:
            max_input_length = max(len(str(tc.get('input', ''))) for tc in test_cases)
            
            if max_input_length > 1000:
                features['solution_length'] = 1000
                features['solution_lines'] = 50
                features['num_loops'] = 3
            elif max_input_length > 100:
                features['solution_length'] = 700
                features['solution_lines'] = 40
                features['num_loops'] = 2
        
        # Adjust based on statement keywords
        statement_lower = str(statement).lower()
        
        if 'recursive' in statement_lower or 'recursion' in statement_lower:
            features['has_recursion'] = 1
            features['solution_length'] = 800
        
        if 'dynamic programming' in statement_lower or 'dp' in statement_lower:
            features['num_loops'] = 3
            features['solution_length'] = 900
        
        if 'graph' in statement_lower or 'tree' in statement_lower:
            features['num_loops'] = 2
            features['num_conditions'] = 3
        
        return features
    
    def predict(self, problem_data):
        """
        Predict difficulty for a problem
        
        Args:
            problem_data: dict with problem information
        
        Returns:
            dict with prediction results:
                - difficulty: predicted difficulty (Easy/Medium/Hard)
                - confidence: confidence score
                - probabilities: probability for each class
        """
        # Extract features
        features = self.extract_features(problem_data)
        
        # Scale features if needed
        if self.model_name in ['Logistic Regression', 'SVM']:
            features_scaled = self.scaler.transform(features)
        else:
            features_scaled = features
        
        # Predict
        prediction = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        
        # Get predicted class
        difficulty = self.reverse_label_mapping[prediction]
        confidence = float(probabilities[prediction])
        
        return {
            'difficulty': difficulty,
            'confidence': confidence,
            'probabilities': {
                'Easy': float(probabilities[0]),
                'Medium': float(probabilities[1]),
                'Hard': float(probabilities[2])
            },
            'model_name': self.model_name
        }
    
    def predict_batch(self, problems_data):
        """Predict difficulty for multiple problems"""
        results = []
        for problem in problems_data:
            result = self.predict(problem)
            results.append(result)
        return results


# Global service instance
_service_instance = None


def get_prediction_service():
    """Get or create prediction service singleton"""
    global _service_instance
    if _service_instance is None:
        try:
            _service_instance = DifficultyPredictionService()
        except FileNotFoundError:
            print("Warning: Model not found. Please train the model first.")
            return None
    return _service_instance
