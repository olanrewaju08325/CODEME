-- Migration 018: Add pdf_url to lessons for downloadable notes

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN pdf_url TEXT;
  END IF;
END $$;
