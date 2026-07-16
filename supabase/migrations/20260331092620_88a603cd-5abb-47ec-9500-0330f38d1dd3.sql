
-- Verified sellers table
CREATE TABLE public.verified_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  verification_type text NOT NULL DEFAULT 'auto',
  criteria_met jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.verified_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified sellers"
  ON public.verified_sellers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert verified sellers"
  ON public.verified_sellers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Listing reports table
CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(listing_id, reporter_id)
);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report listings"
  ON public.listing_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.listing_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);
