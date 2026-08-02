from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin
from app.services.course_service import (
    get_all_courses,
    get_course_by_id,
    create_course,
    update_course,
    get_modules_by_course,
    get_lessons_by_module,
    get_lessons_by_modules,
    get_lesson_by_id,
    mark_lesson_complete,
    get_user_progress,
    get_assignments_by_module,
    get_assignments_by_modules,
    get_user_assignment_submissions,
    get_assignment_submission,
    create_assignment_submission,
    update_assignment_submission,
    create_module,
    update_module,
    toggle_module_publish,
    delete_module,
    create_lesson,
    update_lesson,
    delete_lesson,
    create_assignment,
    update_assignment,
    delete_assignment
)
from app.services.live_class_service import (
    get_all_live_classes,
    get_live_class_by_id,
    get_upcoming_classes,
    create_live_class,
    update_live_class,
    delete_live_class
)
from app.services.gamification_service import (
    get_user_gamification_stats,
    get_user_achievements,
    get_all_badges
)
from app.schemas.course import (
    CourseResponse,
    CourseCreate,
    CourseUpdate,
    ModuleResponse,
    ModuleCreate,
    ModuleUpdate,
    LessonResponse,
    LessonCreate,
    LessonUpdate,
    AssignmentResponse,
    AssignmentCreate,
    AssignmentUpdate,
    StudentProgressResponse,
    AssignmentSubmissionResponse,
    AssignmentSubmissionCreate,
    AssignmentSubmissionUpdate
)
from app.schemas.live_class import (
    LiveClassScheduleResponse,
    LiveClassScheduleCreate,
    LiveClassScheduleUpdate
)
from app.schemas.gamification import (
    UserGamificationStats,
    UserAchievementResponse,
    BadgeResponse
)
from typing import Dict, Any, List

router = APIRouter()

# Student endpoints

@router.get("/courses", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all courses.
    Replaces: Dashboard.tsx lines 189-193
    """
    courses = await get_all_courses(db)
    return courses

@router.get("/courses/{course_id}/modules", response_model=list[ModuleResponse])
async def get_course_modules(
    course_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all modules for a course.
    Replaces: CourseView.tsx lines 35-41
    """
    modules = await get_modules_by_course(db, course_id)
    return modules

@router.get("/modules/{module_id}/lessons", response_model=list[LessonResponse])
async def get_module_lessons(
    module_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all lessons for a module.
    """
    lessons = await get_lessons_by_module(db, module_id)
    return lessons

@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson_detail(
    lesson_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get lesson detail with module data.
    Replaces: LessonView.tsx lines 254-264
    """
    lesson = await get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    return lesson

@router.get("/progress", response_model=list[StudentProgressResponse])
async def get_progress(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all progress for current user.
    Replaces: CourseView.tsx lines 70-74
    """
    progress = await get_user_progress(db, user_data["user_id"])
    return progress

@router.post("/progress/{lesson_id}/complete", response_model=StudentProgressResponse)
async def complete_lesson(
    lesson_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a lesson as complete.
    Replaces: LessonView.tsx lines 317-322
    """
    progress = await mark_lesson_complete(db, user_data["user_id"], lesson_id)
    return progress

@router.get("/assignments/submissions", response_model=list[AssignmentSubmissionResponse])
async def get_submissions(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all assignment submissions for current user.
    Replaces: CourseView.tsx lines 77-81
    """
    submissions = await get_user_assignment_submissions(db, user_data["user_id"])
    return submissions

@router.get("/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionResponse)
async def get_assignment_for_submit(
    assignment_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get assignment details and existing submission for submission view.
    Replaces: LessonView.tsx lines 277-298
    """
    submission = await get_assignment_submission(db, assignment_id, user_data["user_id"])
    return submission

@router.post("/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionResponse)
async def submit_assignment(
    assignment_id: str,
    submission_data: AssignmentSubmissionCreate,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update assignment submission.
    Replaces: LessonView.tsx lines 366-400
    """
    submission = await create_assignment_submission(
        db,
        assignment_id,
        user_data["user_id"],
        submission_data
    )
    return submission

@router.patch("/assignments/submissions/{submission_id}", response_model=AssignmentSubmissionResponse)
async def update_submission(
    submission_id: str,
    submission_data: AssignmentSubmissionUpdate,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing assignment submission (for rejected submissions).
    """
    submission = await update_assignment_submission(db, submission_id, submission_data)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    return submission

# Admin/Teacher endpoints for content management

@router.post("/admin/courses", response_model=CourseResponse)
async def create_course_endpoint(
    course_data: CourseCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new course.
    Replaces: ContentManager.tsx lines 131-140
    """
    course = await create_course(db, course_data)
    return course

@router.patch("/admin/courses/{course_id}", response_model=CourseResponse)
async def update_course_endpoint(
    course_id: str,
    course_data: CourseUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing course.
    Replaces: ContentManager.tsx lines 137-140
    """
    course = await update_course(db, course_id, course_data)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course

# Module management endpoints

@router.post("/admin/modules", response_model=ModuleResponse)
async def create_module_endpoint(
    module_data: ModuleCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new module.
    Replaces: ContentManager.tsx
    """
    module = await create_module(db, module_data)
    return module

@router.patch("/admin/modules/{module_id}", response_model=ModuleResponse)
async def update_module_endpoint(
    module_id: str,
    module_data: ModuleUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing module.
    """
    module = await update_module(db, module_id, module_data)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    return module

@router.post("/admin/modules/{module_id}/toggle-publish", response_model=ModuleResponse)
async def toggle_module_publish_endpoint(
    module_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle module publish status.
    """
    module = await toggle_module_publish(db, module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    return module

@router.delete("/admin/modules/{module_id}")
async def delete_module_endpoint(
    module_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a module.
    """
    await delete_module(db, module_id)
    return {"status": "success", "message": "Module deleted"}

# Lesson management endpoints

@router.post("/admin/lessons", response_model=LessonResponse)
async def create_lesson_endpoint(
    lesson_data: LessonCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new lesson.
    Replaces: ContentManager.tsx
    """
    lesson = await create_lesson(db, lesson_data)
    return lesson

@router.patch("/admin/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson_endpoint(
    lesson_id: str,
    lesson_data: LessonUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing lesson.
    """
    lesson = await update_lesson(db, lesson_id, lesson_data)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    return lesson

@router.delete("/admin/lessons/{lesson_id}")
async def delete_lesson_endpoint(
    lesson_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a lesson.
    """
    await delete_lesson(db, lesson_id)
    return {"status": "success", "message": "Lesson deleted"}

# Assignment management endpoints

@router.post("/admin/assignments", response_model=AssignmentResponse)
async def create_assignment_endpoint(
    assignment_data: AssignmentCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new assignment.
    Replaces: ContentManager.tsx
    """
    assignment = await create_assignment(db, assignment_data)
    return assignment

@router.patch("/admin/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment_endpoint(
    assignment_id: str,
    assignment_data: AssignmentUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing assignment.
    """
    assignment = await update_assignment(db, assignment_id, assignment_data)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    return assignment

@router.delete("/admin/assignments/{assignment_id}")
async def delete_assignment_endpoint(
    assignment_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an assignment.
    """
    await delete_assignment(db, assignment_id)
    return {"status": "success", "message": "Assignment deleted"}

# Live class endpoints

@router.get("/live-classes", response_model=list[LiveClassScheduleResponse])
async def list_live_classes(
    active_only: bool = Query(True, description="Filter to active classes only"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all live class schedules.
    Replaces: Dashboard.tsx lines 203-213
    """
    classes = await get_all_live_classes(db, active_only)
    return classes

@router.get("/live-classes/upcoming", response_model=list[LiveClassScheduleResponse])
async def list_upcoming_classes(
    limit: int = Query(10, description="Maximum number of classes to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get upcoming live classes.
    Replaces: Dashboard.tsx lines 200-202
    """
    classes = await get_upcoming_classes(db, limit)
    return classes

@router.get("/live-classes/{class_id}", response_model=LiveClassScheduleResponse)
async def get_live_class_detail(
    class_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get live class detail.
    """
    live_class = await get_live_class_by_id(db, class_id)
    if not live_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live class not found"
        )
    return live_class

@router.post("/admin/live-classes", response_model=LiveClassScheduleResponse)
async def create_live_class_endpoint(
    class_data: LiveClassScheduleCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new live class schedule.
    Replaces: ContentManager.tsx
    """
    live_class = await create_live_class(db, class_data)
    return live_class

@router.patch("/admin/live-classes/{class_id}", response_model=LiveClassScheduleResponse)
async def update_live_class_endpoint(
    class_id: str,
    class_data: LiveClassScheduleUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing live class schedule.
    """
    live_class = await update_live_class(db, class_id, class_data)
    if not live_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live class not found"
        )
    return live_class

@router.delete("/admin/live-classes/{class_id}")
async def delete_live_class_endpoint(
    class_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a live class schedule.
    """
    await delete_live_class(db, class_id)
    return {"status": "success", "message": "Live class deleted"}

# Gamification endpoints

@router.get("/gamification/stats", response_model=UserGamificationStats)
async def get_gamification_stats(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get gamification stats for current user.
    Replaces: Dashboard.tsx lines 83-90
    """
    stats = await get_user_gamification_stats(db, user_data["user_id"])
    return stats

@router.get("/gamification/achievements", response_model=list[UserAchievementResponse])
async def get_user_achievements_endpoint(
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all achievements earned by current user.
    """
    achievements = await get_user_achievements(db, user_data["user_id"])
    return achievements

@router.get("/gamification/badges", response_model=list[BadgeResponse])
async def get_badges(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all available badges.
    """
    badges = await get_all_badges(db)
    return badges
