from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(String, primary_key=True)  # e.g., "wd101"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    whatsapp_group_cap = Column(Integer, default=40, nullable=False)
    platform_access_cap = Column(Integer, default=40, nullable=False)
    total_batches = Column(Integer, default=2, nullable=False)
    single_batch_only = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    project_scenario = Column(Text, nullable=True)
    project_instructions = Column(Text, nullable=True)
    project_solution = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    course = relationship("Course", backref="modules")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    video_url = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    module = relationship("Module", backref="lessons")

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    rubric_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    module = relationship("Module", backref="assignments")

class StudentProgress(Base):
    __tablename__ = "student_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to profiles.id
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Note: Composite unique constraint on (student_id, lesson_id) is enforced at database level

class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to profiles.id
    submission_text = Column(Text, nullable=False)
    submission_file = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    feedback = Column(Text, nullable=True)
    graded_by = Column(UUID(as_uuid=True), nullable=True)  # Foreign key to profiles.id
    graded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_ai_flagged = Column(Boolean, default=False, nullable=False)
