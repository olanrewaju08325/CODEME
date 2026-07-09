-- Migration 013: Add pricing, language, and role management features
-- Run this in your Supabase SQL editor

-- 1. Add price, currency, and language columns to courses table
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4;

-- 2. Make sure the enrollment status includes 'waitlisted' (should already exist)
-- If not, this adds it safely:
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid 
    WHERE pg_type.typname = 'enrollment_status' AND pg_enum.enumlabel = 'waitlisted'
  ) THEN
    -- status is TEXT, so no enum to alter; already handled
    NULL;
  END IF;
END $$;

-- 3. Allow admins to update any profile's role via RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Admin can update all profiles'
  ) THEN
    CREATE POLICY "Admin can update all profiles"
      ON public.profiles
      FOR UPDATE
      USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      );
  END IF;
END $$;

-- 4. Allow admins to insert new courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'Admin can manage courses'
  ) THEN
    CREATE POLICY "Admin can manage courses"
      ON public.courses
      FOR ALL
      USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'teacher')
      );
  END IF;
END $$;

-- 5. Update existing course data to set prices and languages per your spec
UPDATE public.courses SET 
  price = 25000, currency = 'NGN', language = 'English', level = 'Beginner', duration_weeks = 6
WHERE id = 'wd101';

UPDATE public.courses SET 
  price = 25000, currency = 'NGN', language = 'English', level = 'Beginner', duration_weeks = 6
WHERE id = 'css';

UPDATE public.courses SET 
  price = 30000, currency = 'NGN', language = 'English', level = 'Intermediate', duration_weeks = 8
WHERE id = 'js';

UPDATE public.courses SET 
  price = 35000, currency = 'NGN', language = 'English', level = 'Intermediate', duration_weeks = 10
WHERE id = 'react';

UPDATE public.courses SET 
  price = 20000, currency = 'NGN', language = 'English', level = 'Beginner', duration_weeks = 4
WHERE id = 'git';

UPDATE public.courses SET 
  price = 40000, currency = 'NGN', language = 'English', level = 'Intermediate', duration_weeks = 12
WHERE id = 'backend';

UPDATE public.courses SET 
  price = 60000, currency = 'NGN', language = 'English', level = 'Advanced', duration_weeks = 16
WHERE id = 'fullstack';

UPDATE public.courses SET 
  price = 35000, currency = 'NGN', language = 'English', level = 'Beginner', duration_weeks = 8
WHERE id = 'analytics';

UPDATE public.courses SET 
  price = 50000, currency = 'NGN', language = 'English', level = 'Advanced', duration_weeks = 12
WHERE id = 'science';

-- 6. Activate all courses (teachers will now manage content, not "coming soon")
UPDATE public.courses SET is_active = TRUE;
