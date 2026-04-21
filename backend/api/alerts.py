from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import AlertResponse, AlertCreate
from api.auth import get_current_user
from utils.notifier import send_alert_email
from typing import List

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def format_alert(a: dict) -> AlertResponse:
    return AlertResponse(
        id=str(a["_id"]),
        owner_id=str(a["owner_id"]),
        subject_id=str(a["subject_id"]),
        subject_name=a.get("subject_name"),
        message=a["message"],
        risk_level=a["risk_level"],
        is_read=a.get("is_read", False),
        created_at=a.get("created_at", datetime.utcnow()),
    )


async def _send_alert_bg(email: str, name: str, subject_name: str, risk: str, pct: float, rec: str):
    send_alert_email(email, name, subject_name, risk, pct, rec)


@router.get("/", response_model=List[AlertResponse])
async def get_alerts(unread_only: bool = False, current_user: dict = Depends(get_current_user)):
    db = get_db()
    query = {"owner_id": current_user["_id"]}
    if unread_only:
        query["is_read"] = False
    alerts = await db.alerts.find(query).sort("created_at", -1).limit(50).to_list(50)
    return [format_alert(a) for a in alerts]


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    db = get_db()
    count = await db.alerts.count_documents({"owner_id": current_user["_id"], "is_read": False})
    return {"unread_count": count}


@router.put("/{alert_id}/read", response_model=AlertResponse)
async def mark_read(alert_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    alert = await db.alerts.find_one({"_id": ObjectId(alert_id), "owner_id": current_user["_id"]})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"is_read": True}})
    alert["is_read"] = True
    return format_alert(alert)


@router.put("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.alerts.update_many(
        {"owner_id": current_user["_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"marked_read": result.modified_count}


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.alerts.delete_one({"_id": ObjectId(alert_id), "owner_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")


@router.post("/check-and-send", response_model=dict)
async def check_and_send_alerts(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Scan all subjects and create/send alerts for risky ones."""
    db = get_db()
    subjects = await db.subjects.find({"owner_id": current_user["_id"]}).to_list(100)
    created = 0

    for subj in subjects:
        total = subj.get("total_classes", 0)
        attended = subj.get("attended_classes", 0)
        target = subj.get("target_percentage", 75.0)
        if total == 0:
            continue
        pct = (attended / total) * 100

        if pct >= target + 5:
            risk = "Safe"
        elif pct >= target - 5:
            risk = "Warning"
        else:
            risk = "Danger"

        if risk in ("Warning", "Danger"):
            # avoid duplicate alerts within 24h
            cutoff = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            dup = await db.alerts.find_one({
                "owner_id": current_user["_id"],
                "subject_id": subj["_id"],
                "risk_level": risk,
                "created_at": {"$gte": cutoff},
            })
            if dup:
                continue

            classes_needed = 0
            if pct < target:
                # How many consecutive classes to attend to reach target
                cur_t, cur_a = total, attended
                while True:
                    cur_t += 1
                    cur_a += 1
                    classes_needed += 1
                    if (cur_a / cur_t) * 100 >= target or classes_needed > 100:
                        break

            rec = (
                f"Attend the next {classes_needed} classes consecutively to recover above {target:.0f}%."
                if pct < target else
                f"You are close to the attendance boundary. Avoid missing classes for the next 2 weeks."
            )
            msg = f"Your attendance in {subj['name']} is {pct:.1f}% — {risk} level. {rec}"

            alert_doc = {
                "owner_id": current_user["_id"],
                "subject_id": subj["_id"],
                "subject_name": subj["name"],
                "message": msg,
                "risk_level": risk,
                "is_read": False,
                "created_at": datetime.utcnow(),
            }
            await db.alerts.insert_one(alert_doc)
            created += 1

            # Send email in background
            background_tasks.add_task(
                _send_alert_bg,
                current_user["email"],
                current_user["name"],
                subj["name"],
                risk,
                pct,
                rec
            )

    return {"alerts_created": created, "message": f"{created} new alert(s) generated."}
