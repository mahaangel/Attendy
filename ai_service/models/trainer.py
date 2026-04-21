"""
SmartAttend AI Model Trainer (No TensorFlow)
Trains:
1. XGBoost regression model for future attendance %
2. Random Forest classifier for risk classification
3. GradientBoosting as LSTM substitute for time-series patterns

Uses synthetic realistic student attendance data.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error
from xgboost import XGBRegressor
import warnings
warnings.filterwarnings("ignore")

MODEL_DIR = os.environ.get("MODEL_DIR", "./saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

XGB_MODEL_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
RF_MODEL_PATH = os.path.join(MODEL_DIR, "rf_model.pkl")
SEQ_MODEL_PATH = os.path.join(MODEL_DIR, "seq_model.pkl")


def generate_synthetic_data(n_students: int = 2000, n_weeks: int = 16) -> pd.DataFrame:
    """
    Generate realistic student attendance data.
    Each student has a base attendance tendency and behavior type.
    """
    np.random.seed(42)
    rows = []

    for student_id in range(n_students):
        base_tendency = np.random.uniform(0.5, 0.98)
        behavior_type = np.random.choice(
            ["consistent", "declining", "improving", "erratic"],
            p=[0.4, 0.25, 0.2, 0.15]
        )

        attended = 0
        total = 0
        weekly_series = []

        for week in range(n_weeks):
            week_classes = np.random.randint(3, 6)

            for day in range(week_classes):
                if behavior_type == "declining":
                    tendency = base_tendency * (1 - week * 0.02)
                elif behavior_type == "improving":
                    tendency = base_tendency * (0.7 + week * 0.02)
                elif behavior_type == "erratic":
                    tendency = base_tendency + np.random.normal(0, 0.15)
                else:
                    tendency = base_tendency + np.random.normal(0, 0.05)

                tendency = np.clip(tendency, 0.1, 1.0)
                present = 1 if np.random.random() < tendency else 0
                weekly_series.append(present)
                if present:
                    attended += 1
                total += 1

        current_pct = (attended / total * 100) if total > 0 else 0

        # Consecutive missed
        missed_in_row = 0
        for s in reversed(weekly_series):
            if s == 0:
                missed_in_row += 1
            else:
                break

        # Rolling window features (last 10 classes)
        last_10 = weekly_series[-10:] if len(weekly_series) >= 10 else weekly_series
        last_10_pct = (sum(last_10) / len(last_10) * 100) if last_10 else current_pct

        upcoming_leaves = np.random.randint(0, 6)
        future_classes = np.random.randint(5, 20)

        # Simulate future
        future_tendency = np.clip(base_tendency + np.random.normal(0, 0.05), 0.1, 1.0)
        future_attended = sum(1 for _ in range(future_classes) if np.random.random() < future_tendency)
        future_attended = max(0, future_attended - upcoming_leaves)

        new_total = total + future_classes
        new_attended = attended + future_attended
        future_pct = np.clip((new_attended / new_total * 100) if new_total > 0 else 0, 0, 100)

        target = 75.0
        if future_pct >= target + 5:
            risk = 0  # Safe
        elif future_pct >= target - 5:
            risk = 1  # Warning
        else:
            risk = 2  # Danger

        rows.append({
            "total_classes": total,
            "attended_classes": attended,
            "current_pct": current_pct,
            "missed_in_row": missed_in_row,
            "last_10_pct": last_10_pct,
            "upcoming_leaves": upcoming_leaves,
            "future_classes": future_classes,
            "future_pct": future_pct,
            "risk": risk,
        })

    return pd.DataFrame(rows)


def train_all():
    print("\n🤖 SmartAttend AI Training Starting...")
    print("=" * 50)

    print("\n📊 Generating synthetic dataset (2000 students, 16 weeks)...")
    df = generate_synthetic_data(n_students=2000, n_weeks=16)
    print(f"  Dataset shape: {df.shape}")
    print(f"  Risk distribution: {df['risk'].value_counts().to_dict()}")

    feature_cols = [
        "total_classes", "attended_classes", "current_pct",
        "missed_in_row", "last_10_pct", "upcoming_leaves", "future_classes"
    ]
    X = df[feature_cols].values
    y_reg = df["future_pct"].values
    y_clf = df["risk"].values

    # ── Train XGBoost Regression ──────────────────────────
    print("\n▶ Training XGBoost Regression Model...")
    xgb_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("xgb", XGBRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )),
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    xgb_pipeline.fit(X_train, y_train)
    mae = mean_absolute_error(y_test, xgb_pipeline.predict(X_test))
    print(f"  XGBoost MAE: {mae:.2f}%")
    joblib.dump(xgb_pipeline, XGB_MODEL_PATH)
    print(f"  ✅ Saved => {XGB_MODEL_PATH}")

    # ── Train Random Forest Classifier ───────────────────
    print("\n▶ Training Random Forest Classifier...")
    rf_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced",
        )),
    ])
    X_train, X_test, y_train, y_test = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    rf_pipeline.fit(X_train, y_train)
    acc = accuracy_score(y_test, rf_pipeline.predict(X_test))
    print(f"  Random Forest Accuracy: {acc*100:.1f}%")
    joblib.dump(rf_pipeline, RF_MODEL_PATH)
    print(f"  ✅ Saved => {RF_MODEL_PATH}")

    # ── Train Gradient Boosting as time-series feature extractor ──
    print("\n▶ Training Gradient Boosting Sequence Model...")
    seq_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("gb", GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            random_state=42,
        )),
    ])
    # Use last_10_pct + current_pct as key sequence features
    X_seq = df[["current_pct", "last_10_pct", "missed_in_row", "upcoming_leaves", "future_classes"]].values
    X_train, X_test, y_train, y_test = train_test_split(X_seq, y_reg, test_size=0.2, random_state=42)
    seq_pipeline.fit(X_train, y_train)
    mae2 = mean_absolute_error(y_test, seq_pipeline.predict(X_test))
    print(f"  Sequence Model MAE: {mae2:.2f}%")
    joblib.dump(seq_pipeline, SEQ_MODEL_PATH)
    print(f"  ✅ Saved => {SEQ_MODEL_PATH}")

    print("\n🎉 All models trained and saved successfully!")
    print("=" * 50)


if __name__ == "__main__":
    train_all()
