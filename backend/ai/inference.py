import os
import joblib
import numpy as np

class AttendanceAI:
    def __init__(self):
        self.reg_model_path = os.path.join(os.path.dirname(__file__), 'reg_model.pkl')
        self.clf_model_path = os.path.join(os.path.dirname(__file__), 'clf_model.pkl')
        self.reg_model = None
        self.clf_model = None
        self._load_models()

    def _load_models(self):
        try:
            if os.path.exists(self.reg_model_path) and os.path.exists(self.clf_model_path):
                self.reg_model = joblib.load(self.reg_model_path)
                self.clf_model = joblib.load(self.clf_model_path)
            else:
                print("Warning: AI Models not found. Using fallback heuristics.")
        except Exception as e:
            print(f"Error loading models: {e}")

    def predict(self, total_classes, attended_classes, missed_in_row, upcoming_leaves):
        """
        Returns (future_pct, risk_level_string)
        """
        if self.reg_model and self.clf_model:
            X = np.array([[total_classes, attended_classes, missed_in_row, upcoming_leaves]])
            future_pct = self.reg_model.predict(X)[0]
            risk_class = self.clf_model.predict(X)[0]
            
            risk_map = {0: "Safe", 1: "Warning", 2: "Danger"}
            return (float(future_pct), risk_map.get(risk_class, "Unknown"))
        else:
            # Fallback heuristic if not trained
            expected_total = total_classes + 10
            expected_attended = attended_classes + (10 - upcoming_leaves)
            future_pct = (expected_attended / expected_total) * 100 if expected_total > 0 else 0
            
            if future_pct > 75:
                risk = "Safe"
            elif future_pct >= 65:
                risk = "Warning"
            else:
                risk = "Danger"
                
            return (float(future_pct), risk)

    def calculate_safe_bunks(self, total_classes, attended_classes, target_pct=75.0):
        # A simple mathematical prediction of how many consecutive leaves drop you below target
        safe_leaves = 0
        cur_total = total_classes
        cur_attended = attended_classes
        
        while True:
            cur_total += 1
            # Missed class, so attended doesn't increase
            pct = (cur_attended / cur_total) * 100
            if pct < target_pct:
                break
            safe_leaves += 1
            if safe_leaves > 50: # safety breaker
                break
                
        return safe_leaves

ai_engine = AttendanceAI()
