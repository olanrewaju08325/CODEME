from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentCreate(BaseModel):
    quiz_id: str
    receipt_file_path: str
    amount: int = 2000

class PaymentUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    student_id: str
    quiz_id: str
    receipt_url: str
    receipt_file_path: Optional[str] = None
    status: str
    amount: int
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    student_name: Optional[str] = None
    quiz_title: Optional[str] = None
    signed_url: Optional[str] = None

    class Config:
        from_attributes = True
