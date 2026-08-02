from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin
from app.services.certificate_service import (
    get_user_certificates,
    get_certificate_by_id,
    check_certificate_eligibility,
    issue_certificate,
    get_all_certificates
)
from app.schemas.certificate import CertificateResponse, CertificateCreate
from typing import Dict, Any

router = APIRouter()

# Student endpoints

@router.get("/certificates", response_model=list[CertificateResponse])
async def list_certificates(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all certificates for current user.
    Replaces: Dashboard.tsx lines 97-102
    """
    certificates = await get_user_certificates(db, user_data["user_id"])
    return certificates

@router.get("/certificates/check-eligibility")
async def check_eligibility(
    course_id: str = "wd101",
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if user is eligible for a certificate.
    Replaces: App.tsx lines 131-152
    """
    eligibility = await check_certificate_eligibility(db, user_data["user_id"], course_id)
    return eligibility

@router.post("/certificates/issue", response_model=CertificateResponse)
async def issue_certificate_endpoint(
    certificate_data: CertificateCreate,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Issue a certificate to the user (if eligible).
    Replaces: CertificateView.tsx lines 64-96
    """
    try:
        certificate = await issue_certificate(
            db,
            user_data["user_id"],
            certificate_data.course_id,
            certificate_data.certificate_url
        )
        return certificate
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Admin endpoints

@router.get("/admin/certificates", response_model=list[CertificateResponse])
async def list_all_certificates(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all certificates (for admin).
    """
    certificates = await get_all_certificates(db)
    return certificates
