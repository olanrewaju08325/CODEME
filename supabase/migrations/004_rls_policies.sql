-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" 
        ON public.profiles FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Admins can do everything on profiles'
    ) THEN
        CREATE POLICY "Admins can do everything on profiles" 
        ON public.profiles FOR ALL 
        USING (public.is_admin());
    END IF;
END $$;

-- COURSES POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'courses' 
        AND policyname = 'Courses are viewable by everyone'
    ) THEN
        CREATE POLICY "Courses are viewable by everyone" 
        ON public.courses FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'courses' 
        AND policyname = 'Admins/Teachers can edit courses'
    ) THEN
        CREATE POLICY "Admins/Teachers can edit courses" 
        ON public.courses FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- MODULES POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'modules' 
        AND policyname = 'Modules are viewable by everyone'
    ) THEN
        CREATE POLICY "Modules are viewable by everyone" 
        ON public.modules FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'modules' 
        AND policyname = 'Admins/Teachers can edit modules'
    ) THEN
        CREATE POLICY "Admins/Teachers can edit modules" 
        ON public.modules FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- LESSONS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lessons' 
        AND policyname = 'Lessons are viewable by everyone'
    ) THEN
        CREATE POLICY "Lessons are viewable by everyone" 
        ON public.lessons FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lessons' 
        AND policyname = 'Admins/Teachers can edit lessons'
    ) THEN
        CREATE POLICY "Admins/Teachers can edit lessons" 
        ON public.lessons FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- ENROLLMENTS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_enrollments' 
        AND policyname = 'Users can view their own enrollment'
    ) THEN
        CREATE POLICY "Users can view their own enrollment" 
        ON public.student_enrollments FOR SELECT 
        USING (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_enrollments' 
        AND policyname = 'Users can self-enroll'
    ) THEN
        CREATE POLICY "Users can self-enroll" 
        ON public.student_enrollments FOR INSERT 
        WITH CHECK (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_enrollments' 
        AND policyname = 'Admins/Teachers can manage enrollments'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage enrollments" 
        ON public.student_enrollments FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- PROGRESS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_progress' 
        AND policyname = 'Users can view their own progress'
    ) THEN
        CREATE POLICY "Users can view their own progress" 
        ON public.student_progress FOR SELECT 
        USING (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_progress' 
        AND policyname = 'Users can report their own progress'
    ) THEN
        CREATE POLICY "Users can report their own progress" 
        ON public.student_progress FOR INSERT 
        WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_progress' 
        AND policyname = 'Users can update their own progress'
    ) THEN
        CREATE POLICY "Users can update their own progress" 
        ON public.student_progress FOR UPDATE 
        USING (auth.uid() = student_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'student_progress' 
        AND policyname = 'Admins/Teachers can manage progress'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage progress" 
        ON public.student_progress FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- ASSIGNMENTS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'assignments' 
        AND policyname = 'Assignments are viewable by everyone'
    ) THEN
        CREATE POLICY "Assignments are viewable by everyone" 
        ON public.assignments FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'assignments' 
        AND policyname = 'Admins/Teachers can manage assignments'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage assignments" 
        ON public.assignments FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- ASSIGNMENT SUBMISSIONS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'assignment_submissions' 
        AND policyname = 'Users can view their own submissions'
    ) THEN
        CREATE POLICY "Users can view their own submissions" 
        ON public.assignment_submissions FOR SELECT 
        USING (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'assignment_submissions' 
        AND policyname = 'Users can submit their own assignments'
    ) THEN
        CREATE POLICY "Users can submit their own assignments" 
        ON public.assignment_submissions FOR INSERT 
        WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'assignment_submissions' 
        AND policyname = 'Users can update their own pending submissions'
    ) THEN
        CREATE POLICY "Users can update their own pending submissions" 
        ON public.assignment_submissions FOR UPDATE 
        USING (auth.uid() = student_id OR public.is_teacher())
        WITH CHECK (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

-- QUIZZES & QUESTIONS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quizzes' 
        AND policyname = 'Quizzes are viewable by everyone'
    ) THEN
        CREATE POLICY "Quizzes are viewable by everyone" 
        ON public.quizzes FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quizzes' 
        AND policyname = 'Admins/Teachers can manage quizzes'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage quizzes" 
        ON public.quizzes FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quiz_questions' 
        AND policyname = 'Quiz questions are viewable by everyone'
    ) THEN
        CREATE POLICY "Quiz questions are viewable by everyone" 
        ON public.quiz_questions FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quiz_questions' 
        AND policyname = 'Admins/Teachers can manage quiz questions'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage quiz questions" 
        ON public.quiz_questions FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- QUIZ ATTEMPTS POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quiz_attempts' 
        AND policyname = 'Users can view their own quiz attempts'
    ) THEN
        CREATE POLICY "Users can view their own quiz attempts" 
        ON public.quiz_attempts FOR SELECT 
        USING (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'quiz_attempts' 
        AND policyname = 'Users can record their own quiz attempts'
    ) THEN
        CREATE POLICY "Users can record their own quiz attempts" 
        ON public.quiz_attempts FOR INSERT 
        WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

-- PAYMENT VERIFICATION POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'exam_payment_verifications' 
        AND policyname = 'Users can view their own payment verifications'
    ) THEN
        CREATE POLICY "Users can view their own payment verifications" 
        ON public.exam_payment_verifications FOR SELECT 
        USING (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'exam_payment_verifications' 
        AND policyname = 'Users can request exam payments'
    ) THEN
        CREATE POLICY "Users can request exam payments" 
        ON public.exam_payment_verifications FOR INSERT 
        WITH CHECK (auth.uid() = student_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'exam_payment_verifications' 
        AND policyname = 'Admins/Teachers can manage payment verifications'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage payment verifications" 
        ON public.exam_payment_verifications FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

-- CERTIFICATE POLICIES
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'certificates' 
        AND policyname = 'Certificates are publicly viewable'
    ) THEN
        CREATE POLICY "Certificates are publicly viewable" 
        ON public.certificates FOR SELECT 
        USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'certificates' 
        AND policyname = 'Admins/Teachers can manage certificates'
    ) THEN
        CREATE POLICY "Admins/Teachers can manage certificates" 
        ON public.certificates FOR ALL 
        USING (public.is_teacher());
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'certificates' 
        AND policyname = 'Users can insert certificates if they completed the requirements'
    ) THEN
        CREATE POLICY "Users can insert certificates if they completed the requirements"
        ON public.certificates FOR INSERT
        WITH CHECK (auth.uid() = student_id OR public.is_teacher());
    END IF;
END $$;