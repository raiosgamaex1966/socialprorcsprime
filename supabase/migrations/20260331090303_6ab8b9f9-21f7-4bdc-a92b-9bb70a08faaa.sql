
-- Create listing_views table for tracking views
CREATE TABLE public.listing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate views per session
CREATE UNIQUE INDEX listing_views_unique ON public.listing_views (listing_id, viewer_id);

-- Enable RLS
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own views
CREATE POLICY "Users can track their views" ON public.listing_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- Views readable by authenticated users (for aggregation)
CREATE POLICY "Views readable by authenticated" ON public.listing_views
  FOR SELECT TO authenticated
  USING (true);

-- Enable realtime for listing_views to keep counts fresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_views;
