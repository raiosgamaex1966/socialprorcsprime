
-- Add pinned columns to messages
ALTER TABLE public.messages ADD COLUMN pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN pinned_by uuid DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN pinned_at timestamp with time zone DEFAULT NULL;
