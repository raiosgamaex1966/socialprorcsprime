-- Add cover photo column to profiles
ALTER TABLE public.profiles ADD COLUMN cover_photo_url TEXT;

-- Create storage bucket for profile images (avatars + covers)
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile images
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
CREATE POLICY "Profile images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
CREATE POLICY "Users can upload their own profile images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
CREATE POLICY "Users can update their own profile images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
CREATE POLICY "Users can delete their own profile images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);