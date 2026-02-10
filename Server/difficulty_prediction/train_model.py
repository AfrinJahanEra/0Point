"""
Model Training Script for Difficulty Prediction
Trains multiple classifiers and selects the best one
"""

import pandas as pd
import numpy as np
import os
import pickle
import json
from datetime import datetime

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    classification_report, confusion_matrix
)
import matplotlib.pyplot as plt
import seaborn as sns


class DifficultyPredictor:
    """Difficulty prediction model trainer"""
    
    def __init__(self):
        self.models = {}
        self.best_model = None
        self.best_model_name = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.label_mapping = {'Easy': 0, 'Medium': 1, 'Hard': 2}
        self.reverse_label_mapping = {0: 'Easy', 1: 'Medium', 2: 'Hard'}
        
    def load_data(self, csv_path):
        """Load processed feature data"""
        print(f"Loading processed data from {csv_path}...")
        df = pd.read_csv(csv_path)
        
        # Separate features and labels
        X = df.drop(['problem_name', 'difficulty_label'], axis=1)
        y = df['difficulty_label'].map(self.label_mapping)
        
        self.feature_names = X.columns.tolist()
        
        print(f"Data loaded: {X.shape[0]} samples, {X.shape[1]} features")
        print(f"Label distribution:\n{df['difficulty_label'].value_counts()}")
        
        return X, y
    
    def split_data(self, X, y, test_size=0.2, val_size=0.1, random_state=42):
        """Split data into train/validation/test sets"""
        # First split: train+val vs test
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        # Second split: train vs val
        val_ratio = val_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_ratio, random_state=random_state, stratify=y_temp
        )
        
        print(f"\nData split:")
        print(f"  Training: {X_train.shape[0]} samples")
        print(f"  Validation: {X_val.shape[0]} samples")
        print(f"  Test: {X_test.shape[0]} samples")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def train_models(self, X_train, y_train, X_val, y_val):
        """Train multiple models and compare performance"""
        print("\n" + "="*50)
        print("Training Models...")
        print("="*50)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        
        # Define models
        model_configs = {
            'Random Forest': RandomForestClassifier(
                n_estimators=200,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'Gradient Boosting': GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=10,
                random_state=42
            ),
            'Logistic Regression': LogisticRegression(
                max_iter=1000,
                random_state=42
            ),
            'SVM': SVC(
                kernel='rbf',
                C=10,
                gamma='scale',
                random_state=42,
                probability=True
            )
        }
        
        results = {}
        
        for name, model in model_configs.items():
            print(f"\nTraining {name}...")
            
            # Use scaled data for all models
            if name in ['Logistic Regression', 'SVM']:
                model.fit(X_train_scaled, y_train)
                y_pred = model.predict(X_val_scaled)
            else:
                # Tree-based models can work with original data
                model.fit(X_train, y_train)
                y_pred = model.predict(X_val)
            
            # Calculate metrics
            accuracy = accuracy_score(y_val, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_val, y_pred, average='weighted'
            )
            
            results[name] = {
                'model': model,
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1
            }
            
            print(f"  Accuracy: {accuracy:.4f}")
            print(f"  Precision: {precision:.4f}")
            print(f"  Recall: {recall:.4f}")
            print(f"  F1-Score: {f1:.4f}")
            
            self.models[name] = model
        
        # Select best model based on F1-score
        best_name = max(results, key=lambda x: results[x]['f1_score'])
        self.best_model = results[best_name]['model']
        self.best_model_name = best_name
        
        print(f"\n{'='*50}")
        print(f"Best Model: {best_name}")
        print(f"  F1-Score: {results[best_name]['f1_score']:.4f}")
        print(f"{'='*50}")
        
        return results
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate best model on test set"""
        print("\n" + "="*50)
        print("Final Model Evaluation on Test Set")
        print("="*50)
        
        # Prepare test data
        if self.best_model_name in ['Logistic Regression', 'SVM']:
            X_test_prepared = self.scaler.transform(X_test)
        else:
            X_test_prepared = X_test
        
        # Predictions
        y_pred = self.best_model.predict(X_test_prepared)
        y_pred_proba = self.best_model.predict_proba(X_test_prepared)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='weighted'
        )
        
        print(f"\nTest Set Performance:")
        print(f"  Accuracy: {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(
            y_test, y_pred,
            target_names=['Easy', 'Medium', 'Hard']
        ))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print("\nConfusion Matrix:")
        print(cm)
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'confusion_matrix': cm.tolist(),
            'model_name': self.best_model_name
        }
    
    def save_model(self, model_dir, metrics):
        """Save trained model and metadata"""
        os.makedirs(model_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save model
        model_path = os.path.join(model_dir, f'difficulty_model_{timestamp}.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': self.best_model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'model_name': self.best_model_name,
                'label_mapping': self.label_mapping,
                'reverse_label_mapping': self.reverse_label_mapping
            }, f)
        
        print(f"\nModel saved to: {model_path}")
        
        # Save metadata
        metadata = {
            'model_name': self.best_model_name,
            'timestamp': timestamp,
            'model_path': model_path,
            'metrics': metrics,
            'feature_names': self.feature_names
        }
        
        metadata_path = os.path.join(model_dir, f'model_metadata_{timestamp}.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Metadata saved to: {metadata_path}")
        
        # Save as latest model
        latest_model_path = os.path.join(model_dir, 'latest_model.pkl')
        with open(latest_model_path, 'wb') as f:
            pickle.dump({
                'model': self.best_model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'model_name': self.best_model_name,
                'label_mapping': self.label_mapping,
                'reverse_label_mapping': self.reverse_label_mapping
            }, f)
        
        print(f"Latest model saved to: {latest_model_path}")
        
        return model_path, metadata_path


def main():
    """Main training pipeline"""
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(os.path.dirname(base_dir), 'datasets')
    model_dir = os.path.join(base_dir, 'trained_models')
    
    processed_csv = os.path.join(dataset_dir, 'processed_difficulty_features.csv')
    
    # Check if processed data exists
    if not os.path.exists(processed_csv):
        print(f"Error: Processed data not found at {processed_csv}")
        print("Please run data_preprocessing.py first")
        return
    
    # Initialize predictor
    predictor = DifficultyPredictor()
    
    # Load data
    X, y = predictor.load_data(processed_csv)
    
    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = predictor.split_data(X, y)
    
    # Train models
    results = predictor.train_models(X_train, y_train, X_val, y_val)
    
    # Evaluate on test set
    test_metrics = predictor.evaluate_model(X_test, y_test)
    
    # Save model
    model_path, metadata_path = predictor.save_model(model_dir, test_metrics)
    
    print("\n" + "="*50)
    print("Training completed successfully!")
    print("="*50)
    print(f"Model: {predictor.best_model_name}")
    print(f"Test Accuracy: {test_metrics['accuracy']:.4f}")
    print(f"Test F1-Score: {test_metrics['f1_score']:.4f}")


if __name__ == '__main__':
    main()
