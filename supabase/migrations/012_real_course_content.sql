-- 1. Reset mock/placeholder content tables
TRUNCATE public.forum_posts RESTART IDENTITY CASCADE;
TRUNCATE public.forum_replies RESTART IDENTITY CASCADE;
TRUNCATE public.bug_reports RESTART IDENTITY CASCADE;

-- 2. Seed courses
DELETE FROM public.courses;
INSERT INTO public.courses (id, title, description) VALUES
('wd101', 'WD101: Web Dev 101 — HTML', 'Foundational HTML programming course.'),
('css', 'CSS3: Responsive Web Layouts', 'Coming Soon'),
('js', 'JavaScript Essentials: Logic & DOM', 'Coming Soon'),
('react', 'React JS Framework: Single Page Apps', 'Coming Soon'),
('git', 'Git & GitHub Version Control', 'Coming Soon'),
('backend', 'Backend Logic with Python & Django', 'Coming Soon'),
('fullstack', 'Full Stack Engineering Capstone', 'Coming Soon'),
('analytics', 'Introduction to Data Analytics & SQL', 'Coming Soon'),
('science', 'Data Science & Machine Learning Basics', 'Coming Soon');

-- 3. Seed Modules for WD101 with real project scenarios
DELETE FROM public.modules;
INSERT INTO public.modules (id, course_id, title, order_index, project_scenario, project_instructions, project_solution) VALUES
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'wd101', 'Getting Started with HTML', 1, 
'Bloom & Petal Haven, a neighborhood flower and plant shop, wants to bring two of its bestselling indoor plants online: the Peace Lily and the Zanzibar Gem. Your task is to build a clean, simple webpage introducing both plants with a short description, a price, and a photo.',
'1. Create a new HTML file named index.html.
2. Start with the DOCTYPE declaration for HTML5, and wrap your entire page in <html> tags.
3. Build the <head> section: set the page <title> to "Indoor Plants".
4. Add a <meta> description with name="description" and content="Explore a variety of indoor plants for your home or office."
5. Set the character encoding to UTF-8 using <meta charset="UTF-8">.
6. In the <body>, add an <h1> titled "Indoor Plants".
7. Add an <h2> for "Peace Lily", followed by a <p> description ("The Peace Lily, known for its elegant white flowers, is a popular choice for indoor spaces.") and a <p> with the price ("Price: $15"), then an <img> with src and alt attributes.
8. Repeat the same pattern for "Zanzibar Gem" — description: "The Zanzibar Gem, with its glossy green foliage, is a low-maintenance indoor plant perfect for beginners."; price: "Price: $20".',
'<!DOCTYPE html>
<html>
<head>
  <title>Indoor Plants</title>
  <meta name="description" content="Explore a variety of indoor plants for your home or office.">
  <meta charset="UTF-8">
</head>
<body>
  <h1>Indoor Plants</h1>
  <h2>Peace Lily</h2>
  <p>The Peace Lily, known for its elegant white flowers, is a popular choice for indoor spaces.</p>
  <p>Price: $15</p>
  <img src="/spathiphyllum-peace-lily.jpg" alt="Peace Lily">
  <h2>Zanzibar Gem</h2>
  <p>The Zanzibar Gem, with its glossy green foliage, is a low-maintenance indoor plant perfect for beginners.</p>
  <p>Price: $20</p>
  <img src="/zamioculcas-zanzibar-gem.jpg" alt="Zanzibar Gem">
</body>
</html>'),

('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'wd101', 'Formatting Text and Organizing Data', 2,
'You''re helping build a content section for an educational website aimed at children. Your task is to organize different types of content using HTML lists — a section on animals, and a section on solar system planets ordered by distance from the sun.',
'1. Begin with the basic HTML5 structure: doctype, html, head, and body tags.
2. Create an unordered list (<ul>) of animal types: mammals, birds, and reptiles.
3. Create an ordered list (<ol>) of the planets, from closest to the sun to furthest.
4. Create a definition list (<dl>) explaining the terms "Ecosystem" and "Orbit."
5. Nest a small unordered list inside the planets list to show moons for Earth and Mars only.',
'<!DOCTYPE html>
<html>
<head>
  <title>Learning About Nature</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Animal Types</h1>
  <ul>
    <li>Mammals</li>
    <li>Birds</li>
    <li>Reptiles</li>
  </ul>
  <h1>Planets of the Solar System</h1>
  <ol>
    <li>Mercury</li>
    <li>Venus</li>
    <li>Earth
      <ul>
        <li>Moon</li>
      </ul>
    </li>
    <li>Mars
      <ul>
        <li>Phobos</li>
        <li>Deimos</li>
      </ul>
    </li>
    <li>Jupiter</li>
    <li>Saturn</li>
    <li>Uranus</li>
    <li>Neptune</li>
  </ol>
  <h1>Science Terms</h1>
  <dl>
    <dt>Ecosystem</dt>
    <dd>A community of living organisms interacting with their environment.</dd>
    <dt>Orbit</dt>
    <dd>The curved path an object in space follows around another object.</dd>
  </dl>
</body>
</html>'),

('bf85c96b-3f41-4c6e-8b1b-cd15db280203', 'wd101', 'Visual & Interactive Elements', 3,
'Build a complete responsive plant shop orders landing page using forms, inputs, image cards, and media sources.',
'1. Implement a complete <form> structure.
2. Embed audio and video elements previewing plant care.
3. Incorporate submit actions.',
'<!-- Solution goes here -->'),

('bf85c96b-3f41-4c6e-8b1b-cd15db280204', 'wd101', 'Enhancing Web Presentation', 4,
'Apply basic CSS stylesheets, layout rules, and classes to visually arrange pages.',
'1. Add linked styling.
2. Arrange document structure.',
'<!-- Solution goes here -->'),

('bf85c96b-3f41-4c6e-8b1b-cd15db280205', 'wd101', 'Optimized & Accessible Web Content', 5,
'Structure code using ARIA landmarks and roles to conform with accessibility requirements.',
'1. Add labels and titles.
2. Build semantic main content frames.',
'<!-- Solution goes here -->'),

('bf85c96b-3f41-4c6e-8b1b-cd15db280206', 'wd101', 'HTML Beyond Basics', 6,
'Integrate advanced components: image mapping, inline frames (iframes), and web APIs.',
'1. Implement index configurations.
2. Build sandboxed view frame displays.',
'<!-- Solution goes here -->');

-- 4. Seed Lessons
DELETE FROM public.lessons;
INSERT INTO public.lessons (module_id, title, content, order_index) VALUES
-- Module 1 Lessons
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'A Brief History of HTML', 'HTML began in 1989 at CERN, where Sir Tim Berners-Lee needed an easier way for scientists to share research across different computers. His solution became HyperText Markup Language — HTML. The very first web page was plain text and hyperlinks. HTML 1.0 arrived in 1993. HTML 2 (1995) added tables/images. HTML 3 & 4 (1997) added stylesheets/scripts. HTML5 (2014) brought semantic tags and native media.', 1),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Setting Up Your HTML Development Environment', 'HTML doesn''t need installation. You only need a code editor (like VS Code) and a web browser (like Chrome/Firefox). Create a folder WD101-Projects/Module-1. Inside, create index.html with starter markup, save, and double-click to view.', 2),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Understanding Character Encoding', 'Computers read binary (1s and 0s). Encoding maps symbols to numbers. ASCII is limited to 128 English characters. Unicode handles all world languages. UTF-8 is the default standard for HTML5. Declare this inside the head block: <meta charset="UTF-8">.', 3),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'HTML Syntax Essentials', 'Every HTML page begins with <!DOCTYPE html>. Tags are bracket markers like <p> (open) and </p> (close). Elements comprise tags plus content. Block-level elements (div, p, h1) take full width and start on new lines. Inline elements (span, a, img) sit side-by-side.', 4),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Document Structure — html, head, and body', '<html> wraps the entire document. <head> handles hidden configuration metadata (title, charset, viewport). <body> contains visible elements visitors actually view (headings, paragraphs, images).', 5),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'How HTML, CSS, and JavaScript Work Together', 'HTML is the structure. CSS defines design, colors, and layout presentation. JavaScript creates dynamic behavior and interactivity. The browser parses these into a tree structure called the Document Object Model (DOM).', 6),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Attributes and Values', 'Attributes modify tags, defined as name="value" inside the opening tag (e.g. src and alt on img elements). Global attributes (id, class) apply widely, while element-specific attributes (href, type) apply to single tags.', 7),
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'HTML in the Age of AI', 'While AI writes code instantly, learning HTML manually enables developers to troubleshoot generation errors, inspect structures, customize tags, and instruct AI tools effectively.', 8),

-- Module 2 Lessons
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Headings and Page Structure', 'Headings define hierarchy from <h1> (highest) to <h6> (lowest). Proper heading structures are essential for web screen readers (accessibility) and SEO indexing search engine bots.', 1),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Paragraphs and Inline Text Formatting', 'Paragraphs use <p> tags. Inline tags format specific terms: <strong> (bold), <em> (italics), <u> (underline), <sup>/<sub> (superscripts/subscripts), <del> (strikethrough), and <mark> (highlighting).', 2),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Quotations — q, blockquote, cite, and footer', 'Use <q> for short inline quotations. Use <blockquote> for longer block quotations. Source references and attributions are wrapped inside <cite> and <footer> tags.', 3),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Line Breaks and Horizontal Rules', 'The self-closing <br> tag inserts line breaks without paragraph spacings. The <hr> tag draws horizontal dividers to visually split articles.', 4),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Computer Code and Preformatted Text', '<code> prints inline monospaced syntax. <pre> preserves all spacings and line wraps exactly. <kbd> displays keystroke shortcuts, and <samp> logs program console outputs.', 5),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'HTML Lists', 'Unordered lists (<ul>) wrap random bullet items. Ordered lists (<ol>) create sequenced items. Definition lists (<dl>) map terms (<dt>) to definitions (<dd>).', 6),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Tables for Structured Data', 'Tables display schedules, pricing grids, and grid lists. Constructed from <table>, <tr> (rows), <th> (header cells), and <td> (value cells). CAPTION describes the table.', 7),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Semantic Markup, Accessibility & SEO', 'Semantic elements (main, header, footer, article) indicate content meaning to browsers, rather than generic <div> wrappers, greatly boosting SEO indexing scores.', 8),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Best Practices for Content Layout', 'Use exactly one h1 title, maintain nested order index structures (do not skip heading levels), write concise paragraph segments, and wrap listings inside list tags.', 9);

-- 5. Seed Quizzes
DELETE FROM public.quizzes;
INSERT INTO public.quizzes (id, module_id, title) VALUES
('bf85c96b-3f41-4c6e-8b1b-cd15db280301', 'bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Getting Started Test'),
('bf85c96b-3f41-4c6e-8b1b-cd15db280302', 'bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Text & Content Test'),
('bf85c96b-3f41-4c6e-8b1b-cd15db280303', 'bf85c96b-3f41-4c6e-8b1b-cd15db280203', 'Forms & Multimedia Test');

-- 6. Seed Quiz Questions
DELETE FROM public.quiz_questions;
INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_answer, order_index) VALUES
-- Quiz 1 Questions
('bf85c96b-3f41-4c6e-8b1b-cd15db280301', 'What does HTML stand for?', 'multiple_choice', '["Hyperlinks and Text Markup Language", "HyperText Markup Language", "Home Tool Markup Language", "HyperText Main Language"]', 'HyperText Markup Language', 1),
('bf85c96b-3f41-4c6e-8b1b-cd15db280301', 'Which HTML tag acts as the wrapper for all visible website contents?', 'multiple_choice', '["<head>", "<meta>", "<body>", "<html>"]', '<body>', 2),
('bf85c96b-3f41-4c6e-8b1b-cd15db280301', 'Is <!DOCTYPE html> considered a structural HTML tag?', 'true_false', '["True", "False"]', 'False', 3),

-- Quiz 2 Questions
('bf85c96b-3f41-4c6e-8b1b-cd15db280302', 'Which heading tag represents the highest importance level?', 'multiple_choice', '["<h6>", "<h1>", "<h4>", "<header>"]', '<h1>', 1),
('bf85c96b-3f41-4c6e-8b1b-cd15db280302', 'Which attribute designates the target URL destination inside an anchor element?', 'multiple_choice', '["src", "link", "href", "target"]', 'href', 2),
('bf85c96b-3f41-4c6e-8b1b-cd15db280302', 'Is <strong> an inline element?', 'true_false', '["True", "False"]', 'True', 3),

-- Quiz 3 Questions
('bf85c96b-3f41-4c6e-8b1b-cd15db280303', 'Which tag is used to display an image on a webpage?', 'multiple_choice', '["<picture>", "<img>", "<src>", "<image>"]', '<img>', 1),
('bf85c96b-3f41-4c6e-8b1b-cd15db280303', 'What is the correct input type attribute for entering passwords securely?', 'multiple_choice', '["type=\"secret\"", "type=\"password\"", "type=\"hide\"", "type=\"text\""]', 'type="password"', 2),
('bf85c96b-3f41-4c6e-8b1b-cd15db280303', 'Does the <img /> element require a closing tag?', 'true_false', '["True", "False"]', 'False', 3);

-- 7. Seed Assignments
DELETE FROM public.assignments;
INSERT INTO public.assignments (module_id, title, description) VALUES
('bf85c96b-3f41-4c6e-8b1b-cd15db280201', 'Build Your Own "About Me" Page', 'Create a new file named about-me.html. Include HTML5 doctype declaration, a head section with title and charset, an h1 with your name, h2 titled "About Me" and "My Hobbies" with details, and an img with alt text. Submit the .html file upload here.'),
('bf85c96b-3f41-4c6e-8b1b-cd15db280202', 'Crafting a Tech Blog Post', 'Write a tech blog post about code guidelines. Use inline quotes (<q>), blockquote with cite attribution, horizontal lines (<hr>), computer code formatting (<code>, <pre>), and user console outputs (<kbd>, <samp>).');
