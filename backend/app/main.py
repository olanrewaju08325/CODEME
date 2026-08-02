from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.routers import auth, enrollment, courses, quizzes, certificates, forum, lessons, payments, announcements, admin

app = FastAPI(
    title="CodeMe Academy API",
    description="Backend API for CodeMe Academy learning platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "codeme-backend"}

# Router registration
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(enrollment.router, prefix="/api", tags=["Enrollment"])
app.include_router(courses.router, prefix="/api", tags=["Courses"])
app.include_router(quizzes.router, prefix="/api", tags=["Quizzes"])
app.include_router(certificates.router, prefix="/api", tags=["Certificates"])
app.include_router(forum.router, prefix="/api", tags=["Forum"])
app.include_router(lessons.router, prefix="/api", tags=["Lessons"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(announcements.router, prefix="/api", tags=["Announcements"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])

@app.on_event("startup")
async def startup():
    pass

@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
