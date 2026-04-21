from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import AttendanceRecord, BulkAttendanceRecord, AttendanceResponse
from api.auth import get_current_user
from typing import List
import csv
import io

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def format_record(r: dict) -> AttendanceResponse:
    return AttendanceResponse(
        id=str(r["_id"]),
        subject_id=str(r["subject_id"]),
        date=r["date"] if isinstance(r["date"], str) else r["date"].strftime("%Y-%m-%d"),
        status=r["status"],
        created_at=r.get("created_at", datetime.utcnow()),
    )


async def _verify_subject(subject_id: str, owner_id, db):
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "owner_id": owner_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


async def _update_subject_counters(db, subject_id: ObjectId, status: str, direction: int = 1):
    """direction=1 for adding, -1 for removing a record"""
    inc = {}
    if status in ("present", "absent"):
        inc["total_classes"] = direction
    if status == "present":
        inc["attended_classes"] = direction
    if inc:
        await db.subjects.update_one({"_id": subject_id}, {"$inc": inc})


@router.post("/{subject_id}/mark", response_model=AttendanceResponse, status_code=201)
async def mark_attendance(subject_id: str, record: AttendanceRecord, current_user: dict = Depends(get_current_user)):
    db = get_db()
    subject = await _verify_subject(subject_id, current_user["_id"], db)

    # Check for duplicate date
    existing = await db.attendance.find_one({
        "subject_id": ObjectId(subject_id),
        "date": record.date,
    })
    if existing:
        # Update instead of duplicate
        old_status = existing["status"]
        await db.attendance.update_one({"_id": existing["_id"]}, {"$set": {"status": record.status}})
        # Adjust counters
        await _update_subject_counters(db, ObjectId(subject_id), old_status, -1)
        await _update_subject_counters(db, ObjectId(subject_id), record.status, 1)
        existing["status"] = record.status
        return format_record(existing)

    new_record = {
        "subject_id": ObjectId(subject_id),
        "date": record.date,
        "status": record.status,
        "created_at": datetime.utcnow(),
    }
    result = await db.attendance.insert_one(new_record)
    new_record["_id"] = result.inserted_id
    await _update_subject_counters(db, ObjectId(subject_id), record.status, 1)
    return format_record(new_record)


@router.post("/{subject_id}/bulk", response_model=List[AttendanceResponse], status_code=201)
async def bulk_mark_attendance(subject_id: str, payload: BulkAttendanceRecord, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _verify_subject(subject_id, current_user["_id"], db)
    results = []
    for rec in payload.records:
        existing = await db.attendance.find_one({"subject_id": ObjectId(subject_id), "date": rec.date})
        if existing:
            await _update_subject_counters(db, ObjectId(subject_id), existing["status"], -1)
            await db.attendance.update_one({"_id": existing["_id"]}, {"$set": {"status": rec.status}})
            await _update_subject_counters(db, ObjectId(subject_id), rec.status, 1)
            existing["status"] = rec.status
            results.append(format_record(existing))
        else:
            doc = {"subject_id": ObjectId(subject_id), "date": rec.date, "status": rec.status, "created_at": datetime.utcnow()}
            r = await db.attendance.insert_one(doc)
            doc["_id"] = r.inserted_id
            await _update_subject_counters(db, ObjectId(subject_id), rec.status, 1)
            results.append(format_record(doc))
    return results


@router.post("/{subject_id}/import-csv", response_model=dict)
async def import_csv(subject_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _verify_subject(subject_id, current_user["_id"], db)

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    imported = 0
    errors = []

    for i, row in enumerate(reader):
        date_val = row.get("date", "").strip()
        status_val = row.get("status", "").strip().lower()
        if not date_val or status_val not in ("present", "absent", "leave"):
            errors.append(f"Row {i+2}: Invalid data — date={date_val!r}, status={status_val!r}")
            continue
        existing = await db.attendance.find_one({"subject_id": ObjectId(subject_id), "date": date_val})
        if existing:
            await _update_subject_counters(db, ObjectId(subject_id), existing["status"], -1)
            await db.attendance.update_one({"_id": existing["_id"]}, {"$set": {"status": status_val}})
            await _update_subject_counters(db, ObjectId(subject_id), status_val, 1)
        else:
            doc = {"subject_id": ObjectId(subject_id), "date": date_val, "status": status_val, "created_at": datetime.utcnow()}
            await db.attendance.insert_one(doc)
            await _update_subject_counters(db, ObjectId(subject_id), status_val, 1)
        imported += 1

    return {"imported": imported, "errors": errors, "total_rows": imported + len(errors)}


@router.get("/{subject_id}/history", response_model=List[AttendanceResponse])
async def get_history(subject_id: str, limit: int = 90, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _verify_subject(subject_id, current_user["_id"], db)
    records = await db.attendance.find({"subject_id": ObjectId(subject_id)}).sort("date", -1).limit(limit).to_list(limit)
    return [format_record(r) for r in records]


@router.delete("/{subject_id}/record/{record_id}", status_code=204)
async def delete_record(subject_id: str, record_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _verify_subject(subject_id, current_user["_id"], db)
    record = await db.attendance.find_one({"_id": ObjectId(record_id), "subject_id": ObjectId(subject_id)})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.attendance.delete_one({"_id": ObjectId(record_id)})
    await _update_subject_counters(db, ObjectId(subject_id), record["status"], -1)
