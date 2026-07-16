
-- Fraud signals table
CREATE TABLE public.listing_fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  UNIQUE(listing_id, signal_type)
);

ALTER TABLE public.listing_fraud_signals ENABLE ROW LEVEL SECURITY;

-- Anyone can view fraud signals (needed for buyer warnings)
CREATE POLICY "Fraud signals viewable by authenticated"
  ON public.listing_fraud_signals FOR SELECT
  TO authenticated USING (true);

-- Only system/service role inserts (via edge function), but allow authenticated for the edge function context
CREATE POLICY "System can insert fraud signals"
  ON public.listing_fraud_signals FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "System can update fraud signals"
  ON public.listing_fraud_signals FOR UPDATE
  TO authenticated USING (true);
