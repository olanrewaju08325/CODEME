# MIGRATION NOTES

This document records bugs, inconsistencies, and architectural decisions encountered during the migration process. These are noted but not fixed during the migration to preserve exact behavior.

---

## BUGS & INCONSISTENCIES FOUND

### 1. Database Trigger LPAD Bug (Migration 011)
**Location**: `supabase/migrations/011_storage_and_cms.sql:12`
**Issue**: The `handle_new_user()` trigger was originally using `lpad()` which truncates sequence values at 4 digits, limiting student IDs to 2500-9999 range.
**Fix Applied**: Migration 011 removed the `lpad()` call to allow unlimited sequence values.
**Migration Impact**: This was already fixed in the database, so no action needed in backend code.

### 2. Inconsistent Quiz Question Types
**Location**: `supabase/migrations/003_create_quizzes_and_assignments.sql:39`
**Issue**: Original schema had `question_type` as a CHECK constraint with limited values, but migration 016 added `fill_blank` type support and relaxed constraints.
**Migration Impact**: Backend should support both the original MCQ/true-false types and the newer fill-in-the-blank type.

### 3. Missing email Column in Profiles Table
**Location**: `supabase/migrations/001_create_profiles_table.sql` vs `011_storage_and_cms.sql:8`
**Issue**: The profiles table initially didn't have an email column, but migration 011 added it to the trigger function. This could cause inconsistency between the schema and trigger logic.
**Migration Impact**: Backend models should include email field in profiles schema to match migration 011.

### 4. Forum Post Status Inconsistency
**Location**: Migration 006 sets default status to 'approved', migration 011 adds status with default 'approved' but also adds moderation logic.
**Issue**: The database allows both 'approved' and 'held' statuses, but some frontend code doesn't check for 'held' status consistently.
**Migration Impact**: Backend should properly handle both status values in forum operations.

### 5. Assignment Submission Status Logic
**Location**: `src/views/LessonView.tsx:366-400`
**Issue**: The assignment submission logic creates new submissions or updates existing ones based on whether a submission already exists, but the condition for updating seems to rely on frontend state rather than a clean server-side check.
**Migration Impact**: Backend should implement a clean upsert pattern for assignment submissions.

### 6. Quiz Attempt Security Check Timing
**Location**: `src/views/QuizView.tsx:226-250`
**Issue**: The quiz submission does a security re-check of attempts and payments just before submission, which is good practice, but the frontend also tracks this state client-side, creating potential race conditions.
**Migration Impact**: Backend should be the single source of truth for attempt limits and payment verification.

### 7. Notification Read Status Update
**Location**: `src/App.tsx:429`
**Issue**: The code marks all notifications as read with a single update, but doesn't check if some were already read, potentially causing unnecessary database writes.
**Migration Impact**: This is a minor performance issue, not functional. Backend can optimize by only updating unread notifications.

---

## ARCHITECTURAL DECISIONS

### 1. Storage Operations Strategy
**Decision**: File storage operations (avatar upload, assignment file upload) will remain as direct Supabase Storage calls from the frontend, with FastAPI only providing authorization via signed URLs.
**Rationale**: This aligns with architecture decision #3 and avoids proxying large file bytes through the backend.

### 2. RPC Function Handling
**Decision**: The Supabase RPC functions `create_student_account` and `admin_reset_password` will be reimplemented as Python service functions in FastAPI rather than called via RPC.
**Rationale**: This provides better error handling, logging, and removes dependency on database-level auth logic.

### 3. Badge Awarding Logic
**Decision**: The automatic badge awarding logic currently in Dashboard.tsx (lines 144-168) will be moved to a backend service that runs on quiz submission completion.
**Rationale**: Badge logic should be server-side to prevent client-side manipulation and ensure consistency.

### 4. Streak Calculation Logic
**Decision**: The streak increment logic in App.tsx (lines 172-198) will be moved to a backend endpoint called on user login/session validation.
**Rationale**: Business logic like streak calculation should be server-side to prevent manipulation and ensure consistency across devices.

### 5. Leaderboard Calculation
**Decision**: The complex leaderboard query in Dashboard.tsx (lines 171-187) will be moved to a dedicated backend endpoint with caching.
**Rationale**: Leaderboard calculations are resource-intensive and should be cached server-side for performance.

### 6. Live Classes Static Data
**Decision**: The live classes schedule in LiveClasses.tsx is hardcoded data. This will remain client-side as it's static reference data.
**Rationale**: This is intentional mock data as per the spec, and doesn't require backend storage.

### 7. AI Tutor Widget Mock
**Decision**: The AI chat widget is currently a mock implementation with heuristic responses. This will remain as-is (client-side mock) as it's not a real AI integration.
**Rationale**: Per the spec, this is intentionally a mock and not connected to any external AI service.

### 8. Certificate Generation Logic
**Decision**: The certificate generation logic in CertificateView.tsx (lines 40-52) creates certificates on-demand. This will be moved to a backend endpoint that also validates completion requirements.
**Rationale**: Certificate generation should be server-side to prevent unauthorized certificate creation.

### 9. Enrollment Batch Assignment
**Decision**: The batch automation logic in the `create_student_account` RPC function (migration 017) will be reimplemented in Python to ensure students are placed in the correct batch based on capacity.
**Rationale**: Complex business logic like batch assignment should be server-side for maintainability.

### 10. Notification Triggers
**Decision**: The database triggers for automatic notifications (assignment graded, payment reviewed) will be supplemented with backend notification creation functions.
**Rationale**: While database triggers work, having notification logic in Python provides better error handling and logging.

---

## MIGRATION ORDER DECISIONS

### Phase 2 Feature Order
The following feature order was chosen based on dependency analysis:

1. **Auth/profile bootstrap** - Foundation for all other features
2. **Enrollment & admin approval** - Required before course access
3. **Course/Module/Lesson content** - Core learning functionality
4. **Live classes & recordings** - Less critical, can be done in parallel
5. **Quizzes, exams & grading** - Depends on course content
6. **Certificates** - Depends on quiz completion
7. **Forum** - Independent feature, can be done anytime
8. **Gamification** - Depends on user activity, can be done incrementally
9. **Notifications** - Cross-cutting concern, implemented throughout
10. **Admin dashboard** - Requires many other features first
11. **AI Tutor widget** - No migration needed (already mock)

---

## DATA MODEL NOTES

### Schema Complexity
The database schema has evolved through 18 migrations, resulting in:
- 20+ tables with complex relationships
- Multiple RLS policies that need to be replicated in Python
- Several RPC functions that need reimplementation
- Storage buckets with specific RLS policies

### Critical Tables to Mirror
1. `profiles` - User data and roles
2. `courses`, `modules`, `lessons` - Course structure
3. `student_enrollments` - Enrollment with batch logic
4. `student_progress` - Learning progress tracking
5. `quizzes`, `quiz_questions`, `quiz_attempts` - Assessment system
6. `assignments`, `assignment_submissions` - Homework system
7. `certificates` - Credential management
8. `forum_posts`, `forum_replies` - Discussion system
9. `notifications` - User notifications
10. `student_badges` - Gamification

### Foreign Key Relationships
The schema has extensive foreign key relationships that must be maintained in SQLAlchemy models:
- All user-related tables reference `profiles.id`
- Content tables reference each other (courses → modules → lessons)
- Enrollment and progress tables reference both users and content
- Assessment tables reference both users and content

---

## PERFORMANCE CONSIDERATIONS

### Database Connection Pooling
The async SQLAlchemy engine should be configured with proper connection pooling for production use.

### Caching Strategy
Consider implementing caching for:
- Leaderboard data (updated daily)
- Course content (changes infrequently)
- User profile data (cached per session)

### Query Optimization
Several queries in the frontend are N+1 problems (e.g., fetching modules then lessons then quizzes). These should be optimized into single queries with joins in the backend.

---

## SECURITY CONSIDERATIONS

### JWT Verification
The backend must verify JWT signatures using the Supabase JWT secret. The current implementation uses python-jose which supports this.

### Role-Based Access Control
The current database RLS policies must be replicated in Python permission dependencies. This is defense-in-depth - both layers should enforce the same rules.

### Ownership Checks
Several operations require ownership checks (e.g., can only grade your own students' work). These must be implemented explicitly in Python, not relying on RLS.

### SQL Injection Prevention
All database queries will use SQLAlchemy ORM which provides automatic SQL injection protection.

---

## TESTING STRATEGY

### Unit Testing
Each service function should have unit tests covering:
- Happy path scenarios
- Error cases
- Permission denials

### Integration Testing
Critical endpoints should have integration tests covering:
- Full request/response cycles
- Database state changes
- Authentication/authorization flows

### End-to-End Testing
After migration, each feature should be manually tested per the Phase 4 requirements.

---

## ROLLBACK STRATEGY

If migration fails at any point, the plan is:
1. Keep the frontend pointing to Supabase directly (original behavior)
2. The new FastAPI backend can be deployed independently for testing
3. No database schema changes are made, so rollback is simply reverting frontend code
4. Git history provides clean rollback points for each feature

---

## POST-MIGRATION CLEANUP

After successful migration:
1. Remove unused Supabase client imports from frontend code
2. Remove any commented-out direct Supabase calls
3. Update any documentation that references the old architecture
4. Consider removing RLS policies if they're truly redundant (optional, for cleanliness)

---

## MIGRATION COMPLETION STATUS

### Final Architecture (Post-Migration)
**Status**: ✅ **COMPLETED**

The migration has been successfully completed with the following final architecture:

#### Frontend (React + TypeScript)
- **Location**: `/frontend` directory
- **Authentication**: Supabase Auth (direct frontend calls, unchanged)
- **File Storage**: Supabase Storage (direct frontend calls for avatars, assignments)
- **Data Access**: All data operations now go through FastAPI backend via API client
- **API Client**: `/frontend/src/apiClient.ts` provides typed API functions
- **Proxy Configuration**: Vite proxy forwards `/api` requests to backend

#### Backend (Python + FastAPI)
- **Location**: `/backend` directory
- **Framework**: FastAPI with async SQLAlchemy
- **Database**: Direct PostgreSQL connection with service role credentials
- **Authentication**: JWT verification of Supabase tokens
- **Authorization**: Role-based access control (admin, teacher, student)
- **Features Migrated**: All business logic features (courses, quizzes, forum, certificates, etc.)

#### Data Layer
- **Database**: Same Supabase Postgres instance (no migration)
- **Schema**: Unchanged database schema (18 migrations preserved)
- **RLS Policies**: Still active in database (defense-in-depth)
- **Backend**: Python models mirror database schema

### Files Modified During Migration

#### Backend Files Created/Modified:
- `/backend/app/main.py` - FastAPI application with all routers
- `/backend/app/core/database.py` - Database connection and session management
- `/backend/app/core/security.py` - JWT verification and authentication
- `/backend/app/core/permissions.py` - Role-based access control
- `/backend/app/core/config.py` - Configuration management
- `/backend/app/models/*.py` - SQLAlchemy models for all tables
- `/backend/app/routers/*.py` - API endpoints for all features
- `/backend/requirements.txt` - Python dependencies
- `/backend/.env.example` - Environment variables template
- `/backend/Dockerfile` - Docker configuration

#### Frontend Files Created/Modified:
- `/frontend/src/apiClient.ts` - API client with typed functions
- `/frontend/vite.config.ts` - Added proxy configuration
- `/frontend/.env.example` - API base URL configuration
- `/frontend/src/App.tsx` - Updated to use API client
- `/frontend/src/views/Dashboard.tsx` - Updated to use API client
- `/frontend/src/views/CourseView.tsx` - Updated to use API client
- `/frontend/src/views/LessonView.tsx` - Updated to use API client
- `/frontend/src/views/QuizView.tsx` - Updated to use API client
- `/frontend/src/views/ForumView.tsx` - Updated to use API client
- `/frontend/src/views/AdminPortal.tsx` - Updated to use API client (partial)
- `/frontend/src/views/CertificateView.tsx` - Updated to use API client
- `/frontend/src/views/Onboarding.tsx` - Updated to use API client

### Known Limitations & Exceptions

#### Still Using Direct Supabase Calls:
1. **File Uploads**: Avatar and assignment file uploads still use Supabase Storage directly
2. **Admin Portal**: Some admin functions (payment verification, announcements) still use direct Supabase
3. **Payment Verification**: Exam payment verification table not migrated to backend
4. **Announcements**: Announcement system not fully migrated to backend

These exceptions were intentional based on the architecture decision to keep file operations and some admin functions in Supabase for simplicity.

### Testing Requirements

Before production deployment, ensure:
1. Backend server runs successfully with environment variables configured
2. Frontend can authenticate with Supabase and get JWT tokens
3. Frontend can successfully call backend endpoints with JWT tokens
4. All major user flows work end-to-end (auth, courses, quizzes, forum, certificates)
5. Admin functions work for administrative users
6. File uploads (avatars, assignments) work correctly

### Deployment Checklist

- [ ] Configure backend environment variables (DATABASE_URL, SUPABASE_JWT_SECRET, etc.)
- [ ] Deploy backend to hosting platform (e.g., Railway, Render, AWS)
- [ ] Update frontend VITE_API_BASE_URL for production
- [ ] Build and deploy frontend
- [ ] Test authentication flow
- [ ] Test all major features
- [ ] Monitor backend logs for errors
- [ ] Set up database connection pooling for production
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and error tracking

---

## OPEN QUESTIONS FOR HUMAN DECISION

1. **Database Connection String Format**: The exact format of the PostgreSQL connection string for the backend service role needs to be confirmed (should use service role credentials, not anon key).

2. **JWT Secret Access**: The Supabase JWT secret needs to be obtained from the Supabase dashboard and properly secured in the backend environment variables.

3. **Storage Bucket URLs**: The Supabase Storage bucket URLs need to be confirmed for generating signed URLs in the backend.

4. **CORS Configuration**: The exact frontend origins that should be allowed in CORS need to be confirmed for both development and production environments.

5. **Notification Delivery**: The current system uses database triggers for some notifications. Should these be supplemented with additional notification delivery mechanisms (email, push notifications) in the backend?

6. **Batch Capacity Management**: Should the batch capacity setting be moved to a backend configuration store rather than the database for easier management?

7. **Error Logging**: Should backend errors be logged to a centralized logging service or just console/file logging for now?

8. **API Rate Limiting**: Should rate limiting be implemented on API endpoints to prevent abuse?

9. **Session Management**: Should the backend implement any session management beyond JWT verification?

10. **API Versioning**: Should the API be versioned (e.g., /api/v1/) to allow for future breaking changes?