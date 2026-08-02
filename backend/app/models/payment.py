from sqlalchemy import Column, String, DateTime, Text, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class ExamPaymentVerification(Base):
    __tablename__ = "exam_payment_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    receipt_url = Column(Text, nullable=False, default="")
    receipt_file_path = Column(Text, nullable=True)
    is_base64_migrated = Column(Boolean, default=False)
    status = Column(String, nullable=False, default="pending")
    amount = Column(Numeric, nullable=False, default=2000)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
