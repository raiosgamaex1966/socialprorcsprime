
-- Create seller_reviews table
CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, seller_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews viewable by authenticated"
  ON public.seller_reviews FOR SELECT TO authenticated
  USING (true);

-- Users can create reviews if they messaged the seller (have a conversation)
CREATE POLICY "Users can create reviews"
  ON public.seller_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND seller_id != reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.is_group = false
      AND (
        (c.participant_one = auth.uid() AND c.participant_two = seller_id)
        OR (c.participant_one = seller_id AND c.participant_two = auth.uid())
      )
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their reviews"
  ON public.seller_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their reviews"
  ON public.seller_reviews FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id);
