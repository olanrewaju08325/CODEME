# CodeMe Academy - Architecture Migration

## Overview

This project has been migrated from a direct Supabase frontend architecture to a hybrid architecture with a Python/FastAPI backend for business logic and data access.

## Architecture

### Previous Architecture
- **Frontend**: React + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Data Access**: Direct Supabase client calls from frontend
- **Business Logic**: Distributed between frontend and database triggers

### New Architecture
- **Frontend**: React + TypeScript (in `/frontend`)
- **Backend**: Python + FastAPI (in `/backend`)
- **Database**: Supabase (PostgreSQL + Auth + Storage) - unchanged
- **Data Access**: Frontend → FastAPI → PostgreSQL
- **Authentication**: Supabase Auth (frontend) + JWT verification (backend)
- **File Storage**: Supabase Storage (direct frontend calls)

## Project Structure

```
CODEME/
├── backend/                 # Python/FastAPI backend
│   ├── app/
│   │   ├── core/           # Core functionality (database, security, permissions)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # API endpoints
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example       # Environment variables template
│   └── Dockerfile          # Docker configuration
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── apiClient.ts    # API client for backend calls
│   │   ├── components/     # React components
│   │   ├── views/          # Page components
│   │   └── App.tsx         # Main application
│   ├── vite.config.ts      # Vite configuration with API proxy
│   ├── package.json        # Node dependencies
│   └── .env.example       # Frontend environment variables
└── supabase/               # Supabase migrations (unchanged)
    └── migrations/         # Database schema migrations
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   SUPABASE_JWT_SECRET=your_supabase_jwt_secret
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   SUPABASE_PROJECT_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Install Node dependencies:
   ```bash
   npm install
   ```

5. Run the frontend development server:
   ```bash
   npm run dev
   ```

## API Endpoints

The backend provides the following API endpoints:

### Authentication (`/api/auth`)
- `GET /api/profile/me` - Get current user profile
- `PATCH /api/profile/me` - Update profile
- `POST /api/profile/update-streak` - Update user streak
- `GET /api/notifications/unread-count` - Get unread notification count
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark notifications as read
- `GET /api/profile/certificate-status` - Check certificate eligibility

### Courses (`/api/courses`)
- `GET /api/courses` - Get all courses
- `GET /api/courses/{course_id}/modules` - Get course modules
- `GET /api/modules/{module_id}/lessons` - Get module lessons
- `GET /api/lessons/{lesson_id}` - Get lesson details
- `GET /api/progress` - Get user progress
- `POST /api/progress/{lesson_id}/complete` - Mark lesson complete
- `GET /api/assignments/submissions` - Get assignment submissions
- `POST /api/assignments/{assignment_id}/submit` - Submit assignment
- `GET /api/modules/{module_id}/quizzes` - Get module quizzes
- `GET /api/quizzes/{quiz_id}` - Get quiz details
- `GET /api/quizzes/{quiz_id}/attempts` - Get quiz attempts
- `POST /api/quizzes/{quiz_id}/submit` - Submit quiz
- `GET /api/gamification/achievements` - Get achievements
- `GET /api/gamification/my-achievements` - Get user achievements
- `POST /api/gamification/achievements/{id}/unlock` - Unlock achievement

### Certificates (`/api/certificates`)
- `GET /api/certificates` - Get user certificates
- `GET /api/certificates/check-eligibility` - Check certificate eligibility
- `POST /api/certificates/issue` - Issue certificate

### Forum (`/api/forum`)
- `GET /api/forum/posts` - Get forum posts
- `POST /api/forum/posts` - Create forum post
- `GET /api/forum/posts/{id}` - Get post details
- `GET /api/forum/posts/{id}/replies` - Get post replies
- `POST /api/forum/posts/{id}/replies` - Create reply
- `GET /api/forum/categories` - Get forum categories

### Enrollment (`/api/enrollment`)
- `POST /api/enrollment/auto-enroll` - Auto-enroll in course

### Admin (`/api/admin`)
- `GET /api/admin/enrollment-applications` - Get enrollment applications
- `POST /api/admin/create-student-account` - Create student account
- `PATCH /api/admin/enrollment-applications/{id}` - Update application
- `GET /api/admin/waitlist` - Get waitlist
- `POST /api/admin/waitlist/{id}/promote` - Promote from waitlist
- `PATCH /api/admin/settings/batch-capacity` - Update batch capacity
- `GET /api/admin/notifications` - Get admin notifications
- `POST /api/admin/notifications` - Create notification
- And more admin endpoints...

## Migration Details

For detailed information about the migration process, see:
- `MIGRATION_INVENTORY.md` - Complete catalog of Supabase operations
- `MIGRATION_NOTES.md` - Bugs, decisions, and technical notes

## Development Workflow

1. Start the backend server: `cd backend && uvicorn app.main:app --reload`
2. Start the frontend server: `cd frontend && npm run dev`
3. Access the application at `http://localhost:5173`

## Key Changes from Original Architecture

1. **Data Access**: All data operations now go through FastAPI backend
2. **Authentication**: Frontend uses Supabase Auth, backend verifies JWTs
3. **Business Logic**: Moved from frontend/database triggers to Python services
4. **File Storage**: Still uses Supabase Storage directly (not proxied through backend)
5. **Database**: Same Supabase Postgres instance, no schema changes

## Testing

Before deploying, ensure:
- Backend server starts without errors
- Frontend can authenticate with Supabase
- API calls return expected data
- All major user flows work end-to-end
- File uploads work correctly

## Deployment

### Backend Deployment
- Set environment variables in production
- Deploy to a Python hosting platform (Railway, Render, AWS, etc.)
- Ensure database connection uses SSL
- Configure CORS for production domain

### Frontend Deployment
- Set `VITE_API_BASE_URL` to production backend URL
- Build the frontend: `npm run build`
- Deploy to a static hosting platform (Vercel, Netlify, etc.)
- Ensure Supabase environment variables are set

## Troubleshooting

### Backend Issues
- Check database connection string in `.env`
- Verify JWT secret matches Supabase project
- Check that Supabase service role key has correct permissions
- Review backend logs for specific error messages

### Frontend Issues
- Check that Vite proxy is configured correctly
- Verify API base URL in `.env`
- Check browser console for API errors
- Ensure Supabase credentials are correct

### Authentication Issues
- Verify Supabase project URL and anon key
- Check that JWT secret matches between Supabase and backend
- Ensure user email is confirmed
- Check that user has appropriate role in database

## Support

For issues or questions about the migration, refer to the migration documentation or contact the development team.
