-- Migration 021: Make HTML Fundamentals (wd101) Free

UPDATE public.courses
SET price = 0
WHERE id = 'wd101';
