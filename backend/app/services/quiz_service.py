from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid
import json
from app.models.quiz import Quiz, QuizAttempt
from app.schemas.quiz import (
    QuizResponse,
    QuizAttemptResponse,
    QuizQuestionResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse
)

async def get_quizzes_by_module(db: AsyncSession, module_id: str) -> List[QuizResponse]:
    """Get all quizzes for a module."""
    result = await db.execute(
        select(Quiz)
        .where(Quiz.module_id == module_id)
        .where(Quiz.is_published == True)
        .order_by(Quiz.created_at)
    )
    quizzes = result.scalars().all()
    
    return [
        QuizResponse(
            id=str(q.id),
            module_id=str(q.module_id),
            title=q.title,
            description=q.description,
            passing_score=q.passing_score,
            time_limit_minutes=q.time_limit_minutes,
            is_published=q.is_published,
            created_at=q.created_at
        )
        for q in quizzes
    ]

async def get_quiz_by_id(db: AsyncSession, quiz_id: str) -> Optional[QuizResponse]:
    """Get a specific quiz with its questions."""
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    
    if not quiz:
        return None
    
    questions = [
        QuizQuestionResponse(
            id=str(q.id),
            quiz_id=str(q.quiz_id),
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options,
            correct_answer="",  # Hide correct answer from students
            points=q.points,
            order_index=q.order_index
        )
        for q in sorted(quiz.questions, key=lambda x: x.order_index)
    ]
    
    return QuizResponse(
        id=str(quiz.id),
        module_id=str(quiz.module_id),
        title=quiz.title,
        description=quiz.description,
        passing_score=quiz.passing_score,
        time_limit_minutes=quiz.time_limit_minutes,
        is_published=quiz.is_published,
        created_at=quiz.created_at,
        questions=questions
    )

async def get_quiz_with_answers(db: AsyncSession, quiz_id: str) -> Optional[QuizResponse]:
    """Get a quiz with correct answers (for teachers/admins)."""
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    
    if not quiz:
        return None
    
    questions = [
        QuizQuestionResponse(
            id=str(q.id),
            quiz_id=str(q.quiz_id),
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options,
            correct_answer=q.correct_answer,
            points=q.points,
            order_index=q.order_index
        )
        for q in sorted(quiz.questions, key=lambda x: x.order_index)
    ]
    
    return QuizResponse(
        id=str(quiz.id),
        module_id=str(quiz.module_id),
        title=quiz.title,
        description=quiz.description,
        passing_score=quiz.passing_score,
        time_limit_minutes=quiz.time_limit_minutes,
        is_published=quiz.is_published,
        created_at=quiz.created_at,
        questions=questions
    )

async def get_user_quiz_attempts(db: AsyncSession, user_id: str, quiz_id: str) -> List[QuizAttemptResponse]:
    """Get all quiz attempts for a user."""
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.student_id == user_id)
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.started_at.desc())
    )
    attempts = result.scalars().all()
    
    return [
        QuizAttemptResponse(
            id=str(a.id),
            quiz_id=str(a.quiz_id),
            student_id=str(a.student_id),
            score=a.score,
            max_score=a.max_score,
            passed=a.passed,
            started_at=a.started_at,
            completed_at=a.completed_at
        )
        for a in attempts
    ]

async def get_all_quiz_attempts(db: AsyncSession, quiz_id: str) -> List[QuizAttemptResponse]:
    """Get all quiz attempts (for teachers)."""
    result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.started_at.desc())
    )
    attempts = result.scalars().all()
    
    return [
        QuizAttemptResponse(
            id=str(a.id),
            quiz_id=str(a.quiz_id),
            student_id=str(a.student_id),
            score=a.score,
            max_score=a.max_score,
            passed=a.passed,
            started_at=a.started_at,
            completed_at=a.completed_at
        )
        for a in attempts
    ]

async def submit_quiz(
    db: AsyncSession,
    quiz_id: str,
    user_id: str,
    submission: QuizSubmissionRequest
) -> QuizSubmissionResponse:
    """
    Submit a quiz attempt and calculate score.
    Replaces: QuizView.tsx lines 128-228
    """
    # Get quiz questions with correct answers
    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id)
    )
    questions = result.scalars().all()
    
    # Create a mapping of question_id to correct answer
    correct_answers = {str(q.id): q.correct_answer for q in questions}
    question_points = {str(q.id): q.points for q in questions}
    
    # Calculate score
    total_score = 0
    max_score = sum(question_points.values())
    answers_correct = 0
    
    for answer in submission.answers:
        question_id = answer.question_id
        user_answer = answer.answer
        
        if question_id in correct_answers:
            if user_answer == correct_answers[question_id]:
                total_score += question_points[question_id]
                answers_correct += 1
    
    # Check if passed
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    passing_score = quiz.passing_score if quiz else 0
    passed = total_score >= passing_score
    
    # Create quiz attempt record
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=user_id,
        score=total_score,
        max_score=max_score,
        passed=passed,
        completed_at=datetime.now()
    )
    db.add(attempt)
    await db.commit()
    
    return QuizSubmissionResponse(
        attempt_id=str(attempt.id),
        score=total_score,
        max_score=max_score,
        passed=passed,
        answers_correct=answers_correct,
        total_questions=len(questions)
    )

# Admin/Teacher quiz management functions

async def create_quiz(
    db: AsyncSession,
    module_id: str,
    title: str,
    description: Optional[str],
    passing_score: int,
    time_limit_minutes: Optional[int]
) -> QuizResponse:
    """Create a new quiz."""
    quiz = Quiz(
        module_id=module_id,
        title=title,
        description=description,
        passing_score=passing_score,
        time_limit_minutes=time_limit_minutes
    )
    db.add(quiz)
    await db.commit()
    
    return QuizResponse(
        id=str(quiz.id),
        module_id=str(quiz.module_id),
        title=quiz.title,
        description=quiz.description,
        passing_score=quiz.passing_score,
        time_limit_minutes=quiz.time_limit_minutes,
        is_published=quiz.is_published,
        created_at=quiz.created_at
    )

async def update_quiz(
    db: AsyncSession,
    quiz_id: str,
    title: Optional[str],
    description: Optional[str],
    passing_score: Optional[int],
    time_limit_minutes: Optional[int],
    is_published: Optional[bool]
) -> Optional[QuizResponse]:
    """Update an existing quiz."""
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if passing_score is not None:
        update_data["passing_score"] = passing_score
    if time_limit_minutes is not None:
        update_data["time_limit_minutes"] = time_limit_minutes
    if is_published is not None:
        update_data["is_published"] = is_published
    
    await db.execute(
        update(Quiz).where(Quiz.id == quiz_id).values(**update_data)
    )
    
    return await get_quiz_by_id(db, quiz_id)

async def delete_quiz(db: AsyncSession, quiz_id: str) -> bool:
    """Delete a quiz."""
    await db.execute(
        delete(Quiz).where(Quiz.id == quiz_id)
    )
    return True

async def create_quiz_question(
    db: AsyncSession,
    quiz_id: str,
    question_text: str,
    question_type: str,
    options: Optional[str],
    correct_answer: str,
    points: int,
    order_index: int
) -> QuizQuestionResponse:
    """Create a new quiz question."""
    question = QuizQuestion(
        quiz_id=quiz_id,
        question_text=question_text,
        question_type=question_type,
        options=options,
        correct_answer=correct_answer,
        points=points,
        order_index=order_index
    )
    db.add(question)
    await db.commit()
    
    return QuizQuestionResponse(
        id=str(question.id),
        quiz_id=str(question.quiz_id),
        question_text=question.question_text,
        question_type=question.question_type,
        options=question.options,
        correct_answer=question.correct_answer,
        points=question.points,
        order_index=question.order_index
    )

async def update_quiz_question(
    db: AsyncSession,
    question_id: str,
    question_text: Optional[str],
    question_type: Optional[str],
    options: Optional[str],
    correct_answer: Optional[str],
    points: Optional[int],
    order_index: Optional[int]
) -> Optional[QuizQuestionResponse]:
    """Update an existing quiz question."""
    update_data = {}
    if question_text is not None:
        update_data["question_text"] = question_text
    if question_type is not None:
        update_data["question_type"] = question_type
    if options is not None:
        update_data["options"] = options
    if correct_answer is not None:
        update_data["correct_answer"] = correct_answer
    if points is not None:
        update_data["points"] = points
    if order_index is not None:
        update_data["order_index"] = order_index
    
    await db.execute(
        update(QuizQuestion).where(QuizQuestion.id == question_id).values(**update_data)
    )
    
    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        return None
    
    return QuizQuestionResponse(
        id=str(question.id),
        quiz_id=str(question.quiz_id),
        question_text=question.question_text,
        question_type=question.question_type,
        options=question.options,
        correct_answer=question.correct_answer,
        points=question.points,
        order_index=question.order_index
    )

async def delete_quiz_question(db: AsyncSession, question_id: str) -> bool:
    """Delete a quiz question."""
    await db.execute(
        delete(QuizQuestion).where(QuizQuestion.id == question_id)
    )
    return True