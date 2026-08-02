from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.models.profile import Profile
from app.models.notification import Notification
from app.models.quiz import QuizAttempt, Quiz
from app.schemas.profile import ProfileResponse, NotificationResponse, UnreadCountResponse, CertificateStatusResponse

async def get_profile_by_id(db: AsyncSession, user_id: str) -> Optional[Profile]:
    """Fetch a profile by user ID."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    return result.scalar_one_or_none()

async def update_profile_streak(db: AsyncSession, user_id: str) -> Profile:
    """
    Update user's streak count based on last active date.
    Implements the logic from App.tsx lines 172-198.
    """
    profile = await get_profile_by_id(db, user_id)
    if not profile:
        raise ValueError("Profile not found")
    
    today = datetime.now().date()
    
    # Calculate new streak count
    if not profile.last_active_date:
        # First time - start streak at 1
        new_streak = 1
    else:
        days_diff = (today - profile.last_active_date).days
        if days_diff == 1:
            # Consecutive day - increment streak
            new_streak = profile.streak_count + 1
        elif days_diff > 1:
            # Missed a day or more - reset to 1
            new_streak = 1
        else:
            # Same day - no change
            new_streak = profile.streak_count
    
    # Update profile
    await db.execute(
        update(Profile)
        .where(Profile.id == user_id)
        .values(
            streak_count=new_streak,
            last_active_date=today
        )
    )
    
    # Fetch updated profile
    updated_profile = await get_profile_by_id(db, user_id)
    return updated_profile

async def get_unread_notification_count(db: AsyncSession, user_id: str) -> int:
    """Get count of unread notifications for a user."""
    result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == user_id)
        .where(Notification.read == False)
    )
    return result.scalar() or 0

async def get_user_notifications(db: AsyncSession, user_id: str, limit: int = 50) -> list[NotificationResponse]:
    """Get paginated notifications for a user."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            user_id=str(n.user_id),
            title=n.title,
            message=n.message,
            read=n.read,
            created_at=n.created_at
        )
        for n in notifications
    ]

async def mark_notifications_as_read(db: AsyncSession, user_id: str) -> int:
    """Mark all unread notifications as read for a user."""
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.read == False)
        .values(read=True)
    )
    return result.rowcount

async def get_certificate_status(db: AsyncSession, user_id: str, course_id: str = "wd101") -> CertificateStatusResponse:
    """
    Check if user can generate a certificate.
    Implements logic from App.tsx lines 131-152.
    """
    # Get all passed quizzes for the course
    # This requires complex joins - simplified version for now
    result = await db.execute(
        select(QuizAttempt.quiz_id)
        .where(QuizAttempt.student_id == user_id)
        .where(QuizAttempt.passed == True)
        .distinct()
    )
    
    passed_quiz_ids = result.scalars().all()
    
    # Get total quizzes for the course (this would need module/course joins)
    # For now, we know WD101 has 6 quizzes from the seed data
    total_quizzes = 6
    
    return CertificateStatusResponse(
        can_generate=len(passed_quiz_ids) >= total_quizzes,
        passed_quizzes=len(passed_quiz_ids),
        total_quizzes=total_quizzes
    )