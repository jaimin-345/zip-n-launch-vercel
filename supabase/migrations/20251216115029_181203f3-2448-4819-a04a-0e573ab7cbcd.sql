-- Update the file_url to use the local public path
UPDATE public.tbl_scoresheet 
SET file_url = '/scoresheets/WesternRiding0001.ALL.SS.AQHA.png'
WHERE file_name = 'WesternRiding0001.ALL.SS.AQHA.png';