#!/bin/bash

# Complete Training Pipeline for Difficulty Prediction Model
# This script runs data preprocessing and model training

echo "=========================================="
echo "Difficulty Prediction Model Training"
echo "=========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "data_preprocessing.py" ]; then
    echo "Error: Please run this script from the difficulty_prediction directory"
    exit 1
fi

# Step 1: Data Preprocessing
echo "Step 1: Preprocessing dataset..."
echo "------------------------------------------"
python data_preprocessing.py

if [ $? -ne 0 ]; then
    echo ""
    echo "Error: Data preprocessing failed"
    exit 1
fi

echo ""
echo ""

# Step 2: Model Training
echo "Step 2: Training model..."
echo "------------------------------------------"
python train_model.py

if [ $? -ne 0 ]; then
    echo ""
    echo "Error: Model training failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "Training completed successfully!"
echo "=========================================="
echo ""
echo "The trained model is saved in trained_models/latest_model.pkl"
echo "Please restart the Django server to load the new model."
