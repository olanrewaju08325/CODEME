from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    student_id: Optional[str] = None
    avatar_url: Optional[str] = None
    streak_count: int = 1
    last_active_date: Optional[datetime] = None

class ProfileResponse(ProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class StreakUpdateRequest(BaseModel):
    pass  # No input needed, uses user from JWT

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    read: bool
    created_at: datetime

class UnreadCountResponse(BaseModel):
    count: int

class CertificateStatusResponse(BaseModel):
    can_generate: bool
    passed_quizzes: int
    total_quizzes: int
