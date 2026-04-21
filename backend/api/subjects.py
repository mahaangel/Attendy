from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import SubjectCreate, SubjectUpdate, SubjectResponse
from api.auth import get_current_user
from typing import List
import math

router = APIRouter(prefix="/subjects", tags=["Subjects"])


def compute_risk(pct: float, target: float = 75.0) -> str:
    if pct >= target + 5:
        return "Safe"
    elif pct >= target - 5:
        return "Warning"
    else:
        return "Danger"


def compute_safe_leaves(total: int, attended: int, target: float = 75.0) -> int:
    safe = 0
    cur_total = total
    cur_attended = attended
    while True:
        cur_total += 1
        pct = (cur_attended / cur_total) * 100
        if pct < target:
            break
        safe += 1
        if safe > 100:
            break
    return safe


def format_subject(s: dict) -> SubjectResponse:
    total = s.get("total_classes", 0)
    attended = s.get("attended_classes", 0)
    target = s.get("target_percentage", 75.0)
    pct = round((attended / total) * 100, 2) if total > 0 else 100.0
    return SubjectResponse(
        id=str(s["_id"]),
        name=s["name"],
        owner_id=str(s["owner_id"]),
        total_classes=total,
        attended_classes=attended,
        target_percentage=target,
        total_classes_per_week=s.get("total_classes_per_week", 3),
        credits=s.get("credits", 3),
        attendance_percentage=pct,
        risk_level=compute_risk(pct, target),
        safe_leaves=compute_safe_leaves(total, attended, target),
        created_at=s.get("created_at", datetime.utcnow()),
    )


@router.post("/", response_model=SubjectResponse, status_code=201)
async def create_subject(subject: SubjectCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.subjects.find_one({"owner_id": current_user["_id"], "name": subject.name})
    if existing:
        raise HTTPException(status_code=400, detail="Subject with this name already exists")

    doc = {
        "name": subject.name,
        "owner_id": current_user["_id"],
        "total_classes": 0,
        "attended_classes": 0,
        "target_percentage": subject.target_percentage,
        "total_classes_per_week": subject.total_classes_per_week,
        "credits": subject.credits,
        "created_at": datetime.utcnow(),
    }
    result = await db.subjects.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update user's total_subjects count
    await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"total_subjects": 1}})
    return format_subject(doc)


@router.get("/", response_model=List[SubjectResponse])
async def get_subjects(current_user: dict = Depends(get_current_user)):
    db = get_db()
    subjects = await db.subjects.find({"owner_id": current_user["_id"]}).to_list(100)
    return [format_subject(s) for s in subjects]


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return format_subject(subject)


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(subject_id: str, update: SubjectUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    updates = {k: v for k, v in update.model_dump().items() if v is not None}
    if updates:
        await db.subjects.update_one({"_id": ObjectId(subject_id)}, {"$set": updates})
        subject.update(updates)
    return format_subject(subject)


@router.delete("/{subject_id}", status_code=204)
async def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.subjects.delete_one({"_id": ObjectId(subject_id), "owner_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    # Also delete associated attendance records and alerts
    await db.attendance.delete_many({"subject_id": ObjectId(subject_id)})
    await db.alerts.delete_many({"subject_id": ObjectId(subject_id)})
    await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"total_subjects": -1}})
