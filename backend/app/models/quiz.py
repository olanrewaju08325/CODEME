from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to modules.id
    title = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to quizzes.id
    student_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to profiles.id
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    attempt_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
