-- Add fields extracted from passport OCR scanning
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS issuing_country TEXT;
