from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EnrollmentApplicationCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    course_id: str

class EnrollmentApplicationResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    course_id: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class StudentEnrollmentResponse(BaseModel):
    id: str
    student_id: str
    course_id: str
    batch: int
    status: str
    enrolled_at: datetime
    profiles: Optional[dict] = None  # Profile data when joined
    
    class Config:
        from_attributes = True

class AutoEnrollRequest(BaseModel):
    course_id: str = "wd101"

class AutoEnrollResponse(BaseModel):
    success: bool
    enrollment: Optional[StudentEnrollmentResponse] = None
    message: str

class CreateStudentAccountRequest(BaseModel):
    email: str
    password: str
    full_name: str
    course_id: str = "wd101"
    user_id: Optional[str] = None  # If provided, use this as the profile ID (from Supabase Auth)

class CreateStudentAccountResponse(BaseModel):
    success: bool
    student_id: Optional[str] = None
    message: str

class WaitlistStudentResponse(BaseModel):
    id: str
    student_id: str
    full_name: str
    student_display_id: str
    email: str
    course_id: str
    batch: int
    status: str
    has_platform_access: bool = True
    
    class Config:
        from_attributes = True

class BatchCapacityUpdate(BaseModel):
    max_batch_size: int

class PromoteStudentRequest(BaseModel):
    target_batch: int

class CourseCapacityResponse(BaseModel):
    course_id: str
    title: str
    whatsapp_group_cap: int
    platform_access_cap: int
    total_batches: int
    single_batch_only: bool
    enrolled_count: int = 0
    platform_access_count: int = 0
    whatsapp_count: int = 0
    waitlist_count: int = 0

class PasswordResetRequest(BaseModel):
    target_email: str
    new_password: str

class ApplicationStatusUpdate(BaseModel):
    status: str  # approved or rejected