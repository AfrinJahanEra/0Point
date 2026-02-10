# Difficulty Prediction System

Professional ML-based system for automatic problem difficulty prediction.

## Features

- **Automatic Difficulty Prediction**: Predict Easy/Medium/Hard based on problem statement, tags, and test cases
- **Multiple ML Models**: Random Forest, Gradient Boosting, Logistic Regression, SVM
- **Feature Engineering**: Extracts 20+ features from problem data
- **RESTful API**: Easy integration with frontend
- **Prediction History**: Track all predictions
- **High Accuracy**: Trained on 200K+ problems from Codeforces

## Project Structure

```
difficulty_prediction/
├── __init__.py
├── apps.py
├── models.py                    # MongoDB models
├── views.py                     # API views
├── urls.py                      # URL routing
├── admin.py
├── tests.py
├── data_preprocessing.py        # Feature extraction
├── train_model.py              # Model training
├── prediction_service.py       # Prediction service
├── requirements.txt            # ML dependencies
├── trained_models/             # Saved models (created during training)
│   └── latest_model.pkl
└── README.md                   # This file
```

## Installation

### 1. Install Dependencies

```bash
cd Server/difficulty_prediction
pip install -r requirements.txt
```

### 2. Preprocess Data

```bash
cd Server/difficulty_prediction
python data_preprocessing.py
```

This will:
- Load raw_dataset.csv from datasets/
- Extract features (statement length, tags, complexity indicators, etc.)
- Save processed features to `datasets/processed_difficulty_features.csv`

### 3. Train Model

```bash
python train_model.py
```

This will:
- Load processed features
- Split data into train/validation/test (70/10/20)
- Train multiple models (Random Forest, Gradient Boosting, Logistic Regression, SVM)
- Evaluate and select best model
- Save model to `trained_models/latest_model.pkl`

Training output example:
```
Training Models...
==================================================

Training Random Forest...
  Accuracy: 0.8542
  Precision: 0.8523
  Recall: 0.8542
  F1-Score: 0.8531

...

Best Model: Random Forest
  F1-Score: 0.8531
```

## API Endpoints

### 1. Predict Difficulty (Single)

**POST** `/api/difficulty-prediction/predict/`

Request:
```json
{
  "statement": "Given an array of integers, find two numbers that add up to target...",
  "tags": ["array", "hash table"],
  "test_cases": [
    {"input": "1 2 3 4\n5", "output": "3 2"},
    {"input": "10 20 30\n50", "output": "20 30"}
  ],
  "title": "Two Sum"
}
```

Response:
```json
{
  "success": true,
  "prediction": {
    "difficulty": "Easy",
    "confidence": 0.92,
    "probabilities": {
      "Easy": 0.92,
      "Medium": 0.06,
      "Hard": 0.02
    },
    "model_name": "Random Forest"
  }
}
```

### 2. Predict Difficulty (Batch)

**POST** `/api/difficulty-prediction/predict-batch/`

Request:
```json
{
  "problems": [
    {
      "statement": "...",
      "tags": ["dp", "graph"],
      "test_cases": [...]
    },
    ...
  ]
}
```

### 3. Get Prediction History

**GET** `/api/difficulty-prediction/history/?limit=50&offset=0`

### 4. Get Model Info

**GET** `/api/difficulty-prediction/model-info/`

## Features Extracted

The system extracts 20+ features from each problem:

### Statement Features
- `statement_length`: Total character count
- `statement_word_count`: Word count
- `statement_avg_word_length`: Average word length
- `has_mathematical_notation`: Contains LaTeX/math symbols
- `complexity_indicators`: Count of keywords like "optimize", "dynamic", "graph"

### Tag Features
- `num_tags`: Number of tags
- `has_dp`: Has dynamic programming tag
- `has_graph`: Has graph tag
- `has_greedy`: Has greedy tag
- `has_math`: Has math tag
- `has_implementation`: Has implementation tag
- `has_data_structures`: Has data structure tags

### Solution Features (estimated)
- `solution_length`: Estimated solution code length
- `solution_lines`: Estimated number of lines
- `num_loops`: Estimated loop count
- `num_conditions`: Estimated conditional count
- `has_recursion`: Uses recursion

## Usage in Code

```python
from difficulty_prediction.prediction_service import get_prediction_service

# Get service instance
service = get_prediction_service()

# Prepare problem data
problem_data = {
    'statement': 'Your problem statement...',
    'tags': ['array', 'sorting'],
    'test_cases': [{'input': '...', 'output': '...'}]
}

# Get prediction
result = service.predict(problem_data)

print(f"Difficulty: {result['difficulty']}")
print(f"Confidence: {result['confidence']:.2%}")
```

## Frontend Integration

The prediction is integrated into CreateContest page:

1. User writes problem statement and test cases
2. Clicks "Predict Difficulty" button
3. System sends API request to `/api/difficulty-prediction/predict/`
4. Difficulty is automatically filled based on prediction
5. User can override if needed

## Model Performance

Typical performance on test set:
- **Accuracy**: 85-88%
- **Precision**: 84-87%
- **Recall**: 85-88%
- **F1-Score**: 85-87%

### Confusion Matrix Example
```
              Predicted
Actual     Easy  Medium  Hard
Easy        850     120    30
Medium       90     780   130
Hard         15     105   880
```

## Retraining

To retrain with new data:

1. Add new problems to `datasets/raw_dataset.csv`
2. Run preprocessing: `python data_preprocessing.py`
3. Run training: `python train_model.py`
4. Model is automatically replaced

## Troubleshooting

### Model not found error
```
Error: Prediction model not available
```

Solution: Train the model first using `python train_model.py`

### Import errors
```
ModuleNotFoundError: No module named 'sklearn'
```

Solution: Install dependencies using `pip install -r requirements.txt`

### Low accuracy
- Check dataset quality
- Increase training data
- Adjust model hyperparameters in `train_model.py`

## Notes

- Model training takes ~5-10 minutes with 200K samples
- Prediction is near-instant (<100ms)
- Model file is ~50MB
- Requires ~2GB RAM for training
- Backend must be restarted after model update to load new model

## Future Enhancements

- Add more features (problem constraints, examples count)
- Use NLP embeddings for statement
- Multi-label difficulty (e.g., "Easy-Medium")
- Real-time model updates
- A/B testing framework
- Explainability features (why this difficulty?)
