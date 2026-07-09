-- 1. Fix trigger handle_new_user trigger pad bug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_student_id TEXT;
BEGIN
    IF new.email = 'codemeadmin2008@gmail.com' THEN
        INSERT INTO public.profiles (id, student_id, full_name, role, email)
        VALUES (new.id, NULL, 'CodeMe Admin', 'admin', new.email);
    ELSE
        -- No LPAD truncation of sequence, allowing unlimited safe incremental registrations
        new_student_id := 'CDM25' || nextval('public.student_id_seq')::text;
        INSERT INTO public.profiles (id, student_id, full_name, role, email)
        VALUES (
            new.id,
            new_student_id,
            coalesce(new.raw_user_meta_data->>'full_name', ''),
            'student',
            new.email
        );
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create course teachers linkage table for delegation
CREATE TABLE IF NOT EXISTS public.course_teachers (
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, teacher_id)
);
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anyone to read course teachers" ON public.course_teachers;
CREATE POLICY "Allow anyone to read course teachers" ON public.course_teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins to edit course teachers" ON public.course_teachers;
CREATE POLICY "Allow admins to edit course teachers" ON public.course_teachers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Add dynamic project scenario columns to modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS project_scenario TEXT;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS project_instructions TEXT;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS project_solution TEXT;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- 4. Setup auto moderation status for forum posts
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'held'));

DROP POLICY IF EXISTS "Everyone can view posts" ON public.forum_posts;
CREATE POLICY "Everyone can view posts" ON public.forum_posts 
    FOR SELECT USING (
        status = 'approved' OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
    );

DROP POLICY IF EXISTS "Allow admins/teachers to delete posts" ON public.forum_posts;
CREATE POLICY "Allow admins/teachers to delete posts" ON public.forum_posts 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
    );

DROP POLICY IF EXISTS "Allow admins/teachers to delete replies" ON public.forum_replies;
CREATE POLICY "Allow admins/teachers to delete replies" ON public.forum_replies 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
    );

-- 5. Supabase Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects
DROP POLICY IF EXISTS "Allow public read of avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated inserts to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of assignments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated inserts to assignments" ON storage.objects;

CREATE POLICY "Allow public read of avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated inserts to avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read of assignments" ON storage.objects
    FOR SELECT USING (bucket_id = 'assignments');

CREATE POLICY "Allow authenticated inserts to assignments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'assignments' AND auth.role() = 'authenticated');
