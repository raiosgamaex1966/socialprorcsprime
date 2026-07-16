
-- Group post likes
CREATE TABLE public.group_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (group_post_id, user_id)
);

ALTER TABLE public.group_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group post likes viewable by group members"
  ON public.group_post_likes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_posts gp
    WHERE gp.id = group_post_likes.group_post_id
      AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Members can like group posts"
  ON public.group_post_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = group_post_likes.group_post_id
        AND is_group_member(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "Users can unlike group posts"
  ON public.group_post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Group post comments
CREATE TABLE public.group_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group post comments viewable by group members"
  ON public.group_post_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_posts gp
    WHERE gp.id = group_post_comments.group_post_id
      AND is_group_member(gp.group_id, auth.uid())
  ));

CREATE POLICY "Members can comment on group posts"
  ON public.group_post_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = group_post_comments.group_post_id
        AND is_group_member(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.group_post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
