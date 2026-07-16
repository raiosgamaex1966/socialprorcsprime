
-- Create price history table
CREATE TABLE public.listing_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view price history
CREATE POLICY "Price history viewable by authenticated"
  ON public.listing_price_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only the system (via trigger) inserts, but allow listing owner to insert
CREATE POLICY "Listing owners can insert price history"
  ON public.listing_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_price_history.listing_id
        AND listings.user_id = auth.uid()
    )
  );

-- Create trigger to log price changes
CREATE OR REPLACE FUNCTION public.log_listing_price_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Log initial price on insert
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.listing_price_history (listing_id, price, changed_at)
    VALUES (NEW.id, NEW.price, NEW.created_at);
    RETURN NEW;
  END IF;

  -- Log price change on update
  IF TG_OP = 'UPDATE' AND OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.listing_price_history (listing_id, price)
    VALUES (NEW.id, NEW.price);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER listing_price_change_trigger
  AFTER INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_listing_price_change();

-- Backfill existing listings with their current price
INSERT INTO public.listing_price_history (listing_id, price, changed_at)
SELECT id, price, created_at FROM public.listings;
