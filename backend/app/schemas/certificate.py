from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CertificateResponse(BaseModel):
    id: str
    student_id: str
    course_id: str
    certificate_url: str
    issued_at: datetime
    certificate_number: str
    
    class Config:
        from_attributes = True

class CertificateCreate(BaseModel):
    course_id: str
    certificate_url: str