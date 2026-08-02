from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Course schemas
class CourseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    is_active: bool
    whatsapp_group_cap: int = 40
    platform_access_cap: int = 40
    total_batches: int = 2
    single_batch_only: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    is_active: bool = True
    whatsapp_group_cap: int = 40
    platform_access_cap: int = 40
    total_batches: int = 2
    single_batch_only: bool = False

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    whatsapp_group_cap: Optional[int] = None
    platform_access_cap: Optional[int] = None
    total_batches: Optional[int] = None
    single_batch_only: Optional[bool] = None

# Module schemas
class ModuleResponse(BaseModel):
    id: str
    course_id: str
    title: str
    order_index: int
    project_scenario: Optional[str]
    project_instructions: Optional[str]
    project_solution: Optional[str]
    is_published: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModuleCreate(BaseModel):
    course_id: str
    title: str
    order_index: int
    project_scenario: Optional[str] = None
    project_instructions: Optional[str] = None
    project_solution: Optional[str] = None
    is_published: bool = True

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    project_scenario: Optional[str] = None
    project_instructions: Optional[str] = None
    project_solution: Optional[str] = None
    is_published: Optional[bool] = None

# Lesson schemas
class LessonResponse(BaseModel):
    id: str
    module_id: str
    title: str
    content: str
    video_url: Optional[str]
    pdf_url: Optional[str]
    order_index: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class LessonCreate(BaseModel):
    module_id: str
    title: str
    content: str
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    order_index: int

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    order_index: Optional[int] = None

# Assignment schemas
class AssignmentResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: str
    rubric_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class AssignmentCreate(BaseModel):
    module_id: str
    title: str
    description: str
    rubric_url: Optional[str] = None

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rubric_url: Optional[str] = None

# Progress schemas
class StudentProgressResponse(BaseModel):
    id: str
    student_id: str
    lesson_id: str
    completed_at: datetime
    
    class Config:
        from_attributes = True

class MarkLessonCompleteRequest(BaseModel):
    pass  # No input needed, uses user from JWT

# Assignment submission schemas
class AssignmentSubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    submission_text: str
    submission_file: Optional[str]
    status: str
    feedback: Optional[str]
    graded_by: Optional[str]
    graded_at: Optional[datetime]
    created_at: datetime
    is_ai_flagged: bool
    
    class Config:
        from_attributes = True

class AssignmentSubmissionCreate(BaseModel):
    submission_text: Optional[str] = None
    submission_file: Optional[str] = None

class AssignmentSubmissionUpdate(BaseModel):
    submission_text: Optional[str] = None
    submission_file: Optional[str] = None