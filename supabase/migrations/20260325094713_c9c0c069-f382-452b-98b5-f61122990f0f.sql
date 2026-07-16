
CREATE TABLE public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes viewable by authenticated"
  ON public.comment_likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their comment likes"
  ON public.comment_likes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
