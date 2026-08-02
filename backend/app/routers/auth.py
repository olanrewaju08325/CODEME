from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.profile import Profile
from app.services.profile_service import (
    get_profile_by_id,
    update_profile_streak,
    get_unread_notification_count,
    get_user_notifications,
    mark_notifications_as_read,
    get_certificate_status
)
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdate,
    StreakUpdateRequest,
    NotificationResponse,
    UnreadCountResponse,
    CertificateStatusResponse
)
from typing import Dict, Any

router = APIRouter()

@router.get("/profile/me", response_model=ProfileResponse)
async def get_current_profile(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current user's profile.
    Replaces: supabase.from('profiles').select('*').eq('id', activeSession.user.id).single()
    """
    profile = await get_profile_by_id(db, user_data["user_id"])
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        email=profile.email,
        role=profile.role,
        student_id=profile.student_id,
        avatar_url=profile.avatar_url,
        streak_count=profile.streak_count,
        last_active_date=profile.last_active_date,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )

@router.post("/profile/update-streak", response_model=ProfileResponse)
async def update_streak(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user's streak count based on login activity.
    Replaces: App.tsx lines 172-198
    """
    profile = await update_profile_streak(db, user_data["user_id"])
    
    return ProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        email=profile.email,
        role=profile.role,
        student_id=profile.student_id,
        avatar_url=profile.avatar_url,
        streak_count=profile.streak_count,
        last_active_date=profile.last_active_date,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )

@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get count of unread notifications.
    Replaces: App.tsx lines 121-127
    """
    count = await get_unread_notification_count(db, user_data["user_id"])
    return UnreadCountResponse(count=count)

@router.get("/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Get paginated notifications for current user.
    Replaces: App.tsx lines 421-426
    """
    notifications = await get_user_notifications(db, user_data["user_id"], limit)
    return notifications

@router.post("/notifications/mark-read")
async def mark_notifications_read(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark all unread notifications as read.
    Replaces: App.tsx line 429
    """
    updated_count = await mark_notifications_as_read(db, user_data["user_id"])
    return {"status": "success", "updated_count": updated_count}

@router.get("/profile/certificate-status", response_model=CertificateStatusResponse)
async def get_certificate_status(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    course_id: str = "wd101"
):
    """
    Check if user can generate a certificate.
    Replaces: App.tsx lines 131-152
    """
    status = await get_certificate_status(db, user_data["user_id"], course_id)
    return status

@router.patch("/profile/me", response_model=ProfileResponse)
async def update_profile(
    profile_update: ProfileUpdate,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile (name, avatar).
    Replaces: Onboarding.tsx lines 49-52 and 116-119
    """
    profile = await get_profile_by_id(db, user_data["user_id"])
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update only provided fields
    update_data = {}
    if profile_update.full_name is not None:
        update_data["full_name"] = profile_update.full_name
    if profile_update.avatar_url is not None:
        update_data["avatar_url"] = profile_update.avatar_url
    
    if update_data:
        await db.execute(
            update(Profile)
            .where(Profile.id == user_data["user_id"])
            .values(**update_data)
        )
        
        # Fetch updated profile
        profile = await get_profile_by_id(db, user_data["user_id"])
    
    return ProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        email=profile.email,
        role=profile.role,
        student_id=profile.student_id,
        avatar_url=profile.avatar_url,
        streak_count=profile.streak_count,
        last_active_date=profile.last_active_date,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )

