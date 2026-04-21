from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timedelta
from models.database import get_db
from models.domain import ChatRequest, ChatResponse, DashboardStats
from api.auth import get_current_user
from api.subjects import compute_risk
import httpx
import os

router = APIRouter(prefix="/analytics", tags=["Analytics & Chatbot"])
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8001")


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    subjects = await db.subjects.find({"owner_id": current_user["_id"]}).to_list(100)

    total_subj = len(subjects)
    total_attended = sum(s.get("attended_classes", 0) for s in subjects)
    total_held = sum(s.get("total_classes", 0) for s in subjects)
    overall_pct = (total_attended / total_held * 100) if total_held > 0 else 100.0

    safe = warning = danger = 0
    for s in subjects:
        t = s.get("total_classes", 0)
        a = s.get("attended_classes", 0)
        tgt = s.get("target_percentage", 75.0)
        pct = (a / t * 100) if t > 0 else 100.0
        risk = compute_risk(pct, tgt)
        if risk == "Safe":
            safe += 1
        elif risk == "Warning":
            warning += 1
        else:
            danger += 1

    streak = current_user.get("streak_days", 0)

    return DashboardStats(
        total_subjects=total_subj,
        overall_attendance=round(overall_pct, 2),
        safe_subjects=safe,
        warning_subjects=warning,
        danger_subjects=danger,
        streak_days=streak,
        total_classes_attended=total_attended,
        total_classes_held=total_held,
    )


@router.get("/heatmap/{subject_id}")
async def get_heatmap(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Last 90 days
    cutoff = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")
    records = await db.attendance.find({
        "subject_id": ObjectId(subject_id),
        "date": {"$gte": cutoff},
    }).sort("date", 1).to_list(90)

    heatmap = {r["date"]: r["status"] for r in records}
    return {"subject_id": subject_id, "heatmap": heatmap}


@router.get("/trend/{subject_id}")
async def get_trend(subject_id: str, weeks: int = 8, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    records = await db.attendance.find({
        "subject_id": ObjectId(subject_id),
        "status": {"$in": ["present", "absent"]},
    }).sort("date", 1).to_list(365)

    # Group by week
    from collections import defaultdict
    weekly: dict = defaultdict(lambda: {"present": 0, "total": 0})
    for r in records:
        try:
            d = datetime.strptime(r["date"], "%Y-%m-%d")
            week_key = d.strftime("%Y-W%U")
            weekly[week_key]["total"] += 1
            if r["status"] == "present":
                weekly[week_key]["present"] += 1
        except:
            pass

    trend_data = [
        {
            "week": week,
            "attendance_pct": round((v["present"] / v["total"] * 100) if v["total"] > 0 else 0, 1),
            "present": v["present"],
            "total": v["total"],
        }
        for week, v in sorted(weekly.items())[-weeks:]
    ]
    return {"subject_id": subject_id, "trend": trend_data}


@router.get("/overview")
async def get_all_subjects_overview(current_user: dict = Depends(get_current_user)):
    db = get_db()
    subjects = await db.subjects.find({"owner_id": current_user["_id"]}).to_list(100)
    result = []
    for s in subjects:
        t = s.get("total_classes", 0)
        a = s.get("attended_classes", 0)
        tgt = s.get("target_percentage", 75.0)
        pct = round((a / t * 100), 1) if t > 0 else 100.0
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "attendance_pct": pct,
            "target_pct": tgt,
            "risk": compute_risk(pct, tgt),
            "attended": a,
            "total": t,
        })
    return {"subjects": result}


@router.post("/chatbot", response_model=ChatResponse)
async def chatbot(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Get subject context if provided
    context_data = {}
    if request.subject_id:
        subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id), "owner_id": current_user["_id"]})
        if subject:
            t = subject.get("total_classes", 0)
            a = subject.get("attended_classes", 0)
            tgt = subject.get("target_percentage", 75.0)
            pct = (a / t * 100) if t > 0 else 100.0
            context_data = {
                "subject_name": subject["name"],
                "total_classes": t,
                "attended_classes": a,
                "target_percentage": tgt,
                "current_percentage": round(pct, 2),
            }

    # Try AI service
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{AI_SERVICE_URL}/chatbot", json={
                "message": request.message,
                "context": context_data,
            })
            resp.raise_for_status()
            ai_resp = resp.json()
            return ChatResponse(
                reply=ai_resp.get("reply", "I'm not sure how to answer that."),
                risk_level=ai_resp.get("risk_level"),
                suggestion=ai_resp.get("suggestion"),
            )
    except Exception:
        pass

    # Fallback rule-based chatbot
    msg = request.message.lower()
    if context_data:
        pct = context_data.get("current_percentage", 100)
        name = context_data.get("subject_name", "this subject")
        target = context_data.get("target_percentage", 75)
        t = context_data.get("total_classes", 0)
        a = context_data.get("attended_classes", 0)

        # safe leaves
        cur_t, cur_a, safe_leaves = t, a, 0
        while True:
            cur_t += 1
            if (cur_a / cur_t * 100) < target:
                break
            safe_leaves += 1
            if safe_leaves > 100:
                break

        risk = compute_risk(pct, target)

        if any(w in msg for w in ["skip", "bunk", "miss", "leave"]):
            if safe_leaves > 0:
                return ChatResponse(
                    reply=f"Yes, you can safely skip up to {safe_leaves} more class(es) for {name} while staying above {target:.0f}%. Your current attendance is {pct:.1f}% ({risk}).",
                    risk_level=risk,
                    suggestion=f"You have {safe_leaves} safe bundle(s) remaining."
                )
            else:
                classes_needed = 0
                cur_t2, cur_a2 = t, a
                while (cur_a2 / max(cur_t2, 1)) * 100 < target and classes_needed < 100:
                    cur_t2 += 1; cur_a2 += 1; classes_needed += 1
                return ChatResponse(
                    reply=f"❌ No! You cannot skip any more classes for {name}. Your attendance is {pct:.1f}% which is already {'at' if pct == target else 'below'} your {target:.0f}% target. Attend the next {classes_needed} classes to recover.",
                    risk_level=risk,
                    suggestion=f"Attend the next {classes_needed} consecutive classes immediately."
                )

        if any(w in msg for w in ["safe", "status", "how am i", "percentage", "attendance"]):
            return ChatResponse(
                reply=f"Your attendance in {name} is {pct:.1f}% (Target: {target:.0f}%). Status: {risk}. Safe leaves remaining: {safe_leaves}.",
                risk_level=risk,
                suggestion="Keep attending regularly to stay safe."
            )

    # Generic fallback
    if any(w in msg for w in ["skip", "bunk", "miss"]):
        return ChatResponse(
            reply="To answer that, please select a subject first and then ask me. I'll tell you exactly how many classes you can safely skip!",
            risk_level=None,
            suggestion="Select a subject from the dropdown above."
        )

    return ChatResponse(
        reply=f"Hi {current_user['name']}! I'm your SmartAttend AI assistant. Ask me things like 'Can I skip tomorrow?', 'What's my attendance?', or 'How many classes can I miss?'",
        risk_level=None,
        suggestion=None
    )
