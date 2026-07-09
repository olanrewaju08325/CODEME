-- Drop old constraints and alter column batch to allow null for waitlist
ALTER TABLE public.student_enrollments ALTER COLUMN batch DROP NOT NULL;

ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_batch_check;
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_status_check;

ALTER TABLE public.student_enrollments ADD CONSTRAINT student_enrollments_status_check 
    CHECK (status IN ('enrolled', 'waitlisted', 'completed'));
