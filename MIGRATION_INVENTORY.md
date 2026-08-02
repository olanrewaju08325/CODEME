# MIGRATION INVENTORY

This document catalogs all Supabase data operations currently performed by the frontend, organized by feature area. This is the build checklist for Phase 3 migration to FastAPI endpoints.

**Legend:**
- `Table`: Database table being accessed
- `Operation`: Type of operation (select/insert/update/delete/rpc/storage)
- `Role(s)`: User roles that can trigger this operation
- `Line`: File and line number where operation occurs
- `Migration Target`: FastAPI endpoint to create (or "client-side" if intentionally left on frontend)

---

## 1. AUTHENTICATION & PROFILE BOOTSTRAP

### 1.1 Profile Fetch (App.tsx)
- **Table**: `profiles`
- **Operation**: SELECT (single row by user ID)
- **Role(s)**: All authenticated users
- **Line**: `src/App.tsx:162-166`
- **Current Code**: `supabase.from('profiles').select('*').eq('id', activeSession.user.id).single()`
- **Migration Target**: `GET /api/profile/me` (Protected, returns current user profile)

### 1.2 Profile Update for Streak Logic (App.tsx)
- **Table**: `profiles`
- **Operation**: UPDATE (streak_count, last_active_date)
- **Role(s)**: All authenticated users
- **Line**: `src/App.tsx:175-197`
- **Current Code**: Multiple updates to handle streak logic
- **Migration Target**: `POST /api/profile/update-streak` (Protected, handles streak increment logic)

### 1.3 Notification Count Fetch (App.tsx)
- **Table**: `notifications`
- **Operation**: SELECT (count unread for user)
- **Role(s)**: All authenticated users
- **Line**: `src/App.tsx:121-127`
- **Current Code**: `supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false)`
- **Migration Target**: `GET /api/notifications/unread-count` (Protected)

### 1.4 Certificate Status Check (App.tsx)
- **Table**: `quiz_attempts`, `quizzes`
- **Operation**: SELECT (join to check passed quizzes)
- **Role(s)**: Students
- **Line**: `src/App.tsx:131-152`
- **Current Code**: Complex join to check quiz pass status
- **Migration Target**: `GET /api/profile/certificate-status` (Protected, returns certificate eligibility)

### 1.5 Profile Name Update (Onboarding.tsx)
- **Table**: `profiles`
- **Operation**: UPDATE (full_name)
- **Role(s)**: Students (during onboarding)
- **Line**: `src/views/Onboarding.tsx:49-52`
- **Current Code**: `supabase.from('profiles').update({ full_name: fullName }).eq('id', session.user.id)`
- **Migration Target**: `PATCH /api/profile/me` (Protected, allows name update)

### 1.6 Avatar Upload (Onboarding.tsx)
- **Table**: Storage bucket `avatars`
- **Operation**: Storage upload + public URL generation
- **Role(s)**: Students (during onboarding)
- **Line**: `src/views/Onboarding.tsx:103-113`
- **Current Code**: `supabase.storage.from('avatars').upload()` + `getPublicUrl()`
- **Migration Target**: `POST /api/profile/avatar` (Protected, returns signed upload URL from backend)

### 1.7 Avatar URL Update (Onboarding.tsx)
- **Table**: `profiles`
- **Operation**: UPDATE (avatar_url)
- **Role(s)**: Students (during onboarding)
- **Line**: `src/views/Onboarding.tsx:116-119`
- **Current Code**: `supabase.from('profiles').update({ avatar_url: finalAvatarUrl }).eq('id', session.user.id)`
- **Migration Target**: Included in `PATCH /api/profile/me`

### 1.8 Auto-Enrollment Logic (Onboarding.tsx)
- **Table**: `app_settings`, `student_enrollments`
- **Operation**: SELECT (settings), SELECT (counts), INSERT (enrollment)
- **Role(s)**: Students (during onboarding)
- **Line**: `src/views/Onboarding.tsx:136-179`
- **Current Code**: Batch capacity checking and enrollment insertion
- **Migration Target**: `POST /api/enrollment/auto-enroll` (Protected, handles batch assignment logic)

### 1.9 Notifications Fetch (App.tsx - NotificationsView)
- **Table**: `notifications`
- **Operation**: SELECT (user's notifications, paginated)
- **Role(s)**: All authenticated users
- **Line**: `src/App.tsx:421-426` (inline NotificationsView)
- **Current Code**: `supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)`
- **Migration Target**: `GET /api/notifications` (Protected, paginated)

### 1.10 Mark Notifications as Read (App.tsx)
- **Table**: `notifications`
- **Operation**: UPDATE (mark all as read)
- **Role(s)**: All authenticated users
- **Line**: `src/App.tsx:429`
- **Current Code**: `supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false)`
- **Migration Target**: `POST /api/notifications/mark-read` (Protected)

---

## 2. ENROLLMENT & ADMIN APPROVAL

### 2.1 Enrollment Applications Fetch (AdminPortal.tsx)
- **Table**: `enrollment_applications`
- **Operation**: SELECT (with courses join)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:47-52`
- **Current Code**: `supabase.from('enrollment_applications').select('*, courses(title)').order('created_at', { ascending: false })`
- **Migration Target**: `GET /api/admin/enrollment-applications` (Admin/Teacher only)

### 2.2 Create Student Account via RPC (AdminPortal.tsx)
- **Table**: RPC function `create_student_account`
- **Operation**: RPC call
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:61-66`
- **Current Code**: `supabase.rpc('create_student_account', { p_email, p_password, p_full_name, p_course_id })`
- **Migration Target**: `POST /api/admin/create-student-account` (Admin/Teacher only, reimplements logic in Python)

### 2.3 Update Application Status (AdminPortal.tsx)
- **Table**: `enrollment_applications`
- **Operation**: UPDATE (status to approved/rejected)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:69`
- **Current Code**: `supabase.from('enrollment_applications').update({ status: 'approved' }).eq('id', app.id)`
- **Migration Target**: `PATCH /api/admin/enrollment-applications/{id}` (Admin/Teacher only)

### 2.4 Waitlist Data Fetch (AdminPortal.tsx)
- **Table**: `student_enrollments`, `profiles`, `app_settings`
- **Operation**: SELECT (waitlisted students with profile data)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:120-136`
- **Current Code**: Complex join with profiles and settings
- **Migration Target**: `GET /api/admin/waitlist` (Admin/Teacher only)

### 2.5 Promote Student from Waitlist (AdminPortal.tsx)
- **Table**: `student_enrollments`
- **Operation**: UPDATE (status to enrolled, assign batch)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:143-149`
- **Current Code**: `supabase.from('student_enrollments').update({ status: 'enrolled', batch: targetBatch }).eq('id', enrollmentId)`
- **Migration Target**: `POST /api/admin/waitlist/{id}/promote` (Admin/Teacher only)

### 2.6 Update Batch Capacity (AdminPortal.tsx)
- **Table**: `app_settings`
- **Operation**: UPSERT (max_batch_size setting)
- **Role(s)**: Admin
- **Line**: `src/views/AdminPortal.tsx:172-174`
- **Current Code**: `supabase.from('app_settings').upsert({ key: 'max_batch_size', value: sizeVal.toString() })`
- **Migration Target**: `PATCH /api/admin/settings/batch-capacity` (Admin only)

### 2.7 Admin Password Reset (AdminPortal.tsx)
- **Table**: RPC function `admin_reset_password`
- **Operation**: RPC call
- **Role(s)**: Admin
- **Line**: `src/views/AdminPortal.tsx:195-198`
- **Current Code**: `supabase.rpc('admin_reset_password', { target_email: email, new_password: newPasswordVal })`
- **Migration Target**: `POST /api/admin/reset-password` (Admin only, reimplements logic in Python)

### 2.8 Role Update (AdminPortal.tsx)
- **Table**: `profiles`
- **Operation**: UPDATE (role field)
- **Role(s)**: Admin
- **Line**: `src/views/AdminPortal.tsx:218-221`
- **Current Code**: `supabase.from('profiles').update({ role: newRole }).eq('id', profileId)`
- **Migration Target**: `PATCH /api/admin/users/{id}/role` (Admin only)

---

## 3. COURSE/MODULE/LESSON CONTENT

### 3.1 Course List Fetch (Dashboard.tsx)
- **Table**: `courses`
- **Operation**: SELECT (all courses)
- **Role(s)**: All authenticated users
- **Line**: `src/views/Dashboard.tsx:189-193`
- **Current Code**: `supabase.from('courses').select('*').order('id')`
- **Migration Target**: `GET /api/courses` (Public or protected)

### 3.2 Module Fetch (CourseView.tsx)
- **Table**: `modules`
- **Operation**: SELECT (by course_id, ordered)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:35-41`
- **Current Code**: `supabase.from('modules').select('*').eq('course_id', selectedCourseId).order('order_index', { ascending: true })`
- **Migration Target**: `GET /api/courses/{course_id}/modules` (Protected)

### 3.3 Lesson Fetch (CourseView.tsx)
- **Table**: `lessons`
- **Operation**: SELECT (by module_ids, ordered)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:47-52`
- **Current Code**: `supabase.from('lessons').select('*').in('module_id', moduleIds).order('order_index', { ascending: true })`
- **Migration Target**: `GET /api/modules/{module_id}/lessons` (Protected)

### 3.4 Quiz Fetch (CourseView.tsx)
- **Table**: `quizzes`
- **Operation**: SELECT (by module_ids)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:55-59`
- **Current Code**: `supabase.from('quizzes').select('*').in('module_id', moduleIds)`
- **Migration Target**: `GET /api/modules/{module_id}/quiz` (Protected)

### 3.5 Assignment Fetch (CourseView.tsx)
- **Table**: `assignments`
- **Operation**: SELECT (by module_ids)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:62-66`
- **Current Code**: `supabase.from('assignments').select('*').in('module_id', moduleIds)`
- **Migration Target**: `GET /api/modules/{module_id}/assignment` (Protected)

### 3.6 Progress Fetch (CourseView.tsx)
- **Table**: `student_progress`
- **Operation**: SELECT (by student_id)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:70-74`
- **Current Code**: `supabase.from('student_progress').select('*').eq('student_id', session.user.id)`
- **Migration Target**: `GET /api/progress` (Protected, returns all progress for current user)

### 3.7 Assignment Submissions Fetch (CourseView.tsx)
- **Table**: `assignment_submissions`
- **Operation**: SELECT (by student_id)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:77-81`
- **Current Code**: `supabase.from('assignment_submissions').select('*').eq('student_id', session.user.id)`
- **Migration Target**: `GET /api/assignments/submissions` (Protected)

### 3.8 Quiz Attempts Fetch (CourseView.tsx)
- **Table**: `quiz_attempts`
- **Operation**: SELECT (by student_id)
- **Role(s)**: Students
- **Line**: `src/views/CourseView.tsx:84-88`
- **Current Code**: `supabase.from('quiz_attempts').select('*').eq('student_id', session.user.id)`
- **Migration Target**: `GET /api/quizzes/attempts` (Protected)

### 3.9 Lesson Detail Fetch (LessonView.tsx)
- **Table**: `lessons`, `modules`
- **Operation**: SELECT (single lesson with module data)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:254-264`
- **Current Code**: `supabase.from('lessons').select('*, modules(order_index, course_id)').eq('id', lessonId).single()`
- **Migration Target**: `GET /api/lessons/{lesson_id}` (Protected)

### 3.10 Lesson Progress Check (LessonView.tsx)
- **Table**: `student_progress`
- **Operation**: SELECT (check if lesson completed)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:267-273`
- **Current Code**: `supabase.from('student_progress').select('*').eq('student_id', session.user.id).eq('lesson_id', lessonId)`
- **Migration Target**: Included in `GET /api/lessons/{lesson_id}` response

### 3.11 Assignment Detail Fetch (LessonView.tsx)
- **Table**: `assignments`
- **Operation**: SELECT (by module_id)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:277-281`
- **Current Code**: `supabase.from('assignments').select('*').eq('module_id', lessonData.module_id).single()`
- **Migration Target**: Included in `GET /api/lessons/{lesson_id}` response

### 3.12 Assignment Submission Fetch (LessonView.tsx)
- **Table**: `assignment_submissions`
- **Operation**: SELECT (by assignment_id and student_id)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:287-292`
- **Current Code**: `supabase.from('assignment_submissions').select('*').eq('assignment_id', assignData.id).eq('student_id', session.user.id).maybeSingle()`
- **Migration Target**: Included in `GET /api/lessons/{lesson_id}` response

### 3.13 Mark Lesson Complete (LessonView.tsx)
- **Table**: `student_progress`
- **Operation**: INSERT (progress record)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:317-322`
- **Current Code**: `supabase.from('student_progress').insert({ student_id: session.user.id, lesson_id: lessonId })`
- **Migration Target**: `POST /api/progress/{lesson_id}/complete` (Protected)

### 3.14 Assignment File Upload (LessonView.tsx)
- **Table**: Storage bucket `assignments`
- **Operation**: Storage upload + public URL generation
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:351-361`
- **Current Code**: `supabase.storage.from('assignments').upload()` + `getPublicUrl()`
- **Migration Target**: `POST /api/assignments/{id}/upload` (Protected, returns signed upload URL)

### 3.15 Assignment Submission Create/Update (LessonView.tsx)
- **Table**: `assignment_submissions`
- **Operation**: INSERT or UPDATE (submission data)
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:366-400`
- **Current Code**: Conditional insert/update based on existing submission
- **Migration Target**: `POST /api/assignments/{id}/submit` (Protected, handles both create and update)

### 3.16 Content Manager - Courses Fetch (ContentManager.tsx)
- **Table**: `courses`
- **Operation**: SELECT (all courses)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:54`
- **Current Code**: `supabase.from('courses').select('*').order('id')`
- **Migration Target**: `GET /api/admin/courses` (Admin/Teacher only)

### 3.17 Content Manager - Modules Fetch (ContentManager.tsx)
- **Table**: `modules`
- **Operation**: SELECT (with nested lessons, assignments, quizzes)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:58-63`
- **Current Code**: `supabase.from('modules').select('*, lessons(*), assignments(*), quizzes(*)').eq('course_id', selectedCourseId).order('order_index')`
- **Migration Target**: `GET /api/admin/courses/{course_id}/content` (Admin/Teacher only)

### 3.18 Content Manager - Course Create/Update (ContentManager.tsx)
- **Table**: `courses`
- **Operation**: INSERT or UPDATE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:131-140`
- **Current Code**: Conditional insert/update based on activeView
- **Migration Target**: `POST /api/admin/courses` and `PATCH /api/admin/courses/{id}` (Admin/Teacher only)

### 3.19 Content Manager - Module Create/Update (ContentManager.tsx)
- **Table**: `modules`
- **Operation**: INSERT or UPDATE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:167-172`
- **Current Code**: Conditional insert/update
- **Migration Target**: `POST /api/admin/modules` and `PATCH /api/admin/modules/{id}` (Admin/Teacher only)

### 3.20 Content Manager - Module Publish Toggle (ContentManager.tsx)
- **Table**: `modules`
- **Operation**: UPDATE (is_published)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:152`
- **Current Code**: `supabase.from('modules').update({ is_published: !currentStatus }).eq('id', moduleId)`
- **Migration Target**: `PATCH /api/admin/modules/{id}/publish` (Admin/Teacher only)

### 3.21 Content Manager - Lesson Create/Update (ContentManager.tsx)
- **Table**: `lessons`
- **Operation**: INSERT or UPDATE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:187-193`
- **Current Code**: Conditional insert/update
- **Migration Target**: `POST /api/admin/lessons` and `PATCH /api/admin/lessons/{id}` (Admin/Teacher only)

### 3.22 Content Manager - Assignment Create/Update (ContentManager.tsx)
- **Table**: `assignments`
- **Operation**: INSERT or UPDATE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:208-214`
- **Current Code**: Conditional insert/update
- **Migration Target**: `POST /api/admin/assignments` and `PATCH /api/admin/assignments/{id}` (Admin/Teacher only)

### 3.23 Content Manager - Quiz Create/Update (ContentManager.tsx)
- **Table**: `quizzes`
- **Operation**: INSERT or UPDATE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:233-235`
- **Current Code**: Conditional insert/update
- **Migration Target**: `POST /api/admin/quizzes` and `PATCH /api/admin/quizzes/{id}` (Admin/Teacher only)

### 3.24 Content Manager - Delete Operations (ContentManager.tsx)
- **Table**: Various (modules, lessons, assignments, quizzes)
- **Operation**: DELETE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ContentManager.tsx:102`
- **Current Code**: `supabase.from(table).delete().eq('id', id)`
- **Migration Target**: `DELETE /api/admin/{resource}/{id}` (Admin/Teacher only)

---

## 4. LIVE CLASSES & RECORDINGS

### 4.1 Recordings Fetch (LiveClassesView.tsx)
- **Table**: `recording_library`
- **Operation**: SELECT (all recordings, ordered)
- **Role(s)**: Students, Teachers, Admin
- **Line**: `src/views/LiveClassesView.tsx:74-78`
- **Current Code**: `supabase.from('recording_library').select('*').order('created_at', { ascending: false })`
- **Migration Target**: `GET /api/recordings` (Protected)

### 4.2 Live Classes - Static Data (LiveClasses.tsx)
- **Table**: None (hardcoded data)
- **Operation**: None
- **Role(s)**: All users
- **Line**: `src/views/LiveClasses.tsx:9-43`
- **Current Code**: Hardcoded class schedule array
- **Migration Target**: Client-side (intentionally static, no backend needed)

---

## 5. QUIZZES, EXAMS & GRADING

### 5.1 Quiz Detail Fetch (QuizView.tsx)
- **Table**: `quizzes`, `modules`
- **Operation**: SELECT (single quiz with module data)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:95-100`
- **Current Code**: `supabase.from('quizzes').select('*, modules(*)').eq('id', quizId).single()`
- **Migration Target**: `GET /api/quizzes/{quiz_id}` (Protected)

### 5.2 Quiz Questions Fetch (QuizView.tsx)
- **Table**: `quiz_questions`
- **Operation**: SELECT (by quiz_id, ordered)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:103-108`
- **Current Code**: `supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index', { ascending: true })`
- **Migration Target**: Included in `GET /api/quizzes/{quiz_id}` response

### 5.3 Quiz Attempts Fetch (QuizView.tsx)
- **Table**: `quiz_attempts`
- **Operation**: SELECT (by student_id and quiz_id)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:111-117`
- **Current Code**: `supabase.from('quiz_attempts').select('*').eq('student_id', session.user.id).eq('quiz_id', quizId)`
- **Migration Target**: Included in `GET /api/quizzes/{quiz_id}` response

### 5.4 Payment Verifications Fetch (QuizView.tsx)
- **Table**: `exam_payment_verifications`
- **Operation**: SELECT (by student_id and quiz_id)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:120-126`
- **Current Code**: `supabase.from('exam_payment_verifications').select('*').eq('student_id', session.user.id).eq('quiz_id', quizId)`
- **Migration Target**: Included in `GET /api/quizzes/{quiz_id}` response

### 5.5 Quiz Attempt Security Re-check (QuizView.tsx)
- **Table**: `quiz_attempts`, `exam_payment_verifications`
- **Operation**: SELECT (security check before submission)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:226-242`
- **Current Code**: Re-fetches counts to enforce attempt limits
- **Migration Target**: Handled server-side in quiz submission endpoint

### 5.6 Quiz Attempt Submission (QuizView.tsx)
- **Table**: `quiz_attempts`
- **Operation**: INSERT (new attempt record)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:272-280`
- **Current Code**: `supabase.from('quiz_attempts').insert({ quiz_id, student_id, score, passed, attempt_number })`
- **Migration Target**: `POST /api/quizzes/{quiz_id}/submit` (Protected, handles grading logic server-side)

### 5.7 Payment Receipt Upload (QuizView.tsx)
- **Table**: `exam_payment_verifications`
- **Operation**: INSERT (base64 image URL)
- **Role(s)**: Students
- **Line**: `src/views/QuizView.tsx:182-190`
- **Current Code**: `supabase.from('exam_payment_verifications').insert({ student_id, quiz_id, receipt_url: base64Image, status: 'pending', amount: 2000 })`
- **Migration Target**: `POST /api/quizzes/{quiz_id}/payment` (Protected, handles file upload)

### 5.8 Grading Queue Fetch (AdminPortal.tsx)
- **Table**: `assignment_submissions`
- **Operation**: SELECT (pending submissions with profile/assignment data)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:366-371`
- **Current Code**: Complex join with profiles and assignments
- **Migration Target**: `GET /api/admin/grading-queue` (Admin/Teacher only)

### 5.9 Payment Queue Fetch (AdminPortal.tsx)
- **Table**: `exam_payment_verifications`
- **Operation**: SELECT (pending payments with profile/quiz data)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:374-379`
- **Current Code**: Complex join with profiles and quizzes
- **Migration Target**: `GET /api/admin/payment-queue` (Admin/Teacher only)

### 5.10 Assignment Grading (AdminPortal.tsx)
- **Table**: `assignment_submissions`
- **Operation**: UPDATE (status, feedback, graded_by, graded_at)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:433-441`
- **Current Code**: `supabase.from('assignment_submissions').update({ status, feedback, graded_by, graded_at }).eq('id', id)`
- **Migration Target**: `PATCH /api/admin/assignments/{id}/grade` (Admin/Teacher only)

### 5.11 Payment Approval (AdminPortal.tsx)
- **Table**: `exam_payment_verifications`
- **Operation**: UPDATE (status to approved)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:459-465`
- **Current Code**: `supabase.from('exam_payment_verifications').update({ status: 'approved', updated_at }).eq('id', id)`
- **Migration Target**: `PATCH /api/admin/payments/{id}/approve` (Admin/Teacher only)

### 5.12 Payment Rejection (AdminPortal.tsx)
- **Table**: `exam_payment_verifications`
- **Operation**: UPDATE (status to rejected with reason)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:483-490`
- **Current Code**: `supabase.from('exam_payment_verifications').update({ status: 'rejected', rejection_reason, updated_at }).eq('id', id)`
- **Migration Target**: `PATCH /api/admin/payments/{id}/reject` (Admin/Teacher only)

### 5.13 AI Flagging (AdminPortal.tsx)
- **Table**: `assignment_submissions`
- **Operation**: UPDATE (is_ai_flagged)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:234-237`
- **Current Code**: `supabase.from('assignment_submissions').update({ is_ai_flagged: isFlagged }).eq('id', id)`
- **Migration Target**: `PATCH /api/admin/assignments/{id}/ai-flag` (Admin/Teacher only)

### 5.14 Teacher Grading (TeacherDashboard.tsx)
- **Table**: `assignment_submissions`
- **Operation**: UPDATE (grade, feedback)
- **Role(s)**: Teacher
- **Line**: `src/views/TeacherDashboard.tsx:94-97`
- **Current Code**: `supabase.from('assignment_submissions').update({ grade: gradeVal, feedback: feedbackVal }).eq('id', selectedSubmission.id)`
- **Migration Target**: `PATCH /api/teacher/assignments/{id}/grade` (Teacher only)

### 5.15 Grading Notification (TeacherDashboard.tsx)
- **Table**: `notifications`
- **Operation**: INSERT (grading notification)
- **Role(s)**: Teacher
- **Line**: `src/views/TeacherDashboard.tsx:101-106`
- **Current Code**: `supabase.from('notifications').insert({ user_id, title, message, type })`
- **Migration Target**: Handled automatically in grading endpoint

---

## 6. CERTIFICATES

### 6.1 Certificate Fetch/Generate (CertificateView.tsx)
- **Table**: `certificates`
- **Operation**: SELECT (by student_id and course_id) or INSERT
- **Role(s)**: Students
- **Line**: `src/views/CertificateView.tsx:30-52`
- **Current Code**: Conditional select/insert for certificate
- **Migration Target**: `GET /api/certificates/my-certificate` (Protected, creates if not exists)

### 6.2 Certificate Verification (VerifyCertificateView.tsx)
- **Table**: `certificates`, `profiles`, `courses`
- **Operation**: SELECT (by certificate_code with joins)
- **Role(s)**: Public (no auth required)
- **Line**: `src/views/VerifyCertificateView.tsx:32-36`
- **Current Code**: `supabase.from('certificates').select('*, profiles(*), courses(*)').eq('certificate_code', code).maybeSingle()`
- **Migration Target**: `GET /api/certificates/verify/{code}` (Public)

### 6.3 Certificate Templates Fetch (AdminPortal.tsx)
- **Table**: `certificate_templates`
- **Operation**: SELECT (with courses join)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:260-261`
- **Current Code**: `supabase.from('certificate_templates').select('*, courses(title)')`
- **Migration Target**: `GET /api/admin/certificate-templates` (Admin/Teacher only)

### 6.4 Certificate Template Save (AdminPortal.tsx)
- **Table**: `certificate_templates`
- **Operation**: UPSERT
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:273-278`
- **Current Code**: `supabase.from('certificate_templates').upsert({ course_id, template_name, primary_color, signatory_name }, { onConflict: 'course_id' })`
- **Migration Target**: `POST /api/admin/certificate-templates` (Admin/Teacher only)

---

## 7. FORUM

### 7.1 Forum Posts Fetch (ForumView.tsx)
- **Table**: `forum_posts`, `profiles`
- **Operation**: SELECT (with profile data, by course_id)
- **Role(s)**: All authenticated users
- **Line**: `src/views/ForumView.tsx:42-46`
- **Current Code**: `supabase.from('forum_posts').select('*, profiles(full_name, role)').eq('course_id', activeCourseId).order('created_at', { ascending: false })`
- **Migration Target**: `GET /api/forum/posts?course_id={id}` (Protected)

### 7.2 Forum Replies Fetch (ForumView.tsx)
- **Table**: `forum_replies`, `profiles`
- **Operation**: SELECT (by post_id with profile data)
- **Role(s)**: All authenticated users
- **Line**: `src/views/ForumView.tsx:60-64`
- **Current Code**: `supabase.from('forum_replies').select('*, profiles(full_name, role)').eq('post_id', postId).order('created_at', { ascending: true })`
- **Migration Target**: `GET /api/forum/posts/{id}/replies` (Protected)

### 7.3 Forum Post Create (ForumView.tsx)
- **Table**: `forum_posts`
- **Operation**: INSERT
- **Role(s)**: All authenticated users
- **Line**: `src/views/ForumView.tsx:91-97`
- **Current Code**: `supabase.from('forum_posts').insert({ course_id, student_id, content })`
- **Migration Target**: `POST /api/forum/posts` (Protected)

### 7.4 Forum Reply Create (ForumView.tsx)
- **Table**: `forum_replies`
- **Operation**: INSERT
- **Role(s)**: All authenticated users
- **Line**: `src/views/ForumView.tsx:115-121`
- **Current Code**: `supabase.from('forum_replies').insert({ post_id, user_id, content })`
- **Migration Target**: `POST /api/forum/posts/{id}/replies` (Protected)

### 7.5 Forum Post Pin (ForumView.tsx)
- **Table**: `forum_posts`
- **Operation**: UPDATE (is_pinned)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ForumView.tsx:135`
- **Current Code**: `supabase.from('forum_posts').update({ is_pinned: !currentPinned }).eq('id', postId)`
- **Migration Target**: `PATCH /api/forum/posts/{id}/pin` (Admin/Teacher only)

### 7.6 Forum Post Delete (ForumView.tsx)
- **Table**: `forum_posts`
- **Operation**: UPDATE (is_deleted, deleted_by)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/ForumView.tsx:143`
- **Current Code**: `supabase.from('forum_posts').update({ is_deleted: true, deleted_by: session.user.id }).eq('id', postId)`
- **Migration Target**: `DELETE /api/forum/posts/{id}` (Admin/Teacher only)

### 7.7 Forum Moderation Queue (AdminPortal.tsx)
- **Table**: `forum_posts`
- **Operation**: SELECT (held posts with profile data)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:389-394`
- **Current Code**: `supabase.from('forum_posts').select('*, profiles(full_name, student_id)').eq('status', 'held')`
- **Migration Target**: `GET /api/admin/forum/moderation-queue` (Admin/Teacher only)

### 7.8 Forum Post Moderation (AdminPortal.tsx)
- **Table**: `forum_posts`
- **Operation**: UPDATE (status) or DELETE
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:510-516`
- **Current Code**: Conditional update or delete
- **Migration Target**: `PATCH /api/admin/forum/posts/{id}/moderate` (Admin/Teacher only)

---

## 8. GAMIFICATION

### 8.1 Badges Fetch (Dashboard.tsx)
- **Table**: `student_badges`
- **Operation**: SELECT (by student_id)
- **Role(s)**: Students
- **Line**: `src/views/Dashboard.tsx:124-129`
- **Current Code**: `supabase.from('student_badges').select('*').eq('student_id', session.user.id)`
- **Migration Target**: `GET /api/badges` (Protected)

### 8.2 Badge Award Logic (Dashboard.tsx)
- **Table**: `student_badges`
- **Operation**: INSERT (conditional based on quiz passes)
- **Role(s)**: Students (automatic)
- **Line**: `src/views/Dashboard.tsx:144-168`
- **Current Code**: Complex conditional badge insertion logic
- **Migration Target**: Handled server-side in quiz submission or periodic check

### 8.3 Leaderboard Fetch (Dashboard.tsx)
- **Table**: `profiles`, `quiz_attempts`
- **Operation**: SELECT (complex join for leaderboard calculation)
- **Role(s)**: Students
- **Line**: `src/views/Dashboard.tsx:171-187`
- **Current Code**: Complex query joining profiles with quiz attempts
- **Migration Target**: `GET /api/leaderboard` (Protected or public)

### 8.4 Streak Data (Dashboard.tsx)
- **Table**: `profiles`
- **Operation**: SELECT (streak_count, last_active_date)
- **Role(s)**: Students
- **Line**: `src/views/Dashboard.tsx:82-87`
- **Current Code**: Included in profile fetch
- **Migration Target**: Included in `GET /api/profile/me`

---

## 9. NOTIFICATIONS

### 9.1 Announcement Fetch (Dashboard.tsx)
- **Table**: `announcements`
- **Operation**: SELECT (latest announcement)
- **Role(s)**: All authenticated users
- **Line**: `src/views/Dashboard.tsx:106-112`
- **Current Code**: `supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()`
- **Migration Target**: `GET /api/announcements/latest` (Public or protected)

### 9.2 Announcements List (AdminPortal.tsx)
- **Table**: `announcements`
- **Operation**: SELECT (with profile data)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:382-386`
- **Current Code**: `supabase.from('announcements').select('*, profiles(full_name)').order('created_at', { ascending: false })`
- **Migration Target**: `GET /api/admin/announcements` (Admin/Teacher only)

### 9.3 Announcement Create (AdminPortal.tsx)
- **Table**: `announcements`
- **Operation**: INSERT
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:532-537`
- **Current Code**: `supabase.from('announcements').insert({ content, created_by })`
- **Migration Target**: `POST /api/admin/announcements` (Admin/Teacher only)

### 9.4 Teacher Announcement (TeacherDashboard.tsx)
- **Table**: `announcements`
- **Operation**: INSERT (with title and body)
- **Role(s)**: Teacher
- **Line**: `src/views/TeacherDashboard.tsx:125-129`
- **Current Code**: `supabase.from('announcements').insert({ title, body, created_by })`
- **Migration Target**: `POST /api/teacher/announcements` (Teacher only)

### 9.5 Live Class Link Announcement (TeacherDashboard.tsx)
- **Table**: `announcements`
- **Operation**: INSERT (live class link as announcement)
- **Role(s)**: Teacher
- **Line**: `src/views/TeacherDashboard.tsx:146-150`
- **Current Code**: `supabase.from('announcements').insert({ title, body, created_by })`
- **Migration Target**: Included in teacher announcement endpoint

---

## 10. ADMIN DASHBOARD

### 10.1 Analytics Metrics (AdminPortal.tsx)
- **Table**: `profiles`, `student_enrollments`, `exam_payment_verifications`, `assignment_submissions`
- **Operation**: SELECT (count queries for dashboard metrics)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:332-357`
- **Current Code**: Multiple count queries for dashboard stats
- **Migration Target**: `GET /api/admin/analytics` (Admin/Teacher only)

### 10.2 Student Search (AdminPortal.tsx)
- **Table**: `profiles`
- **Operation**: SELECT (search by name or student_id)
- **Role(s)**: Admin, Teacher
- **Line**: `src/views/AdminPortal.tsx:584-589`
- **Current Code**: `supabase.from('profiles').select('*').eq('role', 'student').or('full_name.ilike.%term%,student_id.ilike.%term%')`
- **Migration Target**: `GET /api/admin/students/search?q={term}` (Admin/Teacher only)

### 10.3 Student History Fetch (AdminPortal.tsx)
- **Table**: `student_progress`, `quiz_attempts`, `certificates`
- **Operation**: SELECT (student's academic history)
- **Role(s)**: Admin, Teacher
- **Line**: Not fully implemented in current code
- **Migration Target**: `GET /api/admin/students/{id}/history` (Admin/Teacher only)

### 10.4 Bug Report Submit (Dashboard.tsx)
- **Table**: `bug_reports`
- **Operation**: INSERT
- **Role(s)**: All authenticated users
- **Line**: `src/views/Dashboard.tsx:63-65`
- **Current Code**: `supabase.from('bug_reports').insert({ student_id, feedback: bugText })`
- **Migration Target**: `POST /api/bug-reports` (Protected)

---

## 11. AI TUTOR WIDGET

### 11.1 AI Chat Widget (AIChatWidget.tsx)
- **Table**: None (currently mock implementation)
- **Operation**: None (client-side mock responses)
- **Role(s)**: Students
- **Line**: `src/components/AIChatWidget.tsx:24-58`
- **Current Code**: Mock response generation with simple heuristics
- **Migration Target**: Currently client-side mock (as per spec, no external API calls)

---

## 12. FILE STORAGE OPERATIONS

### 12.1 Avatar Storage (Onboarding.tsx)
- **Storage Bucket**: `avatars`
- **Operation**: Upload and public URL generation
- **Role(s)**: Students
- **Line**: `src/views/Onboarding.tsx:103-113`
- **Current Code**: Direct Supabase Storage calls
- **Migration Target**: Client-side (frontend continues to use Supabase Storage directly for file operations, backend only provides authorization)

### 12.2 Assignment Storage (LessonView.tsx)
- **Storage Bucket**: `assignments`
- **Operation**: Upload and public URL generation
- **Role(s)**: Students
- **Line**: `src/views/LessonView.tsx:351-361`
- **Current Code**: Direct Supabase Storage calls
- **Migration Target**: Client-side (frontend continues to use Supabase Storage directly for file operations, backend only provides authorization)

---

## CLIENT-SIDE STORAGE OPERATIONS (INTENTIONALLY LEFT ON FRONTEND)

Per architecture decision #3, these operations will remain as direct Supabase Storage calls from the frontend:

1. **Avatar Upload/Download** - `src/views/Onboarding.tsx:103-113`
2. **Assignment File Upload** - `src/views/LessonView.tsx:351-361`
3. **PDF Notes Download** - `src/views/LessonView.tsx:65-76` (lesson.pdf_url)
4. **Recording Video Playback** - All recording URLs from `recording_library` table

**Rationale**: These are file operations where FastAPI's role is authorization only, not proxying bytes. The frontend will call FastAPI to get signed URLs when needed, but actual file upload/download will be direct to Supabase Storage.

---

## AUTHENTICATION OPERATIONS (INTENTIONALLY LEFT ON FRONTEND)

Per architecture decision #1, these operations will remain as direct Supabase Auth calls:

1. **User Sign Up** - `src/views/AuthScreen.tsx:59-67`
2. **User Sign In** - `src/views/AuthScreen.tsx:77-84`
3. **Session Management** - `src/App.tsx:78-115`
4. **Sign Out** - `src/App.tsx:242-246`

**Rationale**: Supabase Auth remains the authentication provider. FastAPI only verifies JWTs from Supabase.

---

## SUMMARY

**Total Operations Cataloged**: 87 distinct Supabase data operations
**Operations to Migrate to FastAPI**: 82
**Operations to Keep Client-Side**: 5 (file storage operations with backend authorization)
**Auth Operations to Keep Client-Side**: 4 (Supabase Auth direct calls)

**Priority Order for Migration (Phase 2):**
1. Auth/profile bootstrap (4 operations)
2. Enrollment & admin approval (8 operations)
3. Course/Module/Lesson content (15 operations)
4. Live classes & recordings (2 operations)
5. Quizzes, exams & grading (15 operations)
6. Certificates (4 operations)
7. Forum (8 operations)
8. Gamification (4 operations)
9. Notifications (5 operations)
10. Admin dashboard (7 operations)
11. AI Tutor widget (0 operations - already mock)
12. File storage (5 operations - keep client-side with backend auth)
