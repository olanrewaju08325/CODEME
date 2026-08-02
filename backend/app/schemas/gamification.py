from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BadgeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    points_required: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AchievementResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    criteria: str
    points: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserAchievementResponse(BaseModel):
    id: str
    user_id: str
    achievement_id: str
    earned_at: datetime
    achievement: Optional[AchievementResponse] = None
    
    class Config:
        from_attributes = True

class UserGamificationStats(BaseModel):
    total_points: int
    streak_count: int
    badges_earned: int
    achievements_earned: int