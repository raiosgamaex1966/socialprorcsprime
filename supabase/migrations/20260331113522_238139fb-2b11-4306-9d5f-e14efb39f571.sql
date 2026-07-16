
-- Add targeting columns to sponsored_posts
ALTER TABLE public.sponsored_posts 
  ADD COLUMN IF NOT EXISTS target_location text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_gender text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_age_min integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_age_max integer DEFAULT NULL;

-- Add targeting columns to promoted_listings
ALTER TABLE public.promoted_listings
  ADD COLUMN IF NOT EXISTS target_category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_location text DEFAULT NULL;
