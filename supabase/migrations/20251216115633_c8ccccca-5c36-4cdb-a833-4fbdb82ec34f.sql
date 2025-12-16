-- Add matching columns to tbl_pattern_media (same as tbl_scoresheet)
ALTER TABLE public.tbl_pattern_media 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS association_abbrev TEXT,
ADD COLUMN IF NOT EXISTS pattern_version TEXT,
ADD COLUMN IF NOT EXISTS discipline TEXT;

-- Create index on pattern_id for better query performance
CREATE INDEX IF NOT EXISTS idx_tbl_pattern_media_pattern_id ON public.tbl_pattern_media(pattern_id);

-- Create index on file_name for lookups
CREATE INDEX IF NOT EXISTS idx_tbl_pattern_media_file_name ON public.tbl_pattern_media(file_name);