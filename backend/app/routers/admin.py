from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin
from app.schemas.payment import PaymentUpdate, PaymentResponse
from app.schemas.notification import NotificationCreate, NotificationUpdate
from app.schemas.profile import NotificationResponse
from app.services.payment_service import get_all_payments_pending, update_payment_status
from app.services.notification_service import trigger_payment_reviewed, create_notification, get_all_notifications, update_notification, delete_notification

router = APIRouter()

@router.get("/admin/payments/pending", response_model=List[PaymentResponse])
async def get_pending_payments(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all pending payment verifications.
    Replaces: AdminPortal.tsx lines 289-293
    """
    payments = await get_all_payments_pending(db)
    return payments

@router.patch("/admin/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_data: PaymentUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a payment verification.
    Replaces: AdminPortal.tsx lines 379-385, 403-411
    """
    payment = await update_payment_status(db, payment_id, payment_data)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    await trigger_payment_reviewed(db, payment.student_id, payment.id, payment_data.status, payment_data.rejection_reason)
    return payment

@router.post("/admin/notifications", response_model=NotificationResponse)
async def create_notification_endpoint(
    notification_data: NotificationCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new notification for a user.
    """
    notification = await create_notification(db, notification_data)
    return notification

@router.get("/admin/notifications", response_model=List[NotificationResponse])
async def get_all_notifications_endpoint(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all notifications (admin view).
    """
    notifications = await get_all_notifications(db)
    return notifications

@router.patch("/admin/notifications/{notification_id}", response_model=NotificationResponse)
async def update_notification_endpoint(
    notification_id: str,
    notification_data: NotificationUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a notification.
    """
    notification = await update_notification(db, notification_id, notification_data)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification

@router.delete("/admin/notifications/{notification_id}")
async def delete_notification_endpoint(
    notification_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a notification.
    """
    await delete_notification(db, notification_id)
    return {"status": "success", "message": "Notification deleted"}
