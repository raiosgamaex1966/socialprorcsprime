ALTER TABLE public.group_posts
ADD COLUMN pinned boolean NOT NULL DEFAULT false,
ADD COLUMN pinned_at timestamptz,
ADD COLUMN pinned_by uuid;