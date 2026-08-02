from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LiveClassScheduleResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    module_id: Optional[str]
    instructor_name: str
    scheduled_at: datetime
    duration_minutes: int
    meeting_link: Optional[str]
    recording_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LiveClassScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    module_id: Optional[str] = None
    instructor_name: str
    scheduled_at: datetime
    duration_minutes: int
    meeting_link: Optional[str] = None
    recording_url: Optional[str] = None
    is_active: bool = True

class LiveClassScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    module_id: Optional[str] = None
    instructor_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None
    recording_url: Optional[str] = None
    is_active: Optional[bool] = None