-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (course_id, order_index)
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (module_id, order_index)
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    batch INTEGER NOT NULL CHECK (batch IN (1, 2)),
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, course_id)
);

-- Create progress tracking table
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Seed Courses
INSERT INTO public.courses (id, title, description, is_active) VALUES
('wd101', 'WD101: Introduction to HTML', 'Learn the foundation of web development. Build structure and semantics with HTML5.', TRUE),
('wd102', 'WD102: Styling with CSS', 'Style your web pages with layouts, colors, and responsive designs using CSS3.', FALSE),
('wd103', 'WD103: Programming with JavaScript', 'Bring web pages to life with client-side interactivity, logic, and APIs.', FALSE),
('wd201', 'WD201: Frontend React Framework', 'Build dynamic, component-based modern interfaces using React.', FALSE),
('git101', 'Git & GitHub Version Control', 'Manage source code version history and collaborate on software teams.', FALSE),
('py101', 'Python Programming Fundamentals', 'Learn basic syntax, control flow, functions, and OOP in Python.', FALSE),
('dj101', 'Django Backend Web Framework', 'Develop full-featured backends, databases, and APIs using Python and Django.', FALSE)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

-- Seed Modules for WD101 HTML
DO $$
DECLARE
    m1 UUID; m2 UUID; m3 UUID; m4 UUID; m5 UUID; m6 UUID;
BEGIN
    -- Insert modules and capture their IDs
    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Getting Started', 1)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m1;

    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Text & Content', 2)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m2;

    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Forms & Multimedia', 3)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m3;

    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Advanced HTML', 4)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m4;

    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Accessibility & Semantic HTML', 5)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m5;

    INSERT INTO public.modules (course_id, title, order_index)
    VALUES ('wd101', 'Modern HTML & SEO', 6)
    ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO m6;

    -- Module 1 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m1, 'Introduction to the World Wide Web', 'Welcome to CodeMe Academy! The World Wide Web is an information system where documents and other web resources are identified by Uniform Resource Locators (URLs), interlinked by hypertext links, and accessible over the Internet. HTML, which stands for HyperText Markup Language, is the standard markup language used to create web pages. It describes the structure of a web page semantically. In this lesson, we will cover how web browsers interpret HTML documents and display them to users.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
    (m1, 'Structure of an HTML Document', 'An HTML document is structured hierarchically. It begins with a doctype declaration `<!DOCTYPE html>` which tells the browser to parse it as HTML5. The entire page content is wrapped inside the `<html>` element. Inside, we have a `<head>` tag containing meta-information (like title, encoding, viewport configurations) and a `<body>` tag containing the visible page content. Here is a basic template: \n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n    <title>My First Webpage</title>\n</head>\n<body>\n    <h1>Hello CodeMe!</h1>\n</body>\n</html>\n```', NULL, 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;

    -- Module 2 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m2, 'Headings and Paragraphs', 'HTML uses headings to define sections. Headings range from `<h1>` (most important) to `<h6>` (least important). Search engines use headings to index the structure and content of your web pages, so it is important to use them correctly. Paragraphs are defined with the `<p>` tag. Browsers automatically add some space (margin) before and after a `<p>` element.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
    (m2, 'Text Formatting & Links', 'You can format text in HTML using inline tags. For example, `<strong>` defines important bold text, `<em>` defines emphasized italic text, and `<code>` defines a snippet of computer code. Hyperlinks are created using the anchor tag `<a>`. The `href` attribute specifies the URL of the page the link goes to: \n\n`<a href="https://codeme.ng">Visit CodeMe Academy</a>`', NULL, 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;

    -- Module 3 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m3, 'HTML Images and Video', 'To display images, use the `<img>` tag. The `src` attribute specifies the path to the image, and the `alt` attribute provides alternative text if the image cannot be displayed. For video, use the `<video>` element, which supports controls and source configurations: \n\n```html\n<img src="codeme.jpg" alt="CodeMe Logo" />\n<video width="320" height="240" controls>\n  <source src="movie.mp4" type="video/mp4">\n  Your browser does not support the video tag.\n</video>\n```', NULL, 1),
    (m3, 'Introduction to HTML Forms', 'HTML Forms are used to collect user input. The `<form>` element defines a container for different input elements like text fields, checkboxes, radio buttons, and submit buttons. The `<input>` tag is the most crucial, and its appearance depends on the `type` attribute (e.g., `type="text"`, `type="email"`, `type="password"`, `type="submit"`). A `<label>` tag provides a description for each field.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;

    -- Module 4 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m4, 'Lists & Tables', 'HTML supports ordered (`<ol>`) and unordered (`<ul>`) lists. Both use list items (`<li>`). Tables are defined with the `<table>` tag. They consist of table rows (`<tr>`), header cells (`<th>`), and standard data cells (`<td>`): \n\n```html\n<ul>\n  <li>HTML5</li>\n  <li>CSS3</li>\n</ul>\n```', NULL, 1),
    (m4, 'Block vs Inline Elements', 'Every HTML element has a default display value. Block-level elements always start on a new line and take up the full width available (e.g., `<div>`, `<p>`, `<h1>`, `<section>`). Inline elements do not start on a new line and only take up as much width as necessary (e.g., `<span>`, `<a>`, `<strong>`, `<img>`). Understanding this distinction is critical for structuring layouts.', NULL, 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;

    -- Module 5 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m5, 'Semantic Tags', 'Semantic HTML refers to tags that convey meaning to both the browser and the developer about what the content actually represents. Instead of generic `<div>` containers, modern HTML5 encourages using structural landmarks like `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, and `<footer>`. This greatly aids screen readers and crawler bots.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
    (m5, 'Accessibility Best Practices', 'Web Accessibility (a11y) ensures that people with disabilities can use your web app. Key practices include: always providing `alt` text for images, associating labels with form controls using the `for` attribute (or wrapping them), maintaining high color contrast, and using ARIA roles (`role="alert"`, `role="banner"`) when semantic elements are insufficient.', NULL, 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;

    -- Module 6 Lessons
    INSERT INTO public.lessons (module_id, title, content, video_url, order_index) VALUES
    (m6, 'HTML5 APIs & Canvas Intro', 'HTML5 introduced powerful APIs for drawing graphics, geolocation, drag-and-drop, and client-side data storage. The `<canvas>` element provides a resolution-dependent bitmap canvas which can be drawn onto using scripting (mostly JavaScript). For example, creating 2D graphs or basic game elements is done through the Canvas rendering context.', NULL, 1),
    (m6, 'Meta Tags and SEO Basics', 'Search Engine Optimization (SEO) begins with meta tags in the `<head>` of your HTML document. The primary tags are `<meta name="description" content="...">` and `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. Proper page titles and open-graph (OG) metadata tags also optimize how your links appear when shared on platforms like WhatsApp or LinkedIn.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2)
    ON CONFLICT (module_id, order_index) DO NOTHING;
END $$;
