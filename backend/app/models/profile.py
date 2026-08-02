from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(String, unique=True, nullable=True)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    role = Column(String, default=UserRole.STUDENT.value, nullable=False)
    avatar_url = Column(String, nullable=True)
    streak_count = Column(Integer, default=1, nullable=False)
    last_active_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
