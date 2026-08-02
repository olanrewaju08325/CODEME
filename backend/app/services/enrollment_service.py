from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.enrollment import EnrollmentApplication, StudentEnrollment, AppSettings
from app.models.course import Course
from app.models.profile import Profile
from app.schemas.enrollment import (
    EnrollmentApplicationResponse,
    StudentEnrollmentResponse,
    AutoEnrollResponse,
    CreateStudentAccountResponse,
    WaitlistStudentResponse
)

SINGLE_BATCH_COURSE_IDS = ['backend', 'science', 'analytics']

async def get_course_capacity(db: AsyncSession, course_id: str) -> Optional[Dict[str, Any]]:
    result = await db.execute(
        select(Course).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        return None
    return {
        "whatsapp_group_cap": course.whatsapp_group_cap,
        "platform_access_cap": course.platform_access_cap,
        "total_batches": course.total_batches,
        "single_batch_only": course.single_batch_only,
    }

async def count_enrolled_in_batch(db: AsyncSession, course_id: str, batch: int) -> int:
    result = await db.execute(
        select(func.count(StudentEnrollment.id))
        .where(StudentEnrollment.course_id == course_id)
        .where(StudentEnrollment.batch == batch)
        .where(StudentEnrollment.status == "enrolled")
    )
    return result.scalar() or 0

async def count_platform_access(db: AsyncSession, course_id: str, batch: int) -> int:
    result = await db.execute(
        select(func.count(StudentEnrollment.id))
        .where(StudentEnrollment.course_id == course_id)
        .where(StudentEnrollment.batch == batch)
        .where(StudentEnrollment.status == "enrolled")
        .where(StudentEnrollment.has_platform_access == True)
    )
    return result.scalar() or 0

async def get_enrollment_applications(db: AsyncSession) -> List[EnrollmentApplicationResponse]:
    result = await db.execute(
        select(EnrollmentApplication)
        .order_by(EnrollmentApplication.created_at.desc())
    )
    applications = result.scalars().all()
    
    return [
        EnrollmentApplicationResponse(
            id=str(app.id),
            full_name=app.full_name,
            email=app.email,
            phone=app.phone,
            course_id=app.course_id,
            status=app.status,
            created_at=app.created_at
        )
        for app in applications
    ]

async def create_student_account(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    course_id: str,
    user_id: Optional[str] = None
) -> CreateStudentAccountResponse:
    existing_profile = await db.execute(
        select(Profile).where(Profile.email == email)
    )
    if existing_profile.scalar_one_or_none():
        return CreateStudentAccountResponse(
            success=False,
            message="Email already registered."
        )
    
    new_user_id = uuid.UUID(user_id) if user_id else uuid.uuid4()
    
    sequence_result = await db.execute(
        select(func.max(AppSettings.value)).where(AppSettings.key == "student_sequence")
    )
    current_seq = sequence_result.scalar() or "250000"
    next_seq = int(current_seq) + 1
    student_id = f"CDM25{next_seq}"
    
    await db.execute(
        update(AppSettings)
        .where(AppSettings.key == "student_sequence")
        .values(value=str(next_seq))
    )
    
    profile = Profile(
        id=new_user_id,
        student_id=student_id,
        full_name=full_name,
        email=email,
        role="student"
    )
    db.add(profile)
    
    capacity = await get_course_capacity(db, course_id)
    if not capacity:
        capacity = {"whatsapp_group_cap": 40, "platform_access_cap": 40, "total_batches": 2, "single_batch_only": False}
    
    target_batch = 1
    has_platform = True
    
    if capacity["single_batch_only"]:
        batch_count = await count_platform_access(db, course_id, 1)
        if batch_count >= capacity["platform_access_cap"]:
            enrollment = StudentEnrollment(
                student_id=new_user_id,
                course_id=course_id,
                batch=1,
                status="waitlisted",
                has_platform_access=False
            )
            db.add(enrollment)
            await db.commit()
            return CreateStudentAccountResponse(
                success=True,
                student_id=student_id,
                message=f"Account created! Student ID: {student_id} (waitlisted - batch is full)"
            )
        target_batch = 1
    else:
        batch1_platform = await count_platform_access(db, course_id, 1)
        if batch1_platform < capacity["platform_access_cap"]:
            target_batch = 1
        else:
            batch2_platform = await count_platform_access(db, course_id, 2)
            if batch2_platform < capacity["platform_access_cap"]:
                target_batch = 2
            else:
                enrollment = StudentEnrollment(
                    student_id=new_user_id,
                    course_id=course_id,
                    batch=2,
                    status="waitlisted",
                    has_platform_access=False
                )
                db.add(enrollment)
                await db.commit()
                return CreateStudentAccountResponse(
                    success=True,
                    student_id=student_id,
                    message=f"Account created! Student ID: {student_id} (waitlisted - all batches full)"
                )
        
        total_in_batch = await count_enrolled_in_batch(db, course_id, target_batch)
        has_platform = total_in_batch < capacity["platform_access_cap"]
    
    enrollment = StudentEnrollment(
        student_id=new_user_id,
        course_id=course_id,
        batch=target_batch,
        status="enrolled",
        has_platform_access=has_platform
    )
    db.add(enrollment)
    
    await db.commit()
    
    msg = f"Account created! Student ID: {student_id}"
    if not has_platform:
        msg += " (enrolled in WhatsApp group, waiting for platform access)"
    
    return CreateStudentAccountResponse(
        success=True,
        student_id=student_id,
        message=msg
    )

async def get_waitlist_data(db: AsyncSession) -> tuple[List[Dict[str, Any]], int]:
    result = await db.execute(
        select(StudentEnrollment, Profile)
        .join(Profile, StudentEnrollment.student_id == Profile.id)
        .where(StudentEnrollment.status == "waitlisted")
        .order_by(StudentEnrollment.enrolled_at)
    )
    waitlist_data = result.all()
    
    waitlist_students = []
    for enrollment, profile in waitlist_data:
        waitlist_students.append({
            "id": str(enrollment.id),
            "student_id": str(enrollment.student_id),
            "full_name": profile.full_name,
            "student_display_id": profile.student_id,
            "email": profile.email,
            "course_id": enrollment.course_id,
            "batch": enrollment.batch,
            "status": enrollment.status,
            "has_platform_access": enrollment.has_platform_access
        })
    
    default_cap = 40
    return waitlist_students, default_cap

async def promote_student_from_waitlist(
    db: AsyncSession,
    enrollment_id: str,
    target_batch: int
) -> bool:
    await db.execute(
        update(StudentEnrollment)
        .where(StudentEnrollment.id == enrollment_id)
        .values(
            status="enrolled",
            batch=target_batch,
            has_platform_access=True
        )
    )
    return True

async def update_batch_capacity(db: AsyncSession, max_capacity: int) -> bool:
    await db.execute(
        update(AppSettings)
        .where(AppSettings.key == "max_batch_size")
        .values(value=str(max_capacity))
    )
    return True

async def auto_enroll_student(
    db: AsyncSession,
    user_id: str,
    course_id: str
) -> AutoEnrollResponse:
    existing = await db.execute(
        select(StudentEnrollment)
        .where(StudentEnrollment.student_id == user_id)
        .where(StudentEnrollment.course_id == course_id)
    )
    if existing.scalar_one_or_none():
        return AutoEnrollResponse(
            success=False,
            message="Already enrolled in this course"
        )
    
    capacity = await get_course_capacity(db, course_id)
    if not capacity:
        capacity = {"whatsapp_group_cap": 40, "platform_access_cap": 40, "total_batches": 2, "single_batch_only": False}
    
    target_batch = 1
    has_platform = True
    status = "enrolled"
    
    if capacity["single_batch_only"]:
        batch_platform = await count_platform_access(db, course_id, 1)
        if batch_platform >= capacity["platform_access_cap"]:
            status = "waitlisted"
            has_platform = False
        target_batch = 1
    else:
        batch1_platform = await count_platform_access(db, course_id, 1)
        if batch1_platform < capacity["platform_access_cap"]:
            target_batch = 1
        else:
            batch2_platform = await count_platform_access(db, course_id, 2)
            if batch2_platform < capacity["platform_access_cap"]:
                target_batch = 2
            else:
                status = "waitlisted"
                has_platform = False
                target_batch = 2
        
        if status == "enrolled":
            total_in_batch = await count_enrolled_in_batch(db, course_id, target_batch)
            if total_in_batch >= capacity["whatsapp_group_cap"]:
                status = "waitlisted"
                has_platform = False
    
    enrollment = StudentEnrollment(
        student_id=user_id,
        course_id=course_id,
        batch=target_batch,
        status=status,
        has_platform_access=has_platform
    )
    db.add(enrollment)
    await db.commit()
    
    if status == "waitlisted":
        message = "All batches are currently full. You have been added to the waitlist."
    elif not has_platform:
        message = f"Enrolled in batch {target_batch} (WhatsApp group). Platform access pending."
    else:
        message = f"Enrolled in batch {target_batch}"
    
    return AutoEnrollResponse(
        success=True,
        message=message
    )

async def update_application_status(
    db: AsyncSession,
    application_id: str,
    status: str
) -> bool:
    await db.execute(
        update(EnrollmentApplication)
        .where(EnrollmentApplication.id == application_id)
        .values(status=status)
    )
    return True
