from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse
from app.services.announcement_service import create_announcement, get_all_announcements, get_latest_announcement
from app.services.notification_service import trigger_announcement_created

router = APIRouter()

@router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement_endpoint(
    announcement_data: AnnouncementCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new announcement.
    Replaces: TeacherDashboard.tsx lines 125-129, AdminPortal.tsx lines 453-457
    """
    if user_data["role"] != "admin" and not announcement_data.course_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers must specify a course_id to scope the announcement. Only admins can broadcast platform-wide."
        )
    announcement = await create_announcement(db, announcement_data, user_data["user_id"])
    if announcement.course_id:
        await trigger_announcement_created(db, announcement.id, announcement.course_id)
    else:
        await trigger_announcement_created(db, announcement.id)
    return announcement

@router.get("/announcements", response_model=List[AnnouncementResponse])
async def get_announcements(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all announcements.
    Replaces: AdminPortal.tsx lines 316-319
    """
    announcements = await get_all_announcements(db)
    return announcements

@router.get("/announcements/latest", response_model=AnnouncementResponse)
async def get_latest_announcement_endpoint(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the latest announcement for the dashboard banner.
    Replaces: Dashboard.tsx line 96 (was skipped)
    """
    announcement = await get_latest_announcement(db)
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No announcements found"
        )
    return announcement
