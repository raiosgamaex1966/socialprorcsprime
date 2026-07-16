-- Add live stream fields to watch_videos
ALTER TABLE public.watch_videos 
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_viewer_count integer NOT NULL DEFAULT 0;

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.watch_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public playlists" ON public.watch_playlists
  FOR SELECT TO authenticated USING (is_public OR user_id = auth.uid());

CREATE POLICY "Users can create playlists" ON public.watch_playlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their playlists" ON public.watch_playlists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their playlists" ON public.watch_playlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create playlist items table
CREATE TABLE IF NOT EXISTS public.watch_playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.watch_playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.watch_videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

ALTER TABLE public.watch_playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view playlist items" ON public.watch_playlist_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watch_playlists p WHERE p.id = playlist_id AND (p.is_public OR p.user_id = auth.uid()))
  );

CREATE POLICY "Playlist owners can add items" ON public.watch_playlist_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.watch_playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Playlist owners can remove items" ON public.watch_playlist_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watch_playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Playlist owners can reorder items" ON public.watch_playlist_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.watch_playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );

-- Saved videos table for Watch Later
CREATE TABLE IF NOT EXISTS public.watch_saved_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.watch_videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.watch_saved_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved videos" ON public.watch_saved_videos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can save videos" ON public.watch_saved_videos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave videos" ON public.watch_saved_videos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);