
-- Promotion credits balance per user
CREATE TABLE public.promotion_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.promotion_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits" ON public.promotion_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" ON public.promotion_credits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON public.promotion_credits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Credit transaction log
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'spend',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their transactions" ON public.credit_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Promoted listings
CREATE TABLE public.promoted_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  credits_spent integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promoted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoted listings visible to all authenticated" ON public.promoted_listings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can promote their own listings" ON public.promoted_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their promotions" ON public.promoted_listings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Sponsored posts in the feed
CREATE TABLE public.sponsored_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  link_url text,
  credits_spent integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  target_category text,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsored posts visible to all authenticated" ON public.sponsored_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create sponsored posts" ON public.sponsored_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their sponsored posts" ON public.sponsored_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their sponsored posts" ON public.sponsored_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
