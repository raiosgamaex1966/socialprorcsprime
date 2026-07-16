
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view post videos" ON storage.objects;
CREATE POLICY "Anyone can view post videos" ON storage.objects FOR SELECT USING (bucket_id = 'post-videos');

DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload post videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-videos');

DROP POLICY IF EXISTS "Users can delete their own post videos" ON storage.objects;
CREATE POLICY "Users can delete their own post videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
