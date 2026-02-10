"""
Data Preprocessing Module for Difficulty Prediction
Processes raw CSV dataset and extracts features for model training
"""

import pandas as pd
import numpy as np
import re
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os


class ProblemFeatureExtractor:
    """Extract features from problem data for difficulty prediction"""
    
    def __init__(self):
        self.label_encoder = LabelEncoder()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        
    def clean_text(self, text):
        """Clean and normalize text"""
        if pd.isna(text) or text == '':
            return ''
        text = str(text).lower()
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def extract_statement_features(self, statement):
        """Extract features from problem statement"""
        if pd.isna(statement) or statement == '':
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
            'graph', 'tree', 'matrix', 'array', 'subsequence', 'permutation'
        ]
        complexity_count = sum(1 for keyword in complexity_keywords if keyword in statement.lower())
        
        # Check for mathematical notation
        has_math = int(bool(re.search(r'[\$\^\{\}\[\]]', statement)))
        
        return {
            'statement_length': len(statement),
            'statement_word_count': len(words),
            'statement_avg_word_length': np.mean([len(w) for w in words]) if words else 0,
            'has_mathematical_notation': has_math,
            'complexity_indicators': complexity_count
        }
    
    def extract_tag_features(self, tags):
        """Extract features from problem tags"""
        if pd.isna(tags) or tags == '':
            return {
                'num_tags': 0,
                'has_dp': 0,
                'has_graph': 0,
                'has_greedy': 0,
                'has_math': 0,
                'has_implementation': 0,
                'has_data_structures': 0
            }
        
        # Parse tags (assuming it's a string representation of list)
        try:
            if isinstance(tags, str):
                tags = eval(tags)
            if not isinstance(tags, list):
                tags = [str(tags)]
        except:
            tags = []
        
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
    
    def extract_solution_features(self, solution):
        """Extract features from solution code"""
        if pd.isna(solution) or solution == '':
            return {
                'solution_length': 0,
                'solution_lines': 0,
                'num_loops': 0,
                'num_conditions': 0,
                'has_recursion': 0
            }
        
        solution = str(solution)
        lines = solution.split('\n')
        
        # Count loops
        num_loops = solution.count('for') + solution.count('while')
        
        # Count conditions
        num_conditions = solution.count('if')
        
        # Check for recursion (function calling itself)
        has_recursion = int('recursive' in solution.lower() or 
                           bool(re.search(r'def\s+(\w+).*\1\(', solution)))
        
        return {
            'solution_length': len(solution),
            'solution_lines': len(lines),
            'num_loops': num_loops,
            'num_conditions': num_conditions,
            'has_recursion': has_recursion
        }
    
    def normalize_difficulty(self, difficulty):
        """Normalize difficulty labels"""
        if pd.isna(difficulty):
            return None
        
        difficulty = str(difficulty).lower()
        
        # Map Codeforces ratings to Easy/Medium/Hard
        try:
            rating = int(difficulty)
            if rating < 1400:
                return 'Easy'
            elif rating < 1900:
                return 'Medium'
            else:
                return 'Hard'
        except ValueError:
            # Already a label
            if 'easy' in difficulty:
                return 'Easy'
            elif 'hard' in difficulty or 'difficult' in difficulty:
                return 'Hard'
            else:
                return 'Medium'
    
    def process_dataset(self, csv_path):
        """Process complete dataset and extract all features"""
        print(f"Loading dataset from {csv_path}...")
        df = pd.read_csv(csv_path)
        
        print(f"Original dataset shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        
        # Filter valid problems with difficulty
        df = df[df['problem_dificulty'].notna()].copy()
        print(f"After filtering problems with difficulty: {df.shape}")
        
        # Normalize difficulty labels
        df['difficulty_label'] = df['problem_dificulty'].apply(self.normalize_difficulty)
        df = df[df['difficulty_label'].notna()].copy()
        
        print(f"\nDifficulty distribution:")
        print(df['difficulty_label'].value_counts())
        
        # Extract features
        print("\nExtracting features...")
        
        # Statement features
        statement_features = df['problem_statement'].apply(self.extract_statement_features)
        statement_df = pd.DataFrame(statement_features.tolist())
        
        # Tag features
        tag_features = df['problem_tags'].apply(self.extract_tag_features)
        tag_df = pd.DataFrame(tag_features.tolist())
        
        # Solution features
        solution_features = df['problem_solution'].apply(self.extract_solution_features)
        solution_df = pd.DataFrame(solution_features.tolist())
        
        # Combine all features
        features_df = pd.concat([
            df[['problem_name', 'difficulty_label']].reset_index(drop=True),
            statement_df.reset_index(drop=True),
            tag_df.reset_index(drop=True),
            solution_df.reset_index(drop=True)
        ], axis=1)
        
        print(f"\nFinal feature matrix shape: {features_df.shape}")
        print(f"Features: {features_df.columns.tolist()}")
        
        return features_df
    
    def save_processed_data(self, features_df, output_path):
        """Save processed features to CSV"""
        features_df.to_csv(output_path, index=False)
        print(f"\nProcessed data saved to: {output_path}")


def main():
    """Main preprocessing pipeline"""
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(os.path.dirname(base_dir), 'datasets')
    input_csv = os.path.join(dataset_dir, 'raw_dataset.csv')
    output_csv = os.path.join(dataset_dir, 'processed_difficulty_features.csv')
    
    # Initialize feature extractor
    extractor = ProblemFeatureExtractor()
    
    # Process dataset
    features_df = extractor.process_dataset(input_csv)
    
    # Save processed data
    extractor.save_processed_data(features_df, output_csv)
    
    print("\n" + "="*50)
    print("Data preprocessing completed successfully!")
    print("="*50)


if __name__ == '__main__':
    main()
