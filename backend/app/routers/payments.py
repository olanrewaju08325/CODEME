from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_student, require_teacher_or_admin
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import create_payment, get_payments_for_student, count_approved_payments
from app.services.notification_service import trigger_payment_submitted

router = APIRouter()

@router.post("/payments", response_model=PaymentResponse)
async def submit_payment(
    payment_data: PaymentCreate,
    user_data: Dict[str, Any] = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit an exam retake payment receipt.
    Replaces: QuizView.tsx lines 182-191
    """
    payment = await create_payment(db, payment_data, user_data["user_id"])
    await trigger_payment_submitted(db, user_data["user_id"], payment_data.quiz_id, payment.id)
    return payment

@router.get("/payments/my", response_model=List[PaymentResponse])
async def get_my_payments(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """
    Get payments for current student and quiz.
    Replaces: QuizView.tsx lines 109-114
    """
    payments = await get_payments_for_student(db, user_data["user_id"], quiz_id)
    return payments

@router.get("/payments/approved-count")
async def get_approved_payment_count(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get count of approved payments for current student and quiz.
    Replaces: QuizView.tsx lines 229-234
    """
    count = await count_approved_payments(db, user_data["user_id"], quiz_id)
    return {"count": count}
