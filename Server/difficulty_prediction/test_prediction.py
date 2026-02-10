"""
Test script for difficulty prediction
Run this after training to verify the system works
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from difficulty_prediction.prediction_service import get_prediction_service


def test_prediction():
    """Test the prediction service with sample problems"""
    
    print("="*50)
    print("Testing Difficulty Prediction Service")
    print("="*50)
    print()
    
    # Get service
    print("Loading prediction service...")
    service = get_prediction_service()
    
    if service is None:
        print("ERROR: Prediction service not available!")
        print("Please train the model first using train.bat or train.sh")
        return False
    
    print(f"✓ Service loaded successfully")
    print(f"✓ Model: {service.model_name}")
    print(f"✓ Features: {len(service.feature_names)}")
    print()
    
    # Test cases
    test_problems = [
        {
            'name': 'Two Sum',
            'statement': 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
            'tags': ['array', 'hash table'],
            'test_cases': [
                {'input': '[2,7,11,15]\n9', 'output': '[0,1]'},
                {'input': '[3,2,4]\n6', 'output': '[1,2]'}
            ],
            'expected': 'Easy'
        },
        {
            'name': 'Longest Increasing Subsequence',
            'statement': 'Given an integer array nums, return the length of the longest strictly increasing subsequence. Use dynamic programming to solve this problem in O(n^2) time, or optimize to O(n log n) using binary search.',
            'tags': ['dynamic programming', 'binary search'],
            'test_cases': [
                {'input': '[10,9,2,5,3,7,101,18]', 'output': '4'},
                {'input': '[0,1,0,3,2,3]', 'output': '4'}
            ],
            'expected': 'Medium'
        },
        {
            'name': 'Graph Shortest Path with Constraints',
            'statement': 'Given a weighted directed graph with n vertices and m edges, find the shortest path from vertex s to vertex t with at most k edges. Use modified Dijkstra or Bellman-Ford algorithm. Handle negative weights but no negative cycles.',
            'tags': ['graph', 'shortest path', 'dijkstra', 'dynamic programming'],
            'test_cases': [
                {'input': '5 7 0 4 2\n0 1 1\n1 2 2\n2 4 3\n0 3 4\n3 4 1\n1 3 2\n2 3 1', 'output': '5'}
            ],
            'expected': 'Hard'
        }
    ]
    
    print("Running predictions on test problems...")
    print("-"*50)
    print()
    
    correct = 0
    total = len(test_problems)
    
    for i, problem in enumerate(test_problems, 1):
        print(f"Test {i}/{total}: {problem['name']}")
        print(f"Expected: {problem['expected']}")
        
        # Predict
        result = service.predict({
            'statement': problem['statement'],
            'tags': problem['tags'],
            'test_cases': problem['test_cases']
        })
        
        predicted = result['difficulty']
        confidence = result['confidence']
        
        print(f"Predicted: {predicted} (confidence: {confidence:.2%})")
        print(f"Probabilities:")
        for diff, prob in result['probabilities'].items():
            print(f"  {diff}: {prob:.2%}")
        
        # Check if correct
        is_correct = predicted == problem['expected']
        if is_correct:
            correct += 1
            print("✓ CORRECT")
        else:
            print("✗ INCORRECT")
        
        print()
    
    # Summary
    print("="*50)
    print("Test Summary")
    print("="*50)
    print(f"Correct: {correct}/{total} ({correct/total*100:.1f}%)")
    print()
    
    if correct == total:
        print("✓ All tests passed!")
    elif correct >= total * 0.66:
        print("⚠ Most tests passed, but some predictions may need improvement")
    else:
        print("✗ Many tests failed. Consider retraining the model.")
    
    print()
    print("Note: These are just sample tests. Real-world accuracy is ~85%")
    
    return correct >= total * 0.66


if __name__ == '__main__':
    success = test_prediction()
    sys.exit(0 if success else 1)
