
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS workplace text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS relationship_status text;
