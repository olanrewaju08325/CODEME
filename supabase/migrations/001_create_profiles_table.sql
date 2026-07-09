-- Create sequence for Student IDs starting at 250001
CREATE SEQUENCE IF NOT EXISTS public.student_id_seq START WITH 250001;

-- Create profiles table linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    student_id TEXT UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Handle user creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_student_id TEXT;
BEGIN
    IF new.email = 'codemeadmin2008@gmail.com' THEN
        INSERT INTO public.profiles (id, student_id, full_name, role)
        VALUES (new.id, NULL, 'CodeMe Admin', 'admin');
    ELSE
        new_student_id := 'CDM25' || lpad(nextval('public.student_id_seq')::text, 4, '0');
        INSERT INTO public.profiles (id, student_id, full_name, role)
        VALUES (
            new.id,
            new_student_id,
            coalesce(new.raw_user_meta_data->>'full_name', ''),
            'student'
        );
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
