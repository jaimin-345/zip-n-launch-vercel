-- Insert APHA divisions for Open Shows (Open, Amateur, Youth with all levels)
CALL insert_division_data('open-show', 'Open', 1, ARRAY['All-Ages', 'Junior Horse (5 & Under)', 'Senior Horse (6 & Over)', '2-Year-Old', '3-Year-Old', 'Green Horse']);
CALL insert_division_data('open-show', 'Amateur', 2, ARRAY['Amateur (19 & Over)', 'Classic Amateur (19–44)', 'Masters Amateur (45 & Over)', 'Novice Amateur', 'Amateur Walk-Trot (19 & Over)', 'Masters Walk-Trot (45 & Over)', 'Classic Amateur Walk-Trot (19 -44)']);
CALL insert_division_data('open-show', 'Youth', 3, ARRAY['Youth 13 & Under', 'Youth 14–18', 'Novice Youth (18 & Under)', 'Youth Walk-Trot 5–10', 'Youth Walk-Trot 11–18', 'Youth 18 & Under', 'Youth Walk-Trot 18 & Under']);

-- Also update the disciplines to use the correct association_id
UPDATE disciplines SET association_id = 'open-show' WHERE association_id = 'Open Shows';