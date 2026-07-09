-- Create app settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT INTO public.app_settings (key, value) VALUES ('max_batch_size', '25') ON CONFLICT DO NOTHING;

-- Create bug reports table
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    feedback TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Modify assignment submissions for files and AI checks
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS is_ai_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS submission_file TEXT;
ALTER TABLE public.assignment_submissions ALTER COLUMN submission_text DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies for App Settings
DROP POLICY IF EXISTS "Allow anyone to read settings" ON public.app_settings;
CREATE POLICY "Allow anyone to read settings" ON public.app_settings 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins to modify settings" ON public.app_settings;
CREATE POLICY "Allow admins to modify settings" ON public.app_settings 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
    );

-- Policies for Bug Reports
DROP POLICY IF EXISTS "Allow students to report bugs" ON public.bug_reports;
CREATE POLICY "Allow students to report bugs" ON public.bug_reports 
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow admins to read bug reports" ON public.bug_reports;
CREATE POLICY "Allow admins to read bug reports" ON public.bug_reports 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher'))
    );

-- RPC for Password Resets via Security Definer
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_email TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Verify executing user is admin/teacher
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher')) THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE email = target_email
    RETURNING id INTO user_id;
    
    IF user_id IS NOT NULL THEN
      RETURN TRUE;
    END IF;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
