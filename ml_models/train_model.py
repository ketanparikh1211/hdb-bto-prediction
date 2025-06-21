# File: ml_models/train_model.py
import os
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json
from data_ingestion.transform import transform_resale_csv

# Constants
TARGET_COL = 'resale_price'


def load_data_from_csv(csv_path='resale_data.csv'):
    """
    Load resale transactions from CSV file and prepare for training.
    """
    print(f"Loading data from {csv_path}...")
    df = transform_resale_csv(csv_path)
    
    # Remove flat_model as it has too many categorical values and may cause issues
    if 'flat_model' in df.columns:
        df = df.drop('flat_model', axis=1)
    
    # One-hot encode categorical columns
    df = pd.get_dummies(df, columns=['town', 'flat_type'], drop_first=True)
    
    # Ensure all columns except target are numeric
    feature_cols = [col for col in df.columns if col != TARGET_COL]
    for col in feature_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Remove any rows with NaN values
    df = df.dropna()
    
    print(f"Loaded {len(df)} records with {len(df.columns)} features after encoding and cleaning")
    return df


def train_and_save_model(csv_path='resale_data.csv', output_path='models/model.pkl'):
    # Load data
    df = load_data_from_csv(csv_path)

    # Separate features and target
    X = df.drop(TARGET_COL, axis=1)
    y = df[TARGET_COL]

    # Save feature names for later use during prediction
    feature_names = X.columns.tolist()
    feature_names_path = output_path.replace('.pkl', '_features.json')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(feature_names_path, 'w') as f:
        json.dump(feature_names, f)
    print(f"✅ Saved feature names to {feature_names_path}")

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Initialize and tune model with simpler parameters for faster training
    print("Training Random Forest model with hyperparameter tuning...")
    rf = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    params = {
        'max_depth': [10, 20],
        'min_samples_split': [2, 5]
    }
    grid = GridSearchCV(rf, params, cv=3, scoring='neg_mean_squared_error', verbose=1)
    grid.fit(X_train, y_train)
    best_model = grid.best_estimator_
    
    print(f"Best parameters: {grid.best_params_}")

    # Evaluate model
    y_pred = best_model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Performance:")
    print(f"  Mean Squared Error: {mse:,.0f}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  Root Mean Squared Error: {mse**0.5:,.0f}")

    # Save the best model
    joblib.dump(best_model, output_path)
    print(f"✅ Saved model to {output_path}")
    
    return best_model, feature_names


if __name__ == '__main__':
    model, features = train_and_save_model('resale_data.csv', 'models/model.pkl')
