from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class QuizQuestionResponse(BaseModel):
    id: str
    quiz_id: str
    question_text: str
    question_type: str  # multiple_choice, true_false, text
    options: Optional[str]  # JSON string for multiple choice options
    correct_answer: str
    points: int
    order_index: int
    
    class Config:
        from_attributes = True

class QuizResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: Optional[str]
    passing_score: int
    time_limit_minutes: Optional[int]
    is_published: bool
    created_at: datetime
    questions: Optional[List[QuizQuestionResponse]] = None
    
    class Config:
        from_attributes = True

class QuizAttemptResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    score: int
    max_score: int
    passed: bool
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class QuizSubmissionAnswer(BaseModel):
    question_id: str
    answer: str

class QuizSubmissionRequest(BaseModel):
    answers: List[QuizSubmissionAnswer]

class QuizSubmissionResponse(BaseModel):
    attempt_id: str
    score: int
    max_score: int
    passed: bool
    answers_correct: int
    total_questions: int

class QuizCreate(BaseModel):
    module_id: str
    title: str
    description: Optional[str] = None
    passing_score: int = 70
    time_limit_minutes: Optional[int] = None

class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    passing_score: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    is_published: Optional[bool] = None

class QuizQuestionCreate(BaseModel):
    question_text: str
    question_type: str
    options: Optional[str] = None
    correct_answer: str
    points: int = 1
    order_index: int = 0

class QuizQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[str] = None
    correct_answer: Optional[str] = None
    points: Optional[int] = None
    order_index: Optional[int] = None