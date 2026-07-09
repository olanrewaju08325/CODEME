-- ═══════════════════════════════════════════════════════════════
-- Migration 016: Certificate Templates, Gradebook Views,
--                Recording Library, AI Tutor Stub
-- ═══════════════════════════════════════════════════════════════

-- ── Certificate Templates per course ──────────────────────────
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  primary_color text DEFAULT '#0C4A8C',
  accent_color  text DEFAULT '#8B2FA6',
  logo_url      text,
  signatory_name text DEFAULT 'Olamide A.O',
  signatory_title text DEFAULT 'Director, CodeMe Academy',
  custom_css    text,
  is_active     boolean DEFAULT true,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(course_id)
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_cert_templates" ON public.certificate_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );
CREATE POLICY "public_read_cert_templates" ON public.certificate_templates
  FOR SELECT USING (true);

-- ── Recording Library for live classes ────────────────────────
CREATE TABLE IF NOT EXISTS public.recording_library (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     text REFERENCES public.courses(id) ON DELETE SET NULL,
  module_id     uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  recording_url text NOT NULL,
  thumbnail_url text,
  duration_mins integer,
  session_date  date,
  uploaded_by   uuid REFERENCES auth.users(id),
  is_visible    boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.recording_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrolled_students_see_recordings" ON public.recording_library
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.student_id = auth.uid()
      AND (se.course_id = recording_library.course_id OR recording_library.course_id IS NULL)
      AND se.status = 'enrolled'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );
CREATE POLICY "teachers_manage_recordings" ON public.recording_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- ── AI Tutor Sessions stub (V8) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  messages      jsonb NOT NULL DEFAULT '[]',
  tokens_used   integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_own_ai_sessions" ON public.ai_tutor_sessions
  FOR ALL USING (auth.uid() = student_id);

-- ── Forum Moderation columns ────────────────────────────────────
-- Add pinned and deleted_by columns to forum_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_posts' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.forum_posts ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_posts' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE public.forum_posts ADD COLUMN deleted_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_posts' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.forum_posts ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;
END $$;

-- ── Fill-in-the-blank question type support ─────────────────────
-- Add blank_answer column to quiz_questions for FITB type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE public.quiz_questions ADD COLUMN question_type text DEFAULT 'mcq';
    -- question_type: 'mcq' | 'true_false' | 'fill_blank'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'blank_answer'
  ) THEN
    ALTER TABLE public.quiz_questions ADD COLUMN blank_answer text;
    -- The correct answer for fill_blank questions (case-insensitive match)
  END IF;
END $$;

-- ── Batch management: add closed_at to student_enrollments ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_enrollments' AND column_name = 'batch_closed'
  ) THEN
    ALTER TABLE public.student_enrollments ADD COLUMN batch_closed boolean DEFAULT false;
  END IF;
END $$;

-- ── Assignments: add rubric_url for teacher rubric uploads ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'rubric_url'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN rubric_url text;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recording_library_course ON public.recording_library(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_student ON public.ai_tutor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON public.forum_posts(is_pinned) WHERE is_pinned = true;
