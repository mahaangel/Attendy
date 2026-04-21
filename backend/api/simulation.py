from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from models.database import get_db
from models.domain import SimulationRequest, SimulationResponse
from api.auth import get_current_user
from api.subjects import compute_risk

router = APIRouter(prefix="/simulate", tags=["What-If Simulation"])


@router.post("/", response_model=SimulationResponse)
async def simulate(request: SimulationRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(request.subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    total = subject.get("total_classes", 0)
    attended = subject.get("attended_classes", 0)
    target = subject.get("target_percentage", 75.0)
    future = request.future_classes
    skip = min(request.skip_days, future)  # can't skip more than future classes

    current_pct = (attended / total * 100) if total > 0 else 100.0

    # Simulate: assume they skip `skip_days` and attend the rest
    new_total = total + future
    new_attended = attended + (future - skip)
    simulated_pct = (new_attended / new_total * 100) if new_total > 0 else 0.0
    simulated_pct = max(0, min(100, simulated_pct))

    risk_after = compute_risk(simulated_pct, target)
    is_safe = simulated_pct >= target

    # How many MORE can they skip after this simulation stays safe?
    max_more = 0
    cur_t, cur_a = new_total, new_attended
    while True:
        cur_t += 1
        pct_if_skip = (cur_a / cur_t) * 100
        if pct_if_skip < target:
            break
        max_more += 1
        if max_more > 100:
            break

    if is_safe:
        warning = f"Skipping {skip} classes is SAFE. Your attendance will be {simulated_pct:.1f}% ({risk_after})."
    else:
        gap = target - simulated_pct
        warning = f"⚠️ Skipping {skip} classes will drop you to {simulated_pct:.1f}% — {gap:.1f}% below target! This is RISKY."

    return SimulationResponse(
        subject_id=str(subject["_id"]),
        subject_name=subject["name"],
        current_percentage=round(current_pct, 2),
        simulated_percentage=round(simulated_pct, 2),
        risk_after_skip=risk_after,
        is_safe=is_safe,
        max_more_skips=max_more,
        warning_message=warning,
    )
