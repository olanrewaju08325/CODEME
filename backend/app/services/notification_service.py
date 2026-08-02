from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.notification import Notification
from app.models.enrollment import StudentEnrollment
from app.schemas.notification import NotificationCreate, NotificationUpdate
from app.schemas.profile import NotificationResponse

async def create_notification(db: AsyncSession, notification_data: NotificationCreate) -> NotificationResponse:
    notification = Notification(
        user_id=uuid.UUID(notification_data.user_id),
        title=notification_data.title,
        message=notification_data.message,
        event_type=notification_data.event_type,
        related_entity_id=uuid.UUID(notification_data.related_entity_id) if notification_data.related_entity_id else None,
        related_entity_type=notification_data.related_entity_type
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    return NotificationResponse(
        id=str(notification.id),
        user_id=str(notification.user_id),
        title=notification.title,
        message=notification.message,
        read=notification.read,
        created_at=notification.created_at
    )

async def get_all_notifications(db: AsyncSession) -> List[NotificationResponse]:
    result = await db.execute(
        select(Notification).order_by(Notification.created_at.desc())
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

async def update_notification(db: AsyncSession, notification_id: str, notification_data: NotificationUpdate) -> Optional[NotificationResponse]:
    update_data = {k: v for k, v in notification_data.model_dump().items() if v is not None}

    await db.execute(
        update(Notification).where(Notification.id == notification_id).values(**update_data)
    )

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        return None

    return NotificationResponse(
        id=str(notification.id),
        user_id=str(notification.user_id),
        title=notification.title,
        message=notification.message,
        read=notification.read,
        created_at=notification.created_at
    )

async def delete_notification(db: AsyncSession, notification_id: str) -> bool:
    await db.execute(
        delete(Notification).where(Notification.id == notification_id)
    )
    return True

# Notification Trigger System — event-based notification creation

async def trigger_payment_submitted(db: AsyncSession, student_id: str, quiz_id: str, payment_id: str):
    """Notify admins that a new payment receipt needs review."""
    result = await db.execute(
        select(Notification).where(Notification.event_type == "payment_submitted").where(Notification.related_entity_id == uuid.UUID(payment_id))
    )
    existing = result.scalar_one_or_none()
    if existing:
        return

    notification = Notification(
        user_id=uuid.UUID(student_id),
        title="Payment Receipt Submitted",
        message="Your exam retake payment receipt has been submitted and is pending review.",
        event_type="payment_submitted",
        related_entity_id=uuid.UUID(payment_id),
        related_entity_type="exam_payment_verification"
    )
    db.add(notification)
    await db.commit()

async def trigger_payment_reviewed(db: AsyncSession, student_id: str, payment_id: str, status: str, rejection_reason: str = None):
    """Notify student that their payment was approved or rejected."""
    title = "Payment Approved" if status == "approved" else "Payment Rejected"
    message = "Your exam retake payment receipt has been approved. You can now retake the exam."
    if status == "rejected":
        message = f"Your exam retake payment receipt has been rejected."
        if rejection_reason:
            message += f" Reason: {rejection_reason}"

    notification = Notification(
        user_id=uuid.UUID(student_id),
        title=title,
        message=message,
        event_type="payment_reviewed",
        related_entity_id=uuid.UUID(payment_id),
        related_entity_type="exam_payment_verification"
    )
    db.add(notification)
    await db.commit()

async def trigger_announcement_created(db: AsyncSession, announcement_id: str, course_id: str = None):
    """Notify enrolled students of a new announcement.
    
    If course_id is provided, only notify students enrolled in that course.
    Otherwise, notify all enrolled students (platform-wide).
    Uses a single query + bulk insert — no per-student loops.
    """
    query = select(StudentEnrollment.student_id).where(
        StudentEnrollment.status == "enrolled",
        StudentEnrollment.has_platform_access == True
    )
    if course_id:
        query = query.where(StudentEnrollment.course_id == course_id)

    result = await db.execute(query)
    student_ids = result.scalars().all()

    if not student_ids:
        return

    now = datetime.utcnow()
    notification_rows = [
        {
            "id": uuid.uuid4(),
            "user_id": sid,
            "title": "New Announcement",
            "message": "A new announcement has been posted.",
            "read": False,
            "event_type": "announcement_created",
            "related_entity_id": uuid.UUID(announcement_id),
            "related_entity_type": "announcement",
            "created_at": now
        }
        for sid in student_ids
    ]

    await db.execute(insert(Notification), notification_rows)
    await db.commit()

async def trigger_exam_graded(db: AsyncSession, student_id: str, quiz_id: str, status: str):
    """Notify student that their exam was graded."""
    notification = Notification(
        user_id=uuid.UUID(student_id),
        title="Exam Graded",
        message=f"Your exam has been graded. Status: {status}.",
        event_type="exam_graded",
        related_entity_id=uuid.UUID(quiz_id),
        related_entity_type="quiz"
    )
    db.add(notification)
    await db.commit()

async def trigger_live_class_soon(db: AsyncSession, user_id: str, class_id: str, class_title: str):
    """Remind user that a live class is starting soon."""
    notification = Notification(
        user_id=uuid.UUID(user_id),
        title="Live Class Starting Soon",
        message=f"Your live class '{class_title}' is starting soon!",
        event_type="live_class_soon",
        related_entity_id=uuid.UUID(class_id),
        related_entity_type="live_class"
    )
    db.add(notification)
    await db.commit()
