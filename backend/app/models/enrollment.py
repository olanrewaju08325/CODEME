from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class EnrollmentApplication(Base):
    __tablename__ = "enrollment_applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    course_id = Column(String, nullable=False)  # Foreign key to courses.id
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False)  # Foreign key to profiles.id
    course_id = Column(String, nullable=False)  # Foreign key to courses.id
    batch = Column(Integer, nullable=False)  # 1 or 2
    status = Column(String, default="enrolled", nullable=False)  # enrolled, waitlisted, completed
    batch_closed = Column(Boolean, default=False, nullable=False)
    has_platform_access = Column(Boolean, default=True, nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class AppSettings(Base):
    __tablename__ = "app_settings"
    
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)