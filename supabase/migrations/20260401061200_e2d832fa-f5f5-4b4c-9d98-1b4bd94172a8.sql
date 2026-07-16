
-- Create reels table
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text DEFAULT '',
  duration integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reels viewable by authenticated" ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own reels" ON public.reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reels" ON public.reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reels" ON public.reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create reel_likes table
CREATE TABLE public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reel likes viewable by authenticated" ON public.reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create reel_comments table
CREATE TABLE public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reel comments viewable by authenticated" ON public.reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment on reels" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reel comments" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket for reel videos
INSERT INTO storage.buckets (id, name, public) VALUES ('reel-videos', 'reel-videos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for reel-videos bucket
DROP POLICY IF EXISTS "Anyone can view reel videos" ON storage.objects;
CREATE POLICY "Anyone can view reel videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reel-videos');

DROP POLICY IF EXISTS "Users can upload reel videos" ON storage.objects;
CREATE POLICY "Users can upload reel videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reel-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their reel videos" ON storage.objects;
CREATE POLICY "Users can delete their reel videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reel-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
