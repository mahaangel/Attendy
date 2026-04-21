from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.predictor import predictor
from models.leave_optimizer import leave_optimizer
from models.recommender import recommendation_engine

router = APIRouter()


class PredictRequest(BaseModel):
    total_classes: int
    attended_classes: int
    missed_in_row: int = 0
    upcoming_leaves: int = 0
    future_classes: int = 10
    attendance_series: List[int] = []
    target_pct: float = 75.0


class SimulateRequest(BaseModel):
    total_classes: int
    attended_classes: int
    skip_days: int
    future_classes: int = 20
    target_pct: float = 75.0


class RecommendRequest(BaseModel):
    risk_level: str
    current_pct: float
    target_pct: float = 75.0
    subject_name: str = "this subject"
    safe_leaves: int = 0
    classes_needed: int = 0
    attendance_series: List[int] = []


class LeaveOptRequest(BaseModel):
    total_classes: int
    attended_classes: int
    target_pct: float = 75.0
    future_classes: int = 20
    classes_per_week: int = 5


class ChatbotRequest(BaseModel):
    message: str
    context: Optional[dict] = {}


@router.post("/predict")
async def predict_endpoint(req: PredictRequest):
    result = predictor.predict(
        total_classes=req.total_classes,
        attended_classes=req.attended_classes,
        missed_in_row=req.missed_in_row,
        upcoming_leaves=req.upcoming_leaves,
        future_classes=req.future_classes,
        attendance_series=req.attendance_series,
        target_pct=req.target_pct,
    )
    return result


@router.post("/simulate")
async def simulate_endpoint(req: SimulateRequest):
    total = req.total_classes
    attended = req.attended_classes
    future = req.future_classes
    skip = min(req.skip_days, future)
    target = req.target_pct

    current_pct = (attended / total * 100) if total > 0 else 100.0
    new_total = total + future
    new_attended = attended + (future - skip)
    sim_pct = max(0.0, min(100.0, (new_attended / new_total * 100) if new_total > 0 else 0.0))

    risk = "Safe" if sim_pct >= target + 5 else "Warning" if sim_pct >= target - 5 else "Danger"
    is_safe = sim_pct >= target

    # Additional safe skips after simulation
    more_safe = leave_optimizer.max_safe_leaves(new_total, new_attended, target, future)

    return {
        "current_percentage": round(current_pct, 2),
        "simulated_percentage": round(sim_pct, 2),
        "risk_after_skip": risk,
        "is_safe": is_safe,
        "max_more_skips": more_safe,
    }


@router.post("/recommend")
async def recommend_endpoint(req: RecommendRequest):
    recs = recommendation_engine.generate_recommendations(
        risk_level=req.risk_level,
        current_pct=req.current_pct,
        target_pct=req.target_pct,
        subject_name=req.subject_name,
        safe_leaves=req.safe_leaves,
        classes_needed_for_recovery=req.classes_needed,
        attendance_series=req.attendance_series,
    )
    tips = recommendation_engine.generate_study_tips(req.risk_level)
    return {"recommendations": recs, "tips": tips}


@router.post("/leave-optimize")
async def leave_optimize_endpoint(req: LeaveOptRequest):
    schedule = leave_optimizer.optimal_skip_schedule(
        total_classes=req.total_classes,
        attended_classes=req.attended_classes,
        target_pct=req.target_pct,
        future_classes=req.future_classes,
        classes_per_week=req.classes_per_week,
    )
    recovery = leave_optimizer.recovery_plan(req.total_classes, req.attended_classes, req.target_pct)
    return {**schedule, "recovery_plan": recovery}


@router.post("/chatbot")
async def chatbot_endpoint(req: ChatbotRequest):
    msg_lower = req.message.lower()
    context = req.context or {}

    current_pct = context.get("current_percentage", None)
    subject_name = context.get("subject_name", "your subject")
    target = context.get("target_percentage", 75.0)
    total = context.get("total_classes", 0)
    attended = context.get("attended_classes", 0)

    if current_pct is not None:
        risk = "Safe" if current_pct >= target + 5 else "Warning" if current_pct >= target - 5 else "Danger"
        safe_leaves = leave_optimizer.max_safe_leaves(total, attended, target, 20)
        recovery = leave_optimizer.recovery_plan(total, attended, target)

        if any(w in msg_lower for w in ["skip", "bunk", "miss", "leave", "absent", "tomorrow"]):
            if safe_leaves > 0:
                reply = (
                    f"✅ Yes, you can skip! Based on your current attendance of {current_pct:.1f}% in {subject_name}, "
                    f"you have {safe_leaves} safe absence(s) remaining before falling below {target:.0f}%. "
                    f"But use them wisely!"
                )
            else:
                needed = recovery.get("classes_needed", 0)
                reply = (
                    f"❌ No! Skipping now would be risky. Your attendance in {subject_name} is {current_pct:.1f}% "
                    f"which is already {'at' if current_pct == target else 'below'} your {target:.0f}% target. "
                    f"You need to attend the next {needed} consecutive classes to recover."
                )
            return {"reply": reply, "risk_level": risk, "suggestion": f"Safe leaves: {safe_leaves}"}

        if any(w in msg_lower for w in ["status", "how am i", "percentage", "where am i", "attendance", "current"]):
            reply = (
                f"📊 {subject_name}: {current_pct:.1f}% attendance ({risk}). "
                f"Safe leaves remaining: {safe_leaves}. Target: {target:.0f}%."
            )
            return {"reply": reply, "risk_level": risk}

        if any(w in msg_lower for w in ["recover", "improve", "fix", "help"]):
            if recovery["needs_recovery"]:
                reply = f"🔄 To recover in {subject_name}, attend the next {recovery['classes_needed']} consecutive classes. You can do it! 💪"
            else:
                reply = f"✅ No recovery needed for {subject_name}! You're already above target with {current_pct:.1f}%."
            return {"reply": reply, "risk_level": risk}

    # Generic responses
    if any(w in msg_lower for w in ["hello", "hi", "hey"]):
        reply = "👋 Hello! I'm SmartAttend AI. Ask me: 'Can I skip tomorrow?', 'What's my status?', or 'Help me recover'!"
    elif any(w in msg_lower for w in ["help", "what can you do"]):
        reply = "I can tell you:\n• If it's safe to skip classes\n• Your current attendance risk\n• How to recover your attendance\n• How many leaves you have left\n\nSelect a subject first for personalized answers!"
    else:
        reply = "I didn't quite understand that. Try asking: 'Can I skip?', 'What's my attendance?', or 'How do I recover?'. Select a subject for personalized advice!"

    return {"reply": reply, "risk_level": None, "suggestion": None}
