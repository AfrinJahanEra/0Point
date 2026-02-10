# Quick Start Guide - Difficulty Prediction System

This guide will help you set up and use the automatic difficulty prediction system.

## Setup (One-time)

### 1. Install ML Dependencies

```bash
cd Server/difficulty_prediction
pip install -r requirements.txt
```

This installs:
- scikit-learn (ML framework)
- pandas (data processing)
- numpy (numerical operations)
- matplotlib, seaborn (visualization)

### 2. Train the Model

**On Windows:**
```bash
cd Server\difficulty_prediction
train.bat
```

**On Linux/Mac:**
```bash
cd Server/difficulty_prediction
chmod +x train.sh
./train.sh
```

**Or manually:**
```bash
# Step 1: Preprocess data
python data_preprocessing.py

# Step 2: Train model
python train_model.py
```

This will:
1. Load 200K+ problems from `datasets/raw_dataset.csv`
2. Extract features (statement length, tags, complexity, etc.)
3. Train multiple ML models
4. Select best model (usually Random Forest with ~85% accuracy)
5. Save to `trained_models/latest_model.pkl`

**Training takes ~5-10 minutes** on a typical laptop.

### 3. Restart Django Server

The model is loaded once when the server starts. After training, restart:

```bash
cd Server
python manage.py runserver
```

## Usage

### In CreateContest Page

1. **Create/Edit a Contest**
2. **Add a Problem** with:
   - Problem statement (required)
   - Tags (optional, improves accuracy)
   - Test cases (optional, improves accuracy)
3. **Click "Auto Predict" button** next to Difficulty dropdown
4. Wait 1-2 seconds
5. **Difficulty is automatically filled** with predicted value
6. See confidence scores in the popup
7. **Can override** if needed

### Example Flow

```
1. Write statement: "Given an array, find two numbers that sum to target..."
2. Add tags: ["array", "hash table"]
3. Add test cases:
   Input: [2,7,11,15], target=9
   Output: [0,1]
4. Click "Auto Predict"
5. ✓ Predicted: Easy (92% confidence)
```

## API Usage (Direct)

You can also call the API directly:

### Predict Single Problem

```bash
curl -X POST http://localhost:8000/api/difficulty-prediction/predict/ \
  -H "Content-Type: application/json" \
  -d '{
    "statement": "Given an array of integers, find two numbers that add up to a target value",
    "tags": ["array", "hash table"],
    "test_cases": [
      {"input": "[2,7,11,15]\n9", "output": "[0,1]"}
    ],
    "title": "Two Sum"
  }'
```

**Response:**
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

### Get Model Info

```bash
curl http://localhost:8000/api/difficulty-prediction/model-info/
```

### Get Prediction History

```bash
curl http://localhost:8000/api/difficulty-prediction/history/?limit=10
```

## Tips for Best Accuracy

1. **Write detailed statements** - More text = better prediction
2. **Add relevant tags** - Tags like "dp", "graph" strongly influence difficulty
3. **Include test cases** - Large/complex inputs suggest harder problems
4. **Use complexity keywords** - Words like "optimize", "minimum", "shortest path"

## Troubleshooting

### "Model not available" error

**Solution:** Train the model first using `train.bat` or `train.sh`

### "ModuleNotFoundError: No module named 'sklearn'"

**Solution:** Install dependencies: `pip install -r requirements.txt`

### Low accuracy predictions

**Possible causes:**
- Model not trained with enough data
- Problem statement too short/vague
- Missing tags

**Solutions:**
- Retrain with more data
- Write more detailed statements
- Add problem tags

### Model takes long to load

**Normal behavior:** Model loads once at server startup (~2-3 seconds)

## Model Performance

Current model (trained on 200K problems):

| Metric | Value |
|--------|-------|
| Accuracy | 85-88% |
| Easy Precision | 87-90% |
| Medium Precision | 82-85% |
| Hard Precision | 84-87% |

### What the model learns:

- **Easy problems**: Shorter statements, basic tags (array, string), simple test cases
- **Medium problems**: Moderate length, intermediate tags (dp, greedy), moderate complexity
- **Hard problems**: Long statements, advanced tags (graph, tree), complex algorithms

## Retraining

To retrain with updated data:

1. Add new problems to `datasets/raw_dataset.csv`
2. Run `train.bat` / `train.sh`
3. Restart server

**Note:** Old model is backed up automatically with timestamp.

## Support

For issues or questions:
1. Check `difficulty_prediction/README.md` for detailed documentation
2. Review training logs in console output
3. Check prediction history API for patterns

## Next Steps

After setup:
1. Test prediction with sample problems
2. Compare predictions with manual difficulty
3. Adjust based on your platform's difficulty scale
4. Consider retraining with platform-specific problems
