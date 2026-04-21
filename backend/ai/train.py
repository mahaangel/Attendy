import pandas as pd
import numpy as np
import os
import joblib
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestClassifier

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    # Features: total_classes, attended_classes, missed_classes_in_row, upcoming_leaves
    total_classes = np.random.randint(10, 50, num_samples)
    attended_classes = (total_classes * np.random.uniform(0.5, 1.0, num_samples)).astype(int)
    missed_in_row = np.random.randint(0, 5, num_samples)
    upcoming_leaves = np.random.randint(0, 5, num_samples)
    
    # Target 1: future_percentage (regression) - simple simulation
    current_pct = (attended_classes / total_classes) * 100
    expected_future_attended = attended_classes + (10 - upcoming_leaves) # assuming 10 future classes
    expected_total = total_classes + 10
    future_pct = (expected_future_attended / expected_total) * 100
    # Add noise
    future_pct += np.random.normal(0, 2, num_samples)
    future_pct = np.clip(future_pct, 0, 100)
    
    # Target 2: risk_classification (classification)
    # 0 = Safe (>75%), 1 = Warning (65-75%), 2 = Danger (<65%)
    risk = np.where(future_pct > 75, 0, np.where(future_pct >= 65, 1, 2))
    
    return pd.DataFrame({
        'total_classes': total_classes,
        'attended_classes': attended_classes,
        'missed_in_row': missed_in_row,
        'upcoming_leaves': upcoming_leaves,
        'future_pct': future_pct,
        'risk': risk
    })

def train_and_save_models():
    print("Generating synthetic data...")
    df = generate_synthetic_data()
    
    X = df[['total_classes', 'attended_classes', 'missed_in_row', 'upcoming_leaves']]
    y_reg = df['future_pct']
    y_clf = df['risk']
    
    print("Training Regression Model (XGBoost)...")
    reg_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('xgb', XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42))
    ])
    reg_pipeline.fit(X, y_reg)
    
    print("Training Classification Model (Random Forest)...")
    clf_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    clf_pipeline.fit(X, y_clf)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    
    reg_path = os.path.join(os.path.dirname(__file__), 'reg_model.pkl')
    clf_path = os.path.join(os.path.dirname(__file__), 'clf_model.pkl')
    
    joblib.dump(reg_pipeline, reg_path)
    joblib.dump(clf_pipeline, clf_path)
    
    print(f"Models saved to:\n- {reg_path}\n- {clf_path}")

if __name__ == "__main__":
    train_and_save_models()
