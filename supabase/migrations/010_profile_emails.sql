-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill emails for existing profiles
UPDATE public.profiles p 
SET email = u.email 
FROM auth.users u 
WHERE p.id = u.id;

-- Update the new user signup trigger to copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_student_id TEXT;
BEGIN
    IF new.email = 'codemeadmin2008@gmail.com' THEN
        INSERT INTO public.profiles (id, student_id, full_name, role, email)
        VALUES (new.id, NULL, 'CodeMe Admin', 'admin', new.email);
    ELSE
        new_student_id := 'CDM25' || lpad(nextval('public.student_id_seq')::text, 4, '0');
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
