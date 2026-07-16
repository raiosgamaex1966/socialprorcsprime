
CREATE TABLE public.creator_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (follower_id, creator_id)
);

ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows"
  ON public.creator_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow creators"
  ON public.creator_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id != creator_id);

CREATE POLICY "Users can unfollow creators"
  ON public.creator_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);
