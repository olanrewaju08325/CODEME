-- Migration 017: Batch Automation 
-- Automatically places newly created students into Batch 2 if Batch 1 is at capacity

CREATE OR REPLACE FUNCTION public.create_student_account(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_course_id TEXT
) RETURNS TEXT AS $$
DECLARE
    new_uid UUID;
    ret_student_id TEXT;
    max_cap INT;
    curr_b1 INT;
    target_batch INT;
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

    -- 3. Fetch the generated student_id
    SELECT student_id INTO ret_student_id FROM public.profiles WHERE id = new_uid;

    -- 4. Batch Automation Logic
    -- Get max batch capacity
    SELECT value::INT INTO max_cap FROM public.app_settings WHERE key = 'max_batch_size';
    IF max_cap IS NULL OR max_cap <= 0 THEN 
        max_cap := 50; -- Default fallback
    END IF;

    -- Count current students in batch 1
    SELECT count(*) INTO curr_b1 FROM public.student_enrollments WHERE batch = 1 AND status = 'enrolled';

    IF curr_b1 < max_cap THEN
        target_batch := 1;
    ELSE
        target_batch := 2;
    END IF;

    -- 5. Create enrollment record automatically in the determined batch
    INSERT INTO public.student_enrollments (student_id, course_id, batch, status)
    VALUES (new_uid, p_course_id, target_batch, 'enrolled');

    RETURN ret_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
