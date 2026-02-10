@echo off
REM Complete Training Pipeline for Difficulty Prediction Model
REM This script runs data preprocessing and model training

echo ==========================================
echo Difficulty Prediction Model Training
echo ==========================================
echo.

REM Check if we're in the correct directory
if not exist "data_preprocessing.py" (
    echo Error: Please run this script from the difficulty_prediction directory
    exit /b 1
)

REM Step 1: Data Preprocessing
echo Step 1: Preprocessing dataset...
echo ------------------------------------------
python data_preprocessing.py

if errorlevel 1 (
    echo.
    echo Error: Data preprocessing failed
    exit /b 1
)

echo.
echo.

REM Step 2: Model Training
echo Step 2: Training model...
echo ------------------------------------------
python train_model.py

if errorlevel 1 (
    echo.
    echo Error: Model training failed
    exit /b 1
)

echo.
echo ==========================================
echo Training completed successfully!
echo ==========================================
echo.
echo The trained model is saved in trained_models/latest_model.pkl
echo Please restart the Django server to load the new model.

pause
