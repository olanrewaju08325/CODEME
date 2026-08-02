from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.certificate import Certificate
from app.models.quiz import QuizAttempt
from app.schemas.certificate import (
    CertificateResponse,
    CertificateCreate
)

async def get_user_certificates(db: AsyncSession, user_id: str) -> List[CertificateResponse]:
    """Get all certificates for a user."""
    result = await db.execute(
        select(Certificate).where(Certificate.student_id == user_id)
    )
    certificates = result.scalars().all()
    
    return [
        CertificateResponse(
            id=str(c.id),
            student_id=str(c.student_id),
            course_id=c.course_id,
            certificate_url=c.certificate_url,
            issued_at=c.issued_at,
            certificate_number=c.certificate_number
        )
        for c in certificates
    ]

async def get_certificate_by_id(db: AsyncSession, certificate_id: str) -> Optional[CertificateResponse]:
    """Get a specific certificate by ID."""
    result = await db.execute(
        select(Certificate).where(Certificate.id == certificate_id)
    )
    certificate = result.scalar_one_or_none()
    
    if not certificate:
        return None
    
    return CertificateResponse(
        id=str(certificate.id),
        student_id=str(certificate.student_id),
        course_id=certificate.course_id,
        certificate_url=certificate.certificate_url,
        issued_at=certificate.issued_at,
        certificate_number=certificate.certificate_number
    )

async def check_certificate_eligibility(db: AsyncSession, user_id: str, course_id: str) -> dict:
    """
    Check if user is eligible for a certificate based on quiz passes.
    Replaces: App.tsx lines 131-152 and CertificateView.tsx
    """
    # Get all quizzes for the course through modules
    from app.models.course import Module
    from app.models.quiz import Quiz
    
    result = await db.execute(
        select(Quiz.id)
        .join(Module, Quiz.module_id == Module.id)
        .where(Module.course_id == course_id)
    )
    course_quiz_ids = [str(q[0]) for q in result.all()]
    
    total_quizzes = len(course_quiz_ids)
    
    # Get passed quizzes for the user in this course
    result = await db.execute(
        select(QuizAttempt.quiz_id)
        .where(QuizAttempt.student_id == user_id)
        .where(QuizAttempt.passed == True)
        .where(QuizAttempt.quiz_id.in_(course_quiz_ids))
        .distinct()
    )
    
    passed_quiz_ids = result.scalars().all()
    passed_count = len(passed_quiz_ids)
    
    return {
        "eligible": passed_count >= total_quizzes,
        "passed_quizzes": passed_count,
        "total_quizzes": total_quizzes
    }

async def generate_certificate_number() -> str:
    """Generate a unique certificate number."""
    # Format: CME-YYYY-XXXXXX (where XXXXXX is a sequential number)
    year = datetime.now().year
    # In production, this would use a database sequence
    # For now, generate a random one
    import random
    random_num = random.randint(100000, 999999)
    return f"CME-{year}-{random_num}"

async def issue_certificate(
    db: AsyncSession,
    user_id: str,
    course_id: str,
    certificate_url: str
) -> CertificateResponse:
    """
    Issue a certificate to a user.
    Replaces: CertificateView.tsx lines 64-96
    """
    # Check if already has certificate
    existing = await db.execute(
        select(Certificate)
        .where(Certificate.student_id == user_id)
        .where(Certificate.course_id == course_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("User already has a certificate for this course")
    
    # Check eligibility
    eligibility = await check_certificate_eligibility(db, user_id, course_id)
    if not eligibility["eligible"]:
        raise ValueError("User is not eligible for certificate")
    
    # Generate certificate number
    certificate_number = await generate_certificate_number()
    
    # Create certificate
    certificate = Certificate(
        student_id=user_id,
        course_id=course_id,
        certificate_url=certificate_url,
        certificate_number=certificate_number
    )
    db.add(certificate)
    await db.commit()
    
    return CertificateResponse(
        id=str(certificate.id),
        student_id=str(certificate.student_id),
        course_id=certificate.course_id,
        certificate_url=certificate.certificate_url,
        issued_at=certificate.issued_at,
        certificate_number=certificate.certificate_number
    )

async def get_all_certificates(db: AsyncSession) -> List[CertificateResponse]:
    """Get all certificates (for admin)."""
    result = await db.execute(
        select(Certificate).order_by(Certificate.issued_at.desc())
    )
    certificates = result.scalars().all()
    
    return [
        CertificateResponse(
            id=str(c.id),
            student_id=str(c.student_id),
            course_id=c.course_id,
            certificate_url=c.certificate_url,
            issued_at=c.issued_at,
            certificate_number=c.certificate_number
        )
        for c in certificates
    ]