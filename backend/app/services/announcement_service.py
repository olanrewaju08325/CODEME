from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
import uuid
from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse

async def create_announcement(db: AsyncSession, announcement_data: AnnouncementCreate, created_by: str) -> AnnouncementResponse:
    announcement = Announcement(
        title=announcement_data.title,
        body=announcement_data.body,
        content=announcement_data.content,
        course_id=announcement_data.course_id,
        created_by=uuid.UUID(created_by)
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    return AnnouncementResponse(
        id=str(announcement.id),
        title=announcement.title,
        body=announcement.body,
        content=announcement.content,
        course_id=announcement.course_id,
        created_by=str(announcement.created_by),
        created_at=announcement.created_at
    )

async def get_all_announcements(db: AsyncSession) -> List[AnnouncementResponse]:
    result = await db.execute(
        select(Announcement)
        .order_by(desc(Announcement.created_at))
    )
    announcements = result.scalars().all()

    return [
        AnnouncementResponse(
            id=str(a.id),
            title=a.title,
            body=a.body,
            content=a.content,
            course_id=a.course_id,
            created_by=str(a.created_by),
            created_at=a.created_at
        )
        for a in announcements
    ]

async def get_latest_announcement(db: AsyncSession) -> Optional[AnnouncementResponse]:
    result = await db.execute(
        select(Announcement)
        .order_by(desc(Announcement.created_at))
        .limit(1)
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        return None

    return AnnouncementResponse(
        id=str(announcement.id),
        title=announcement.title,
        body=announcement.body,
        content=announcement.content,
        course_id=announcement.course_id,
        created_by=str(announcement.created_by),
        created_at=announcement.created_at
    )
