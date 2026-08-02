-- Migration 024: Create announcements table
-- The previous 005_create_announcements.sql was a placeholder (0 bytes)

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    body TEXT,
    content TEXT,
    course_id TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'Anyone can view announcements') THEN
        CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'Teachers and admins can create announcements') THEN
        CREATE POLICY "Teachers and admins can create announcements" ON public.announcements FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'Teachers and admins can delete announcements') THEN
        CREATE POLICY "Teachers and admins can delete announcements" ON public.announcements FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
        );
    END IF;
END $$;

-- Add course_id column if it doesn't exist (for idempotency)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS course_id TEXT;
