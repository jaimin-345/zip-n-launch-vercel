-- Create a storage bucket for scoresheets
INSERT INTO storage.buckets (id, name, public)
VALUES ('scoresheets', 'scoresheets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Scoresheets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'scoresheets');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload scoresheets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scoresheets' AND auth.role() = 'authenticated');

-- Create policy for admins to manage scoresheets
CREATE POLICY "Admins can manage scoresheets"
ON storage.objects FOR ALL
USING (bucket_id = 'scoresheets' AND public.is_admin());