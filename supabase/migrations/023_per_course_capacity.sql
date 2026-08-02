-- Migration 023: Per-course batch capacity
-- Replaces the single generic max_batch_size setting with per-course capacity config

-- 1. Add capacity columns to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS whatsapp_group_cap INTEGER NOT NULL DEFAULT 40,
ADD COLUMN IF NOT EXISTS platform_access_cap INTEGER NOT NULL DEFAULT 40,
ADD COLUMN IF NOT EXISTS total_batches INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS single_batch_only BOOLEAN NOT NULL DEFAULT false;

-- 2. Seed/update the five confirmed programs with correct capacities
-- HTML (WD101): 40 per batch, 2 batches
UPDATE public.courses SET
  whatsapp_group_cap = 40,
  platform_access_cap = 40,
  total_batches = 2,
  single_batch_only = false
WHERE id = 'wd101';

-- CSS: 35 WhatsApp, 30 platform, 2 batches
UPDATE public.courses SET
  whatsapp_group_cap = 35,
  platform_access_cap = 30,
  total_batches = 2,
  single_batch_only = false
WHERE id = 'css';

-- Backend Development: 30 total, 1 batch, single-batch-only
UPDATE public.courses SET
  whatsapp_group_cap = 30,
  platform_access_cap = 30,
  total_batches = 1,
  single_batch_only = true
WHERE id = 'backend';

-- Data Science: 30 total, 1 batch, single-batch-only
UPDATE public.courses SET
  whatsapp_group_cap = 30,
  platform_access_cap = 30,
  total_batches = 1,
  single_batch_only = true
WHERE id = 'science';

-- Data Analytics: 30 total, 1 batch, single-batch-only
UPDATE public.courses SET
  whatsapp_group_cap = 30,
  platform_access_cap = 30,
  total_batches = 1,
  single_batch_only = true
WHERE id = 'analytics';

-- Other courses get defaults (40/40/2/false)

-- 3. Update the StudentEnrollment table: add a platform_access column
-- to track CSS's special rule (enrolled in WhatsApp group but waiting for platform)
ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS has_platform_access BOOLEAN NOT NULL DEFAULT true;

-- 4. Create an index for fast capacity counting
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_batch_status
ON public.student_enrollments (course_id, batch, status);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_platform
ON public.student_enrollments (course_id, has_platform_access, status);

-- 5. Create a helper function to get course capacity info
CREATE OR REPLACE FUNCTION public.get_course_capacity_info(p_course_id TEXT)
RETURNS TABLE(
  course_id TEXT,
  whatsapp_group_cap INTEGER,
  platform_access_cap INTEGER,
  total_batches INTEGER,
  single_batch_only BOOLEAN,
  enrolled_count INTEGER,
  platform_access_count INTEGER,
  whatsapp_count INTEGER,
  waitlist_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.whatsapp_group_cap,
    c.platform_access_cap,
    c.total_batches,
    c.single_batch_only,
    (SELECT COUNT(*)::INTEGER FROM public.student_enrollments se WHERE se.course_id = c.id AND se.status = 'enrolled'),
    (SELECT COUNT(*)::INTEGER FROM public.student_enrollments se WHERE se.course_id = c.id AND se.status = 'enrolled' AND se.has_platform_access = true),
    (SELECT COUNT(*)::INTEGER FROM public.student_enrollments se WHERE se.course_id = c.id AND se.status = 'enrolled'),
    (SELECT COUNT(*)::INTEGER FROM public.student_enrollments se WHERE se.course_id = c.id AND se.status = 'waitlisted')
  FROM public.courses c
  WHERE c.id = p_course_id;
END;
$$ LANGUAGE plpgsql STABLE;
