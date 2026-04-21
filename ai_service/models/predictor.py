"""
SmartAttend AI Inference Engine (No TensorFlow)
Loads trained XGBoost + RandomForest + GradientBoosting models.
Falls back to heuristic math if models aren't trained yet.
"""
import os
import numpy as np
import joblib
import logging

logger = logging.getLogger(__name__)

MODEL_DIR = os.environ.get("MODEL_DIR", "./saved_models")
XGB_MODEL_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
RF_MODEL_PATH = os.path.join(MODEL_DIR, "rf_model.pkl")
SEQ_MODEL_PATH = os.path.join(MODEL_DIR, "seq_model.pkl")

RISK_MAP = {0: "Safe", 1: "Warning", 2: "Danger"}


class AttendancePredictor:
    def __init__(self):
        self.xgb_model = None
        self.rf_model = None
        self.lstm_model = None  # kept for health check compat (maps to seq_model)
        self.seq_model = None
        self._loaded = False
        self._load_models()

    def _load_models(self):
        try:
            if os.path.exists(XGB_MODEL_PATH):
                self.xgb_model = joblib.load(XGB_MODEL_PATH)
                logger.info("✅ XGBoost model loaded")

            if os.path.exists(RF_MODEL_PATH):
                self.rf_model = joblib.load(RF_MODEL_PATH)
                logger.info("✅ RandomForest model loaded")

            if os.path.exists(SEQ_MODEL_PATH):
                self.seq_model = joblib.load(SEQ_MODEL_PATH)
                self.lstm_model = self.seq_model  # alias for health check
                logger.info("✅ Sequence (GradientBoosting) model loaded")

            self._loaded = True
        except Exception as e:
            logger.warning(f"⚠️ Could not load some models: {e}. Using fallback heuristics.")
            self._loaded = True  # mark loaded so service starts

    def _heuristic_predict(self, total: int, attended: int, upcoming_leaves: int, future_classes: int) -> dict:
        """Mathematical fallback when ML models aren't available."""
        if total == 0:
            return {"future_percentage": 100.0, "risk_level": "Safe", "safe_leaves": 0, "trend": "stable"}

        current_pct = (attended / total) * 100
        new_total = total + future_classes
        new_attended = attended + max(0, future_classes - upcoming_leaves)
        future_pct = max(0.0, min(100.0, (new_attended / new_total) * 100))

        risk = "Safe" if future_pct >= 80 else "Warning" if future_pct >= 70 else "Danger"

        safe_leaves = 0
        ct, ca = total, attended
        while True:
            ct += 1
            if (ca / ct) * 100 < 75.0:
                break
            safe_leaves += 1
            if safe_leaves > 100:
                break

        trend = "improving" if future_pct > current_pct + 2 else "declining" if future_pct < current_pct - 2 else "stable"
        return {
            "future_percentage": round(float(future_pct), 2),
            "risk_level": risk,
            "safe_leaves": safe_leaves,
            "trend": trend,
        }

    def predict(
        self,
        total_classes: int,
        attended_classes: int,
        missed_in_row: int,
        upcoming_leaves: int,
        future_classes: int,
        attendance_series: list = None,
        target_pct: float = 75.0,
    ) -> dict:
        if total_classes == 0:
            return {
                "future_percentage": 100.0,
                "risk_level": "Safe",
                "safe_leaves": 0,
                "trend": "stable",
                "recommendation": "No classes recorded yet. Start marking your attendance!",
            }

        current_pct = (attended_classes / total_classes) * 100

        # Compute last_10_pct from series
        last_10_pct = current_pct
        if attendance_series and len(attendance_series) > 0:
            last_10 = attendance_series[-10:] if len(attendance_series) >= 10 else attendance_series
            last_10_pct = sum(last_10) / len(last_10) * 100

        # ── Sequence model prediction (using recent trend) ────
        seq_future_pct = None
        if self.seq_model:
            try:
                X_seq = np.array([[current_pct, last_10_pct, missed_in_row, upcoming_leaves, future_classes]])
                seq_future_pct = float(np.clip(self.seq_model.predict(X_seq)[0], 0, 100))
            except Exception as e:
                logger.error(f"Sequence model error: {e}")

        # ── XGBoost prediction (tabular features) ─────────────
        xgb_future_pct = None
        if self.xgb_model:
            try:
                X = np.array([[total_classes, attended_classes, current_pct, missed_in_row, last_10_pct, upcoming_leaves, future_classes]])
                xgb_future_pct = float(np.clip(self.xgb_model.predict(X)[0], 0, 100))
            except Exception as e:
                logger.error(f"XGBoost error: {e}")

        # ── Ensemble ───────────────────────────────────────────
        if seq_future_pct is not None and xgb_future_pct is not None:
            future_pct = 0.5 * seq_future_pct + 0.5 * xgb_future_pct
        elif seq_future_pct is not None:
            future_pct = seq_future_pct
        elif xgb_future_pct is not None:
            future_pct = xgb_future_pct
        else:
            result = self._heuristic_predict(total_classes, attended_classes, upcoming_leaves, future_classes)
            result["recommendation"] = self._generate_recommendation(result["risk_level"], current_pct, result["safe_leaves"], target_pct)
            return result

        future_pct = round(float(np.clip(future_pct, 0, 100)), 2)

        # ── Risk Classification ────────────────────────────────
        if self.rf_model:
            try:
                X = np.array([[total_classes, attended_classes, current_pct, missed_in_row, last_10_pct, upcoming_leaves, future_classes]])
                risk_class = int(self.rf_model.predict(X)[0])
                risk_level = RISK_MAP.get(risk_class, "Warning")
            except Exception as e:
                logger.error(f"RF error: {e}")
                risk_level = "Safe" if future_pct >= target_pct + 5 else "Warning" if future_pct >= target_pct - 5 else "Danger"
        else:
            risk_level = "Safe" if future_pct >= target_pct + 5 else "Warning" if future_pct >= target_pct - 5 else "Danger"

        # ── Safe Leaves ───────────────────────────────────────
        safe_leaves = 0
        ct, ca = total_classes, attended_classes
        while True:
            ct += 1
            if (ca / ct) * 100 < target_pct:
                break
            safe_leaves += 1
            if safe_leaves > 100:
                break

        trend = "improving" if future_pct > current_pct + 2 else "declining" if future_pct < current_pct - 2 else "stable"
        recommendation = self._generate_recommendation(risk_level, current_pct, safe_leaves, target_pct)

        return {
            "future_percentage": future_pct,
            "risk_level": risk_level,
            "safe_leaves": safe_leaves,
            "trend": trend,
            "recommendation": recommendation,
        }

    def _generate_recommendation(self, risk: str, current_pct: float, safe_leaves: int, target: float) -> str:
        if risk == "Safe":
            if safe_leaves > 10:
                return f"Excellent! You have {safe_leaves} safe leaves. Keep maintaining this habit."
            return f"You are safe with {safe_leaves} safe leave(s) remaining. Stay consistent!"
        elif risk == "Warning":
            return f"⚠️ Be careful! You are close to the attendance boundary ({current_pct:.1f}%). Avoid missing any classes."
        else:
            classes_needed = 0
            ct, ca = int(current_pct), int(current_pct)  # approximate
            tot, att = 100, int(current_pct)
            while (att / max(tot, 1)) * 100 < target and classes_needed < 100:
                tot += 1
                att += 1
                classes_needed += 1
            return f"🚨 Critical! Attend the next {classes_needed} classes without fail to recover above {target:.0f}%."

    def is_loaded(self) -> bool:
        return self._loaded


# Singleton
predictor = AttendancePredictor()
