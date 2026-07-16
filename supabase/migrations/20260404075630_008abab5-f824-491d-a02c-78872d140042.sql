ALTER TABLE public.posts ADD COLUMN pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN pinned_at timestamp with time zone;