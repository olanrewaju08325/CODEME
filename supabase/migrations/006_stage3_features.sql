-- Add streak tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date DATE DEFAULT CURRENT_DATE;

-- Create student badges table
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_name TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, badge_name)
);

-- Create forum posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create forum replies table
CREATE TABLE IF NOT EXISTS public.forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Dynamic Triggers for automated notification delivery
CREATE OR REPLACE FUNCTION public.notify_assignment_graded()
RETURNS trigger AS $$
BEGIN
    IF old.status IS DISTINCT FROM new.status AND new.status IN ('approved', 'rejected') THEN
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
            new.student_id,
            'Assignment Graded',
            'Your assignment submission has been ' || new.status || '.'
        );
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_assignment_graded
    AFTER UPDATE ON public.assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_graded();

CREATE OR REPLACE FUNCTION public.notify_payment_reviewed()
RETURNS trigger AS $$
BEGIN
    IF old.status IS DISTINCT FROM new.status AND new.status IN ('approved', 'rejected') THEN
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
            new.student_id,
            'Payment Reviewed',
            'Your exam retake payment receipt has been ' || new.status || '.'
        );
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_payment_reviewed
    AFTER UPDATE ON public.exam_payment_verifications
    FOR EACH ROW EXECUTE FUNCTION public.notify_payment_reviewed();

-- RLS Policies
-- BADGES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_badges' AND policyname = 'Everyone can view earned badges') THEN
        CREATE POLICY "Everyone can view earned badges" ON public.student_badges FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_badges' AND policyname = 'System/Users can insert achievements') THEN
        CREATE POLICY "System/Users can insert achievements" ON public.student_badges FOR INSERT WITH CHECK (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

-- FORUM POSTS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'Everyone can view posts') THEN
        CREATE POLICY "Everyone can view posts" ON public.forum_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'Authenticated users can post') THEN
        CREATE POLICY "Authenticated users can post" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- FORUM REPLIES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_replies' AND policyname = 'Everyone can view replies') THEN
        CREATE POLICY "Everyone can view replies" ON public.forum_replies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_replies' AND policyname = 'Authenticated users can reply') THEN
        CREATE POLICY "Authenticated users can reply" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- NOTIFICATIONS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their notifications') THEN
        CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'System/Admins can write notifications') THEN
        CREATE POLICY "System/Admins can write notifications" ON public.notifications FOR INSERT WITH CHECK (true);
    END IF;
END $$;
