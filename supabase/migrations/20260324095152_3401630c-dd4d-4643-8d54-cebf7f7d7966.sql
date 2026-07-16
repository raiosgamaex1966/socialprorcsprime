-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view posts
CREATE POLICY "Posts are viewable by authenticated users" ON public.posts FOR SELECT TO authenticated USING (true);
-- Users can create their own posts
CREATE POLICY "Users can create their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
CREATE POLICY "Post images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
CREATE POLICY "Users can delete their own post images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);