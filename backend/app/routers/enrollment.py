from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin, require_admin
from app.services.enrollment_service import (
    get_enrollment_applications,
    create_student_account,
    get_waitlist_data,
    promote_student_from_waitlist,
    update_batch_capacity,
    auto_enroll_student,
    update_application_status,
    get_course_capacity,
    count_enrolled_in_batch,
    count_platform_access,
)
from app.models.course import Course
from app.models.enrollment import StudentEnrollment as StudentEnrollmentModel
from app.schemas.enrollment import (
    EnrollmentApplicationResponse,
    CreateStudentAccountRequest,
    CreateStudentAccountResponse,
    WaitlistStudentResponse,
    BatchCapacityUpdate,
    PromoteStudentRequest,
    AutoEnrollRequest,
    AutoEnrollResponse,
    ApplicationStatusUpdate,
    CourseCapacityResponse,
)
from typing import Dict, Any, List

router = APIRouter()

# Student endpoints

@router.post("/enrollment/auto-enroll", response_model=AutoEnrollResponse)
async def auto_enroll(
    request: AutoEnrollRequest,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await auto_enroll_student(db, user_data["user_id"], request.course_id)
    return result

# Public course capacity endpoint
@router.get("/courses/{course_id}/capacity", response_model=CourseCapacityResponse)
async def get_course_capacity_endpoint(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    result = await db.execute(
        select(Course).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    enrolled_result = await db.execute(
        select(func.count()).select_from(Course.__table__)
    )
    
    enrolled_count = await db.execute(
        select(func.count(StudentEnrollmentModel.id))
        .where(StudentEnrollmentModel.course_id == course_id)
        .where(StudentEnrollmentModel.status == "enrolled")
    )
    
    platform_count = await db.execute(
        select(func.count(StudentEnrollmentModel.id))
        .where(StudentEnrollmentModel.course_id == course_id)
        .where(StudentEnrollmentModel.status == "enrolled")
        .where(StudentEnrollmentModel.has_platform_access == True)
    )
    
    waitlist_count = await db.execute(
        select(func.count(StudentEnrollmentModel.id))
        .where(StudentEnrollmentModel.course_id == course_id)
        .where(StudentEnrollmentModel.status == "waitlisted")
    )
    
    enrolled = enrolled_count.scalar() or 0
    platform = platform_count.scalar() or 0
    waitlisted = waitlist_count.scalar() or 0
    
    return CourseCapacityResponse(
        course_id=course.id,
        title=course.title,
        whatsapp_group_cap=course.whatsapp_group_cap,
        platform_access_cap=course.platform_access_cap,
        total_batches=course.total_batches,
        single_batch_only=course.single_batch_only,
        enrolled_count=enrolled,
        platform_access_count=platform,
        whatsapp_count=enrolled,
        waitlist_count=waitlisted
    )

# Admin/Teacher endpoints

@router.get("/admin/enrollment-applications", response_model=list[EnrollmentApplicationResponse])
async def list_enrollment_applications(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    applications = await get_enrollment_applications(db)
    return applications

@router.post("/admin/create-student-account", response_model=CreateStudentAccountResponse)
async def create_student_account_endpoint(
    request: CreateStudentAccountRequest,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await create_student_account(
        db,
        request.email,
        request.password,
        request.full_name,
        request.course_id,
        request.user_id
    )
    return result

@router.patch("/admin/enrollment-applications/{application_id}")
async def update_application_status_endpoint(
    application_id: str,
    request: ApplicationStatusUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    if request.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'approved' or 'rejected'"
        )
    await update_application_status(db, application_id, request.status)
    return {"status": "success", "application_id": application_id, "new_status": request.status}

@router.get("/admin/waitlist")
async def get_waitlist(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    waitlist_students, default_cap = await get_waitlist_data(db)
    
    capacities = {}
    for course_id in set(s["course_id"] for s in waitlist_students):
        cap = await get_course_capacity(db, course_id)
        if cap:
            capacities[course_id] = cap
    
    return {
        "waitlist": waitlist_students,
        "course_capacities": capacities
    }

@router.post("/admin/waitlist/{enrollment_id}/promote")
async def promote_student(
    enrollment_id: str,
    request: PromoteStudentRequest,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    await promote_student_from_waitlist(db, enrollment_id, request.target_batch)
    return {"status": "success", "message": f"Student promoted to batch {request.target_batch}"}

@router.patch("/admin/settings/batch-capacity")
async def update_batch_capacity_endpoint(
    request: BatchCapacityUpdate,
    user_data: Dict[str, Any] = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    await update_batch_capacity(db, request.max_batch_size)
    return {"status": "success", "max_batch_size": request.max_batch_size}

@router.get("/admin/course-capacities", response_model=List[CourseCapacityResponse])
async def list_course_capacities(
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Course))
    courses = result.scalars().all()
    
    capacities = []
    for course in courses:
        enrolled = await db.execute(
            select(func.count(StudentEnrollmentModel.id))
            .where(StudentEnrollmentModel.course_id == course.id)
            .where(StudentEnrollmentModel.status == "enrolled")
        )
        platform = await db.execute(
            select(func.count(StudentEnrollmentModel.id))
            .where(StudentEnrollmentModel.course_id == course.id)
            .where(StudentEnrollmentModel.status == "enrolled")
            .where(StudentEnrollmentModel.has_platform_access == True)
        )
        waitlisted = await db.execute(
            select(func.count(StudentEnrollmentModel.id))
            .where(StudentEnrollmentModel.course_id == course.id)
            .where(StudentEnrollmentModel.status == "waitlisted")
        )
        
        enr = enrolled.scalar() or 0
        plat = platform.scalar() or 0
        wait = waitlisted.scalar() or 0
        
        capacities.append(CourseCapacityResponse(
            course_id=course.id,
            title=course.title,
            whatsapp_group_cap=course.whatsapp_group_cap,
            platform_access_cap=course.platform_access_cap,
            total_batches=course.total_batches,
            single_batch_only=course.single_batch_only,
            enrolled_count=enr,
            platform_access_count=plat,
            whatsapp_count=enr,
            waitlist_count=wait
        ))
    
    return capacities
