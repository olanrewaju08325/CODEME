from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from typing import Optional, List, Dict
import uuid
from datetime import datetime
from app.models.payment import ExamPaymentVerification
from app.models.profile import Profile
from app.models.quiz import Quiz
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse

async def _build_payment_response(payment: ExamPaymentVerification, name_map: Dict[str, str] = None, quiz_map: Dict[str, str] = None) -> PaymentResponse:
    student_id_str = str(payment.student_id)
    quiz_id_str = str(payment.quiz_id)
    return PaymentResponse(
        id=str(payment.id),
        student_id=student_id_str,
        quiz_id=quiz_id_str,
        receipt_url=payment.receipt_url,
        receipt_file_path=payment.receipt_file_path,
        status=payment.status,
        amount=int(payment.amount),
        rejection_reason=payment.rejection_reason,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
        student_name=(name_map or {}).get(student_id_str) or None,
        quiz_title=(quiz_map or {}).get(quiz_id_str) or None
    )

async def _resolve_names(db: AsyncSession, payments: List[ExamPaymentVerification]):
    student_ids = list(set(str(p.student_id) for p in payments))
    quiz_ids = list(set(str(p.quiz_id) for p in payments))

    name_map: Dict[str, str] = {}
    if student_ids:
        result = await db.execute(
            select(Profile.id, Profile.full_name).where(Profile.id.in_([uuid.UUID(s) for s in student_ids]))
        )
        for row in result.all():
            name_map[str(row.id)] = row.full_name

    quiz_map: Dict[str, str] = {}
    if quiz_ids:
        result = await db.execute(
            select(Quiz.id, Quiz.title).where(Quiz.id.in_([uuid.UUID(q) for q in quiz_ids]))
        )
        for row in result.all():
            quiz_map[str(row.id)] = row.title

    return name_map, quiz_map

async def create_payment(db: AsyncSession, payment_data: PaymentCreate, student_id: str) -> PaymentResponse:
    payment = ExamPaymentVerification(
        student_id=uuid.UUID(student_id),
        quiz_id=uuid.UUID(payment_data.quiz_id),
        receipt_file_path=payment_data.receipt_file_path,
        receipt_url="",
        status="pending",
        amount=payment_data.amount
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    name_map, quiz_map = await _resolve_names(db, [payment])
    return await _build_payment_response(payment, name_map, quiz_map)

async def get_payments_for_student(db: AsyncSession, student_id: str, quiz_id: str) -> List[PaymentResponse]:
    result = await db.execute(
        select(ExamPaymentVerification)
        .where(ExamPaymentVerification.student_id == uuid.UUID(student_id))
        .where(ExamPaymentVerification.quiz_id == uuid.UUID(quiz_id))
        .order_by(desc(ExamPaymentVerification.created_at))
    )
    payments = result.scalars().all()

    name_map, quiz_map = await _resolve_names(db, payments)
    return [await _build_payment_response(p, name_map, quiz_map) for p in payments]

async def get_all_payments_pending(db: AsyncSession) -> List[PaymentResponse]:
    result = await db.execute(
        select(ExamPaymentVerification)
        .where(ExamPaymentVerification.status == "pending")
        .order_by(desc(ExamPaymentVerification.created_at))
    )
    payments = result.scalars().all()

    name_map, quiz_map = await _resolve_names(db, payments)
    return [await _build_payment_response(p, name_map, quiz_map) for p in payments]

async def update_payment_status(db: AsyncSession, payment_id: str, payment_data: PaymentUpdate) -> Optional[PaymentResponse]:
    payment_uuid = uuid.UUID(payment_id)

    await db.execute(
        update(ExamPaymentVerification)
        .where(ExamPaymentVerification.id == payment_uuid)
        .values(
            status=payment_data.status,
            rejection_reason=payment_data.rejection_reason,
            updated_at=datetime.utcnow()
        )
    )

    result = await db.execute(
        select(ExamPaymentVerification)
        .where(ExamPaymentVerification.id == payment_uuid)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        return None

    name_map, quiz_map = await _resolve_names(db, [payment])
    return await _build_payment_response(p, name_map, quiz_map)

async def count_approved_payments(db: AsyncSession, student_id: str, quiz_id: str) -> int:
    result = await db.execute(
        select(ExamPaymentVerification.id)
        .where(ExamPaymentVerification.student_id == uuid.UUID(student_id))
        .where(ExamPaymentVerification.quiz_id == uuid.UUID(quiz_id))
        .where(ExamPaymentVerification.status == "approved")
    )
    return len(result.scalars().all())
