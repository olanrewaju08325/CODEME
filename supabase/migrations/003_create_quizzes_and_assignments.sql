-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (module_id)
);

-- Create assignment submissions table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_text TEXT NOT NULL, -- link or source code text
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (assignment_id, student_id)
);

-- Create quizzes table (one quiz per module)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (module_id)
);

-- Create quiz questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB, -- Array of string options, e.g. ["A", "B", "C", "D"]
    correct_answer TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    UNIQUE (quiz_id, order_index)
);

-- Create quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- e.g., 80 for 80%
    passed BOOLEAN NOT NULL,
    attempt_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create exam payment verifications table for retakes
CREATE TABLE IF NOT EXISTS public.exam_payment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    receipt_url TEXT NOT NULL, -- Supabase Storage link or text reference
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    amount NUMERIC NOT NULL DEFAULT 2000,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_code TEXT UNIQUE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Seed Assignments and Quizzes for the 6 Modules
DO $$
DECLARE
    m1 UUID; m2 UUID; m3 UUID; m4 UUID; m5 UUID; m6 UUID;
    q1 UUID; q2 UUID; q3 UUID; q4 UUID; q5 UUID; q6 UUID;
BEGIN
    -- Retrieve Module IDs
    SELECT id INTO m1 FROM public.modules WHERE course_id = 'wd101' AND order_index = 1;
    SELECT id INTO m2 FROM public.modules WHERE course_id = 'wd101' AND order_index = 2;
    SELECT id INTO m3 FROM public.modules WHERE course_id = 'wd101' AND order_index = 3;
    SELECT id INTO m4 FROM public.modules WHERE course_id = 'wd101' AND order_index = 4;
    SELECT id INTO m5 FROM public.modules WHERE course_id = 'wd101' AND order_index = 5;
    SELECT id INTO m6 FROM public.modules WHERE course_id = 'wd101' AND order_index = 6;

    -- Module 1 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m1, 'My First HTML Template', 'Create a standard HTML5 template page using `<!DOCTYPE html>`, `<html>`, `<head>`, `<title>`, and `<body>`. Add a heading stating "Welcome to CodeMe" and a short paragraph about yourself. Submit the code snippet or a GitHub link.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Module 2 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m2, 'Personal Biography Page', 'Write an HTML document structured with headings (`h1` - `h3`), paragraphs, and formatted text (`strong`, `em`). Create a hyperlink leading to your favorite programming resource.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Module 3 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m3, 'Student Registration Form Layout', 'Create an HTML form with `<label>` bindings, input fields for full name (`type="text"`), email (`type="email"`), password (`type="password"`), and a submit button. Integrate an image element at the top.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Module 4 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m4, 'Curriculum Roadmap Table & List', 'Design an HTML table listing courses, months, and programs. Below the table, write an unordered list containing core features of Frontend Web Development.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Module 5 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m5, 'Semantic Landmark Structure Page', 'Build a mock portfolio page outline utilizing semantic structures (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`). Add appropriate `alt` descriptions to all non-decorative components.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Module 6 Assignments
    INSERT INTO public.assignments (module_id, title, description) VALUES
    (m6, 'SEO Meta Tags Integration', 'Create an index.html file configured with proper SEO metadata in the `<head>` section, including dynamic description, viewport tag, and open-graph properties.')
    ON CONFLICT (module_id) DO NOTHING;

    -- Create Quizzes
    INSERT INTO public.quizzes (module_id, title) VALUES (m1, 'Getting Started Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q1;
    INSERT INTO public.quizzes (module_id, title) VALUES (m2, 'Text & Content Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q2;
    INSERT INTO public.quizzes (module_id, title) VALUES (m3, 'Forms & Multimedia Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q3;
    INSERT INTO public.quizzes (module_id, title) VALUES (m4, 'Advanced HTML Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q4;
    INSERT INTO public.quizzes (module_id, title) VALUES (m5, 'Accessibility & Semantic HTML Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q5;
    INSERT INTO public.quizzes (module_id, title) VALUES (m6, 'Modern HTML & SEO Test') ON CONFLICT (module_id) DO UPDATE SET title = EXCLUDED.title RETURNING id INTO q6;

    -- Quiz Questions 1
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q1, 'What does HTML stand for?', 'multiple_choice', '["Hyperlinks and Text Markup Language", "HyperText Markup Language", "Home Tool Markup Language", "HyperText Main Language"]', 'HyperText Markup Language', 1),
    (q1, 'Which HTML tag acts as the wrapper for all visible website contents?', 'multiple_choice', '["<head>", "<meta>", "<body>", "<html>"]', '<body>', 2),
    (q1, 'Is <!DOCTYPE html> considered a structural HTML tag?', 'true_false', '["True", "False"]', 'False', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;

    -- Quiz Questions 2
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q2, 'Which heading tag represents the highest importance level?', 'multiple_choice', '["<h6>", "<h1>", "<h4>", "<header>"]', '<h1>', 1),
    (q2, 'Which attribute designates the target URL destination inside an anchor element?', 'multiple_choice', '["src", "link", "href", "target"]', 'href', 2),
    (q2, 'Is <strong> an inline element?', 'true_false', '["True", "False"]', 'True', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;

    -- Quiz Questions 3
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q3, 'Which tag is used to display an image on a webpage?', 'multiple_choice', '["<picture>", "<img>", "<src>", "<image>"]', '<img>', 1),
    (q3, 'What is the correct input type attribute for entering passwords securely?', 'multiple_choice', '["type=\"secret\"", "type=\"password\"", "type=\"hide\"", "type=\"text\""]', 'type="password"', 2),
    (q3, 'Does the <img /> element require a closing tag?', 'true_false', '["True", "False"]', 'False', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;

    -- Quiz Questions 4
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q4, 'Which tag denotes a standard table cell data item?', 'multiple_choice', '["<th>", "<tr>", "<td>", "<tbl>"]', '<td>', 1),
    (q4, 'Which of the following is a block-level element?', 'multiple_choice', '["<span>", "<a>", "<strong>", "<div>"]', '<div>', 2),
    (q4, 'Do ordered lists (<ol>) automatically render sequential numbers next to list items?', 'true_false', '["True", "False"]', 'True', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;

    -- Quiz Questions 5
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q5, 'Which tag binds a label element to an input control?', 'multiple_choice', '["for", "id", "name", "bind"]', 'for', 1),
    (q5, 'Which semantic landmark element identifies critical, unique site contents?', 'multiple_choice', '["<section>", "<main>", "<article>", "<aside>"]', '<main>', 2),
    (q5, 'Is semantic HTML strictly required for browsers to render layout visuals?', 'true_false', '["True", "False"]', 'False', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;

    -- Quiz Questions 6
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
    (q6, 'Which tag represents a metadata element located inside the document head?', 'multiple_choice', '["<meta>", "<link>", "<style>", "All of the above"]', 'All of the above', 1),
    (q6, 'Which element introduces drawing interfaces rendering client scripting graphics?', 'multiple_choice', '["<draw>", "<svg>", "<canvas>", "<paint>"]', '<canvas>', 2),
    (q6, 'Does the meta description tag directly impact search engine indexing visibility?', 'true_false', '["True", "False"]', 'True', 3)
    ON CONFLICT (quiz_id, order_index) DO NOTHING;
END $$;
