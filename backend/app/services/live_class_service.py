from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.live_class import LiveClassSchedule
from app.schemas.live_class import (
    LiveClassScheduleResponse,
    LiveClassScheduleCreate,
    LiveClassScheduleUpdate
)

async def get_all_live_classes(db: AsyncSession, active_only: bool = True) -> List[LiveClassScheduleResponse]:
    """Get all live class schedules."""
    query = select(LiveClassSchedule).order_by(LiveClassSchedule.scheduled_at)
    if active_only:
        query = query.where(LiveClassSchedule.is_active == True)
    
    result = await db.execute(query)
    classes = result.scalars().all()
    
    return [
        LiveClassScheduleResponse(
            id=str(c.id),
            title=c.title,
            description=c.description,
            module_id=str(c.module_id) if c.module_id else None,
            instructor_name=c.instructor_name,
            scheduled_at=c.scheduled_at,
            duration_minutes=c.duration_minutes,
            meeting_link=c.meeting_link,
            recording_url=c.recording_url,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in classes
    ]

async def get_live_class_by_id(db: AsyncSession, class_id: str) -> Optional[LiveClassScheduleResponse]:
    """Get a specific live class by ID."""
    result = await db.execute(
        select(LiveClassSchedule).where(LiveClassSchedule.id == class_id)
    )
    live_class = result.scalar_one_or_none()
    
    if not live_class:
        return None
    
    return LiveClassScheduleResponse(
        id=str(live_class.id),
        title=live_class.title,
        description=live_class.description,
        module_id=str(live_class.module_id) if live_class.module_id else None,
        instructor_name=live_class.instructor_name,
        scheduled_at=live_class.scheduled_at,
        duration_minutes=live_class.duration_minutes,
        meeting_link=live_class.meeting_link,
        recording_url=live_class.recording_url,
        is_active=live_class.is_active,
        created_at=live_class.created_at,
        updated_at=live_class.updated_at
    )

async def get_upcoming_classes(db: AsyncSession, limit: int = 10) -> List[LiveClassScheduleResponse]:
    """Get upcoming live classes."""
    result = await db.execute(
        select(LiveClassSchedule)
        .where(LiveClassSchedule.scheduled_at > datetime.now())
        .where(LiveClassSchedule.is_active == True)
        .order_by(LiveClassSchedule.scheduled_at)
        .limit(limit)
    )
    classes = result.scalars().all()
    
    return [
        LiveClassScheduleResponse(
            id=str(c.id),
            title=c.title,
            description=c.description,
            module_id=str(c.module_id) if c.module_id else None,
            instructor_name=c.instructor_name,
            scheduled_at=c.scheduled_at,
            duration_minutes=c.duration_minutes,
            meeting_link=c.meeting_link,
            recording_url=c.recording_url,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in classes
    ]

async def create_live_class(db: AsyncSession, class_data: LiveClassScheduleCreate) -> LiveClassScheduleResponse:
    """Create a new live class schedule."""
    live_class = LiveClassSchedule(**class_data.model_dump())
    db.add(live_class)
    await db.commit()
    
    return LiveClassScheduleResponse(
        id=str(live_class.id),
        title=live_class.title,
        description=live_class.description,
        module_id=str(live_class.module_id) if live_class.module_id else None,
        instructor_name=live_class.instructor_name,
        scheduled_at=live_class.scheduled_at,
        duration_minutes=live_class.duration_minutes,
        meeting_link=live_class.meeting_link,
        recording_url=live_class.recording_url,
        is_active=live_class.is_active,
        created_at=live_class.created_at,
        updated_at=live_class.updated_at
    )

async def update_live_class(db: AsyncSession, class_id: str, class_data: LiveClassScheduleUpdate) -> Optional[LiveClassScheduleResponse]:
    """Update an existing live class schedule."""
    update_data = {k: v for k, v in class_data.model_dump().items() if v is not None}
    
    await db.execute(
        update(LiveClassSchedule).where(LiveClassSchedule.id == class_id).values(**update_data)
    )
    
    return await get_live_class_by_id(db, class_id)

async def delete_live_class(db: AsyncSession, class_id: str) -> bool:
    """Delete a live class schedule."""
    await db.execute(
        delete(LiveClassSchedule).where(LiveClassSchedule.id == class_id)
    )
    return True