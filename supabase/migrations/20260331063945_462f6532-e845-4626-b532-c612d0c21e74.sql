-- Add image_urls column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[];

-- Create saved_listings table
CREATE TABLE IF NOT EXISTS public.saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved listings"
  ON public.saved_listings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save listings"
  ON public.saved_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave listings"
  ON public.saved_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);