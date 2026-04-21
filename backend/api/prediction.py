from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import PredictionResponse, LeavePlannerResponse, LeavePlannerRequest
from api.auth import get_current_user
from api.subjects import compute_risk
import httpx
import os

router = APIRouter(prefix="/predict", tags=["Prediction & Leave Planner"])
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8001")


async def call_ai_service(endpoint: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{AI_SERVICE_URL}{endpoint}", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="AI service is unavailable. Using fallback logic.")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI service timed out.")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")


async def get_attendance_series(db, subject_id: ObjectId) -> list:
    records = await db.attendance.find(
        {"subject_id": subject_id, "status": {"$in": ["present", "absent"]}}
    ).sort("date", 1).to_list(365)
    return [1 if r["status"] == "present" else 0 for r in records]


@router.get("/{subject_id}", response_model=PredictionResponse)
async def get_prediction(subject_id: str, upcoming_leaves: int = 0, future_classes: int = 10, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    total = subject.get("total_classes", 0)
    attended = subject.get("attended_classes", 0)
    target = subject.get("target_percentage", 75.0)
    current_pct = (attended / total * 100) if total > 0 else 100.0

    # Get attendance history as time series
    series = await get_attendance_series(db, ObjectId(subject_id))

    # Count missed in row
    missed_in_row = 0
    for s in reversed(series):
        if s == 0:
            missed_in_row += 1
        else:
            break

    try:
        result = await call_ai_service("/predict", {
            "total_classes": total,
            "attended_classes": attended,
            "missed_in_row": missed_in_row,
            "upcoming_leaves": upcoming_leaves,
            "future_classes": future_classes,
            "attendance_series": series[-30:] if len(series) >= 30 else series,
        })
        future_pct = result.get("future_percentage", current_pct)
        risk = result.get("risk_level", compute_risk(future_pct, target))
        safe_leaves = result.get("safe_leaves", 0)
        recommendation = result.get("recommendation", "Keep attending classes regularly.")
        trend = result.get("trend", "stable")
    except HTTPException:
        # Fallback heuristic
        expected_total = total + future_classes
        expected_attended = attended + (future_classes - upcoming_leaves)
        future_pct = max(0, min(100, (expected_attended / expected_total * 100) if expected_total > 0 else 0))
        risk = compute_risk(future_pct, target)
        # compute safe leaves mathematically
        safe_leaves = 0
        cur_t, cur_a = total, attended
        while True:
            cur_t += 1
            pct_if_skip = (cur_a / cur_t) * 100
            if pct_if_skip < target:
                break
            safe_leaves += 1
            if safe_leaves > 100:
                break
        recommendation = "AI service offline. Based on current stats, maintain attendance above target."
        trend = "stable"

    return PredictionResponse(
        subject_id=subject_id,
        subject_name=subject["name"],
        current_percentage=round(current_pct, 2),
        future_percentage=round(future_pct, 2),
        risk_classification=risk,
        safe_leaves_available=safe_leaves,
        recommendation=recommendation,
        trend=trend,
    )


@router.post("/leave-planner", response_model=LeavePlannerResponse)
async def leave_planner(request: LeavePlannerRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    total = subject.get("total_classes", 0)
    attended = subject.get("attended_classes", 0)
    target = request.target_percentage or subject.get("target_percentage", 75.0)
    future = request.future_classes
    current_pct = (attended / total * 100) if total > 0 else 100.0

    # Mathematical max safe leaves over next N classes
    # (attended + x) / (total + future) >= target/100
    # x >= target/100 * (total + future) - attended
    # leaves = future - x
    min_attend = (target / 100) * (total + future) - attended
    max_leaves = max(0, int(future - min_attend))

    recovery_needed = None
    recovery_possible = True
    if current_pct < target:
        # Classes needed consecutively
        cur_t, cur_a = total, attended
        n = 0
        while (cur_a / max(cur_t, 1)) * 100 < target and n <= 200:
            cur_t += 1
            cur_a += 1
            n += 1
        recovery_needed = n
        recovery_possible = n <= 100

    if current_pct >= target:
        msg = f"You can safely skip up to {max_leaves} classes over the next {future} scheduled classes."
    elif recovery_possible:
        msg = f"Your attendance is below {target:.0f}%. Attend the next {recovery_needed} consecutive classes to recover. After that, you will have {max_leaves} safe leaves."
    else:
        msg = f"Critical: You need more than 100 consecutive attendances to recover. Contact your professor."

    return LeavePlannerResponse(
        subject_id=str(subject["_id"]),
        subject_name=subject["name"],
        current_percentage=round(current_pct, 2),
        target_percentage=target,
        max_safe_leaves=max_leaves,
        classes_to_attend_for_recovery=recovery_needed,
        recovery_possible=recovery_possible,
        message=msg,
    )
