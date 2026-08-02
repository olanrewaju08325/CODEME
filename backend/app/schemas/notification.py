from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    event_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None

class NotificationUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    read: Optional[bool] = None
