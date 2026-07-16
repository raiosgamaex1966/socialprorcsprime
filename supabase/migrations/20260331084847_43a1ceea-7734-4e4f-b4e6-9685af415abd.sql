
-- Create listing_offers table
CREATE TABLE public.listing_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;

-- Buyers can create offers
CREATE POLICY "Buyers can create offers" ON public.listing_offers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);

-- Buyers and sellers can view their offers
CREATE POLICY "Users can view their offers" ON public.listing_offers
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Sellers can update offer status (accept/reject)
CREATE POLICY "Sellers can update offers" ON public.listing_offers
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id);

-- Buyers can delete/withdraw their pending offers
CREATE POLICY "Buyers can withdraw pending offers" ON public.listing_offers
  FOR DELETE TO authenticated
  USING (auth.uid() = buyer_id AND status = 'pending');
