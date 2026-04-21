from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from bson import ObjectId

# Helper to handle MongoDB ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


# ── User Models ─────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    created_at: datetime
    streak_days: int = 0
    total_subjects: int = 0

class UserUpdate(BaseModel):
    name: Optional[str] = None
    target_attendance: Optional[float] = 75.0

# ── Token Models ────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# ── Subject Models ──────────────────────────
class SubjectCreate(BaseModel):
    name: str
    target_percentage: Optional[float] = 75.0
    total_classes_per_week: Optional[int] = 3
    credits: Optional[int] = 3

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    target_percentage: Optional[float] = None
    total_classes_per_week: Optional[int] = None
    credits: Optional[int] = None

class SubjectResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    total_classes: int
    attended_classes: int
    target_percentage: float
    total_classes_per_week: int
    credits: int
    attendance_percentage: float
    risk_level: str
    safe_leaves: int
    created_at: datetime

# ── Attendance Models ────────────────────────
class AttendanceRecord(BaseModel):
    date: str  # YYYY-MM-DD string
    status: str  # 'present', 'absent', 'leave'

class BulkAttendanceRecord(BaseModel):
    records: List[AttendanceRecord]

class AttendanceResponse(BaseModel):
    id: str
    subject_id: str
    date: str
    status: str
    created_at: datetime

# ── Alert Models ────────────────────────────
class AlertCreate(BaseModel):
    subject_id: str
    message: str
    risk_level: str

class AlertResponse(BaseModel):
    id: str
    owner_id: str
    subject_id: str
    subject_name: Optional[str] = None
    message: str
    risk_level: str
    is_read: bool
    created_at: datetime

# ── Prediction Models ────────────────────────
class PredictionRequest(BaseModel):
    subject_id: str
    upcoming_leaves: int = 0
    future_classes: int = 10

class PredictionResponse(BaseModel):
    subject_id: str
    subject_name: str
    current_percentage: float
    future_percentage: float
    risk_classification: str
    safe_leaves_available: int
    recommendation: str
    trend: str  # 'improving', 'declining', 'stable'

# ── Simulation Models ───────────────────────
class SimulationRequest(BaseModel):
    subject_id: str
    skip_days: int
    future_classes: int = 20

class SimulationResponse(BaseModel):
    subject_id: str
    subject_name: str
    current_percentage: float
    simulated_percentage: float
    risk_after_skip: str
    is_safe: bool
    max_more_skips: int
    warning_message: str

# ── Leave Planner Models ────────────────────
class LeavePlannerRequest(BaseModel):
    subject_id: str
    target_percentage: Optional[float] = None
    future_classes: int = 20

class LeavePlannerResponse(BaseModel):
    subject_id: str
    subject_name: str
    current_percentage: float
    target_percentage: float
    max_safe_leaves: int
    classes_to_attend_for_recovery: Optional[int] = None
    recovery_possible: bool
    message: str

# ── Chatbot Models ──────────────────────────
class ChatRequest(BaseModel):
    message: str
    subject_id: Optional[str] = None
    context: Optional[dict] = {}

class ChatResponse(BaseModel):
    reply: str
    risk_level: Optional[str] = None
    suggestion: Optional[str] = None

# ── Analytics Models ────────────────────────
class DashboardStats(BaseModel):
    total_subjects: int
    overall_attendance: float
    safe_subjects: int
    warning_subjects: int
    danger_subjects: int
    streak_days: int
    total_classes_attended: int
    total_classes_held: int

# ── Timetable Models ────────────────────────
class TimetableEntry(BaseModel):
    day_of_week: int  # 0=Sunday, 1=Monday, ..., 6=Saturday
    subject_id: str
    start_time: str  # HH:MM
    end_time: str
    room: Optional[str] = None

class HolidayEntry(BaseModel):
    date: str  # YYYY-MM-DD
    name: str
    type: Optional[str] = "holiday"  # holiday, exam, event
