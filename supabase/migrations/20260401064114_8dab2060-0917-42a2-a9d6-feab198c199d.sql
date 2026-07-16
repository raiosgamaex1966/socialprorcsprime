
CREATE TABLE public.watch_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  view_count INTEGER DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Watch videos viewable by authenticated"
  ON public.watch_videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload watch videos"
  ON public.watch_videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch videos"
  ON public.watch_videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch videos"
  ON public.watch_videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.watch_video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.watch_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

ALTER TABLE public.watch_video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Watch video likes viewable by authenticated"
  ON public.watch_video_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like watch videos"
  ON public.watch_video_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike watch videos"
  ON public.watch_video_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.watch_video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.watch_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.watch_video_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Watch video comments viewable by authenticated"
  ON public.watch_video_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can comment on watch videos"
  ON public.watch_video_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch comments"
  ON public.watch_video_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
