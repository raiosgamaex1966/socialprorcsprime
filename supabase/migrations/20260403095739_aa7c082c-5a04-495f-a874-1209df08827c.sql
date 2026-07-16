
CREATE TABLE public.post_notification_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscriptions"
ON public.post_notification_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can subscribe to posts"
ON public.post_notification_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe from posts"
ON public.post_notification_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
