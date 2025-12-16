-- Enable RLS on tbl_scoresheet
ALTER TABLE public.tbl_scoresheet ENABLE ROW LEVEL SECURITY;

-- Update the file_url to use proper Supabase storage URL
UPDATE public.tbl_scoresheet 
SET file_url = 'https://akvmndheosffcgvxuxbr.supabase.co/storage/v1/object/public/scoresheets/WesternRiding0001.ALL.SS.AQHA.png',
    file_path = 'WesternRiding0001.ALL.SS.AQHA.png'
WHERE file_name = 'WesternRiding0001.ALL.SS.AQHA.png';