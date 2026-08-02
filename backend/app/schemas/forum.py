from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ForumReplyResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ForumPostResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    category: Optional[str]
    created_at: datetime
    updated_at: datetime
    replies: Optional[List[ForumReplyResponse]] = None
    
    class Config:
        from_attributes = True

class ForumPostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"

class ForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class ForumReplyCreate(BaseModel):
    content: str

class ForumReplyUpdate(BaseModel):
    content: str