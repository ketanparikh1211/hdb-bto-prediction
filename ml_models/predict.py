import joblib
import pandas as pd
import os
import json
from dotenv import load_dotenv

load_dotenv()
MODEL_PATH = os.getenv('MODEL_PATH', 'models/model.pkl')
FEATURES_PATH = MODEL_PATH.replace('.pkl', '_features.json')

model = joblib.load(MODEL_PATH)

# Load the feature names that were saved during training
try:
    with open(FEATURES_PATH, 'r') as f:
        expected_features = json.load(f)
except FileNotFoundError:
    expected_features = None
    print(f"Warning: Feature names file not found at {FEATURES_PATH}")

def predict_price(features: dict) -> float:
    """
    features: dict of feature_name -> value, including one-hot columns
    """
    # Convert features dict to DataFrame
    df = pd.DataFrame([features])
    
    # If we have the expected features, align the input data
    if expected_features:
        # Create a dataframe with all expected features initialized to 0
        aligned_df = pd.DataFrame(0, index=[0], columns=expected_features)
        
        # Set the values for features that exist in our input
        for col in df.columns:
            if col in expected_features:
                aligned_df[col] = df[col].iloc[0]
        
        # Use the aligned dataframe for prediction
        df = aligned_df
    
    price = model.predict(df)[0]
    return float(price)