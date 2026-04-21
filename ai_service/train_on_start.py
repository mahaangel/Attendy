"""
Run at container startup. Trains models if not already saved.
This ensures models are available before the API starts serving requests.
"""
import os
import sys

MODEL_DIR = os.environ.get("MODEL_DIR", "./saved_models")
XGB_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
RF_PATH = os.path.join(MODEL_DIR, "rf_model.pkl")
SEQ_PATH = os.path.join(MODEL_DIR, "seq_model.pkl")


def models_exist() -> bool:
    return all(os.path.exists(p) for p in [XGB_PATH, RF_PATH, SEQ_PATH])


if __name__ == "__main__":
    os.makedirs(MODEL_DIR, exist_ok=True)

    if models_exist():
        print("✅ Models already exist. Skipping training.")
        sys.exit(0)

    print("🏋️  Models not found. Starting training (XGBoost + RandomForest + GradientBoosting)...")
    from models.trainer import train_all
    try:
        train_all()
        print("✅ Training complete!")
    except Exception as e:
        print(f"⚠️  Training failed: {e}. AI service will use heuristic fallback.")
        sys.exit(0)  # Non-fatal: service still starts with fallbacks
