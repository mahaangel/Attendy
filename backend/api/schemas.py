from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class SubjectBase(BaseModel):
    name: str
    target_percentage: Optional[float] = 75.0

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    owner_id: int
    total_classes: int
    attended_classes: int
    class Config:
        from_attributes = True

class AttendanceRecord(BaseModel):
    date: datetime.date
    status: str # 'present', 'absent', 'leave'

class AttendanceResponse(AttendanceRecord):
    id: int
    subject_id: int
    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    subject_id: int
    future_percentage: float
    risk_classification: str # Safe, Warning, Danger
    safe_leaves_available: int
