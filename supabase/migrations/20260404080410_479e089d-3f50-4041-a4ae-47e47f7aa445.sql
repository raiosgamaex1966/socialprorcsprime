CREATE TABLE public.post_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  privacy text,
  location text,
  feeling text,
  background_style text,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edit history of their posts"
  ON public.post_edit_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own edit history"
  ON public.post_edit_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());