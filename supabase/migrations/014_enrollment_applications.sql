-- Migration 014: Enrollment Applications & Custom Student Account Creation RPC

-- Enable pgcrypto extension for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create enrollment applications table
CREATE TABLE IF NOT EXISTS public.enrollment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.enrollment_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enrollment applications
CREATE POLICY "Anyone can submit applications" 
    ON public.enrollment_applications FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Admins/Teachers can view applications" 
    ON public.enrollment_applications FOR SELECT 
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
    );

CREATE POLICY "Admins/Teachers can update applications" 
    ON public.enrollment_applications FOR UPDATE 
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
    );

-- 2. Security Definer Function to create auth user & profile from the admin panel safely
CREATE OR REPLACE FUNCTION public.create_student_account(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_course_id TEXT
) RETURNS TEXT AS $$
DECLARE
    new_uid UUID;
    ret_student_id TEXT;
BEGIN
    -- 1. Check if email already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered.';
    END IF;

    -- 2. Insert into auth.users (Supabase Auth table)
    INSERT INTO auth.users (
        id, 
        instance_id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        is_super_admin, 
        role, 
        created_at, 
        updated_at,
        aud
    )
    VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', p_full_name),
        false,
        'authenticated',
        now(),
        now(),
        'authenticated'
    )
    RETURNING id INTO new_uid;

    -- Note: The database trigger handle_new_user() runs automatically AFTER INSERT on auth.users.
    -- It generates the student_id prefix (e.g., 'CDM25' || sequence value) inside public.profiles.

    -- 3. Fetch the generated student_id
    SELECT student_id INTO ret_student_id FROM public.profiles WHERE id = new_uid;

    -- 4. Create enrollment record automatically
    INSERT INTO public.student_enrollments (student_id, course_id, batch, status)
    VALUES (new_uid, p_course_id, 1, 'enrolled');

    RETURN ret_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
