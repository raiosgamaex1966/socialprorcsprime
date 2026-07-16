
-- Table for hiding specific posts from feed
CREATE TABLE public.hidden_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'post',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, post_type)
);
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can hide posts" ON public.hidden_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unhide posts" ON public.hidden_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their hidden posts" ON public.hidden_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Table for snoozing users (30-day mute)
CREATE TABLE public.snoozed_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snoozed_user_id UUID NOT NULL,
  snoozed_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, snoozed_user_id)
);
ALTER TABLE public.snoozed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can snooze others" ON public.snoozed_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsnooze" ON public.snoozed_users FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their snoozes" ON public.snoozed_users FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Table for feed interest signals (interested / not interested)
CREATE TABLE public.post_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'post',
  interested BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, post_type)
);
ALTER TABLE public.post_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can mark interest" ON public.post_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update interest" ON public.post_interests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can remove interest" ON public.post_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their interests" ON public.post_interests FOR SELECT TO authenticated USING (auth.uid() = user_id);
