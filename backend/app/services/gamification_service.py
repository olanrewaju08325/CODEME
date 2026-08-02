from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.gamification import Badge, Achievement, UserAchievement
from app.models.profile import Profile
from app.schemas.gamification import (
    BadgeResponse,
    AchievementResponse,
    UserAchievementResponse,
    UserGamificationStats
)

async def get_all_badges(db: AsyncSession) -> List[BadgeResponse]:
    """Get all available badges."""
    result = await db.execute(
        select(Badge).order_by(Badge.points_required)
    )
    badges = result.scalars().all()
    
    return [
        BadgeResponse(
            id=str(b.id),
            name=b.name,
            description=b.description,
            icon_url=b.icon_url,
            points_required=b.points_required,
            created_at=b.created_at
        )
        for b in badges
    ]

async def get_user_achievements(db: AsyncSession, user_id: str) -> List[UserAchievementResponse]:
    """Get all achievements earned by a user."""
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement))
        .where(UserAchievement.user_id == user_id)
        .order_by(UserAchievement.earned_at.desc())
    )
    user_achievements = result.scalars().all()
    
    return [
        UserAchievementResponse(
            id=str(ua.id),
            user_id=str(ua.user_id),
            achievement_id=str(ua.achievement_id),
            earned_at=ua.earned_at,
            achievement=AchievementResponse(
                id=str(ua.achievement.id),
                name=ua.achievement.name,
                description=ua.achievement.description,
                criteria=ua.achievement.criteria,
                points=ua.achievement.points,
                created_at=ua.achievement.created_at
            ) if ua.achievement else None
        )
        for ua in user_achievements
    ]

async def get_user_gamification_stats(db: AsyncSession, user_id: str) -> UserGamificationStats:
    """
    Get comprehensive gamification stats for a user.
    Replaces: Dashboard.tsx lines 83-90
    """
    # Get profile for streak count
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalar_one_or_none()
    
    streak_count = profile.streak_count if profile else 0
    
    # Count achievements earned
    result = await db.execute(
        select(func.count(UserAchievement.id))
        .where(UserAchievement.user_id == user_id)
    )
    achievements_count = result.scalar() or 0
    
    # Calculate total points from achievements
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement))
        .where(UserAchievement.user_id == user_id)
    )
    user_achievements = result.scalars().all()
    
    total_points = sum(
        ua.achievement.points for ua in user_achievements if ua.achievement
    )
    
    # Badges earned (for now, equal to achievements count)
    badges_count = achievements_count
    
    return UserGamificationStats(
        total_points=total_points,
        streak_count=streak_count,
        badges_earned=badges_count,
        achievements_earned=achievements_count
    )

async def get_all_achievements(db: AsyncSession) -> List[AchievementResponse]:
    """Get all available achievements (for admin)."""
    result = await db.execute(
        select(Achievement).order_by(Achievement.points)
    )
    achievements = result.scalars().all()
    
    return [
        AchievementResponse(
            id=str(a.id),
            name=a.name,
            description=a.description,
            criteria=a.criteria,
            points=a.points,
            created_at=a.created_at
        )
        for a in achievements
    ]

async def award_achievement(db: AsyncSession, user_id: str, achievement_id: str) -> UserAchievementResponse:
    """
    Award an achievement to a user.
    Replaces: App.tsx lines 210-233
    """
    # Check if already earned
    existing = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
        .where(UserAchievement.achievement_id == achievement_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("User already has this achievement")
    
    # Create user achievement
    user_achievement = UserAchievement(
        user_id=user_id,
        achievement_id=achievement_id
    )
    db.add(user_achievement)
    await db.commit()
    
    # Fetch with achievement data
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement))
        .where(UserAchievement.id == user_achievement.id)
    )
    ua = result.scalar_one_or_none()
    
    return UserAchievementResponse(
        id=str(ua.id),
        user_id=str(ua.user_id),
        achievement_id=str(ua.achievement_id),
        earned_at=ua.earned_at,
        achievement=AchievementResponse(
            id=str(ua.achievement.id),
            name=ua.achievement.name,
            description=ua.achievement.description,
            criteria=ua.achievement.criteria,
            points=ua.achievement.points,
            created_at=ua.achievement.created_at
        ) if ua.achievement else None
    )

# Admin functions for managing achievements and badges

async def create_achievement(
    db: AsyncSession,
    name: str,
    description: Optional[str],
    criteria: str,
    points: int
) -> AchievementResponse:
    """Create a new achievement."""
    achievement = Achievement(
        name=name,
        description=description,
        criteria=criteria,
        points=points
    )
    db.add(achievement)
    await db.commit()
    
    return AchievementResponse(
        id=str(achievement.id),
        name=achievement.name,
        description=achievement.description,
        criteria=achievement.criteria,
        points=achievement.points,
        created_at=achievement.created_at
    )

async def create_badge(
    db: AsyncSession,
    name: str,
    description: Optional[str],
    icon_url: Optional[str],
    points_required: int
) -> BadgeResponse:
    """Create a new badge."""
    badge = Badge(
        name=name,
        description=description,
        icon_url=icon_url,
        points_required=points_required
    )
    db.add(badge)
    await db.commit()
    
    return BadgeResponse(
        id=str(badge.id),
        name=badge.name,
        description=badge.description,
        icon_url=badge.icon_url,
        points_required=badge.points_required,
        created_at=badge.created_at
    )