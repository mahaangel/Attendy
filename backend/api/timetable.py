from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import TimetableEntry, HolidayEntry
from api.auth import get_current_user
from typing import List

router = APIRouter(prefix="/timetable", tags=["Timetable & Holidays"])

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


@router.post("/", status_code=201)
async def create_timetable_entry(entry: TimetableEntry, current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Verify subject belongs to user
    subject = await db.subjects.find_one({
        "_id": ObjectId(entry.subject_id),
        "owner_id": current_user["_id"]
    })
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    doc = {
        "owner_id": current_user["_id"],
        "subject_id": ObjectId(entry.subject_id),
        "subject_name": subject["name"],
        "day_of_week": entry.day_of_week,
        "day_name": DAY_NAMES[entry.day_of_week] if 0 <= entry.day_of_week <= 6 else "Unknown",
        "start_time": entry.start_time,
        "end_time": entry.end_time,
        "room": entry.room,
        "created_at": datetime.utcnow(),
    }
    result = await db.timetable.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "subject_id": str(doc["subject_id"]),
        "subject_name": doc["subject_name"],
        "day_of_week": doc["day_of_week"],
        "day_name": doc["day_name"],
        "start_time": doc["start_time"],
        "end_time": doc["end_time"],
        "room": doc["room"],
    }


@router.get("/")
async def get_timetable(current_user: dict = Depends(get_current_user)):
    db = get_db()
    entries = await db.timetable.find({"owner_id": current_user["_id"]}).to_list(200)
    return [
        {
            "id": str(e["_id"]),
            "subject_id": str(e["subject_id"]),
            "subject_name": e.get("subject_name"),
            "day_of_week": e.get("day_of_week", 0),
            "day_name": e.get("day_name", DAY_NAMES[e.get("day_of_week", 0)]),
            "start_time": e["start_time"],
            "end_time": e["end_time"],
            "room": e.get("room"),
        }
        for e in entries
    ]


@router.delete("/{entry_id}", status_code=204)
async def delete_timetable_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.timetable.delete_one({
        "_id": ObjectId(entry_id),
        "owner_id": current_user["_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Timetable entry not found")


# ── Holidays ─────────────────────────────────

@router.post("/holidays", status_code=201)
async def add_holiday(holiday: HolidayEntry, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = {
        "owner_id": current_user["_id"],
        "date": holiday.date,
        "name": holiday.name,
        "type": holiday.type or "holiday",
        "created_at": datetime.utcnow(),
    }
    result = await db.holidays.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "date": holiday.date,
        "name": holiday.name,
        "type": holiday.type or "holiday",
    }


@router.get("/holidays")
async def get_holidays(current_user: dict = Depends(get_current_user)):
    db = get_db()
    holidays = await db.holidays.find({"owner_id": current_user["_id"]}).sort("date", 1).to_list(365)
    return [
        {"id": str(h["_id"]), "date": h["date"], "name": h["name"], "type": h.get("type", "holiday")}
        for h in holidays
    ]


@router.delete("/holidays/{holiday_id}", status_code=204)
async def delete_holiday(holiday_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.holidays.delete_one({
        "_id": ObjectId(holiday_id),
        "owner_id": current_user["_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
