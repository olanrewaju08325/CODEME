from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_teacher_or_admin
from app.services.quiz_service import (
    get_quizzes_by_module,
    get_quiz_by_id,
    get_quiz_with_answers,
    get_user_quiz_attempts,
    get_all_quiz_attempts,
    submit_quiz,
    create_quiz,
    update_quiz,
    delete_quiz,
    create_quiz_question,
    update_quiz_question,
    delete_quiz_question
)
from app.schemas.quiz import (
    QuizResponse,
    QuizAttemptResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    QuizQuestionResponse,
    QuizCreate,
    QuizUpdate,
    QuizQuestionCreate,
    QuizQuestionUpdate
)
from typing import Dict, Any, Optional

router = APIRouter()

# Student endpoints

@router.get("/modules/{module_id}/quizzes", response_model=list[QuizResponse])
async def get_module_quizzes(
    module_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all quizzes for a module.
    Replaces: CourseView.tsx lines 84-87
    """
    quizzes = await get_quizzes_by_module(db, module_id)
    return quizzes

@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz_detail(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get quiz detail with questions (no correct answers).
    Replaces: QuizView.tsx lines 70-80
    """
    quiz = await get_quiz_by_id(db, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz

@router.get("/quizzes/{quiz_id}/attempts", response_model=list[QuizAttemptResponse])
async def get_quiz_attempts(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all quiz attempts for current user.
    Replaces: QuizView.tsx lines 101-107
    """
    attempts = await get_user_quiz_attempts(db, user_data["user_id"], quiz_id)
    return attempts

@router.post("/quizzes/{quiz_id}/submit", response_model=QuizSubmissionResponse)
async def submit_quiz_endpoint(
    quiz_id: str,
    submission: QuizSubmissionRequest,
    user_data: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a quiz attempt.
    Replaces: QuizView.tsx lines 128-228
    """
    result = await submit_quiz(db, quiz_id, user_data["user_id"], submission)
    return result

# Admin/Teacher endpoints

@router.get("/admin/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz_detail_admin(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get quiz detail with correct answers (for teachers).
    """
    quiz = await get_quiz_with_answers(db, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz

@router.get("/admin/quizzes/{quiz_id}/all-attempts", response_model=list[QuizAttemptResponse])
async def get_all_quiz_attempts_endpoint(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all quiz attempts (for teachers).
    """
    attempts = await get_all_quiz_attempts(db, quiz_id)
    return attempts

@router.post("/admin/quizzes", response_model=QuizResponse)
async def create_quiz_endpoint(
    quiz_data: QuizCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new quiz.
    """
    quiz = await create_quiz(
        db,
        quiz_data.module_id,
        quiz_data.title,
        quiz_data.description,
        quiz_data.passing_score,
        quiz_data.time_limit_minutes
    )
    return quiz

@router.patch("/admin/quizzes/{quiz_id}", response_model=QuizResponse)
async def update_quiz_endpoint(
    quiz_id: str,
    quiz_data: QuizUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing quiz.
    """
    quiz = await update_quiz(
        db,
        quiz_id,
        quiz_data.title,
        quiz_data.description,
        quiz_data.passing_score,
        quiz_data.time_limit_minutes,
        quiz_data.is_published
    )
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz

@router.delete("/admin/quizzes/{quiz_id}")
async def delete_quiz_endpoint(
    quiz_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a quiz.
    """
    await delete_quiz(db, quiz_id)
    return {"status": "success", "message": "Quiz deleted"}

@router.post("/admin/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse)
async def create_quiz_question_endpoint(
    quiz_id: str,
    question_data: QuizQuestionCreate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new quiz question.
    """
    question = await create_quiz_question(
        db,
        quiz_id,
        question_data.question_text,
        question_data.question_type,
        question_data.options,
        question_data.correct_answer,
        question_data.points,
        question_data.order_index
    )
    return question

@router.patch("/admin/quiz-questions/{question_id}", response_model=QuizQuestionResponse)
async def update_quiz_question_endpoint(
    question_id: str,
    question_data: QuizQuestionUpdate,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing quiz question.
    """
    question = await update_quiz_question(
        db,
        question_id,
        question_data.question_text,
        question_data.question_type,
        question_data.options,
        question_data.correct_answer,
        question_data.points,
        question_data.order_index
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return question

@router.delete("/admin/quiz-questions/{question_id}")
async def delete_quiz_question_endpoint(
    question_id: str,
    user_data: Dict[str, Any] = Depends(require_teacher_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a quiz question.
    """
    await delete_quiz_question(db, question_id)
    return {"status": "success", "message": "Question deleted"}
