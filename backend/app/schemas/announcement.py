from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnnouncementCreate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    content: Optional[str] = None
    course_id: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: str
    title: Optional[str] = None
    body: Optional[str] = None
    content: Optional[str] = None
    course_id: Optional[str] = None
    created_by: str
    creator_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
