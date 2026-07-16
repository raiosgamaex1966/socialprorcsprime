-- Create stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories viewable by authenticated" ON public.stories
  FOR SELECT TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create stories" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete stories" ON public.stories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('story-media', 'story-media', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload story media" ON storage.objects;
CREATE POLICY "Authenticated users can upload story media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Story media is publicly viewable" ON storage.objects;
CREATE POLICY "Story media is publicly viewable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'story-media');

DROP POLICY IF EXISTS "Users can delete their story media" ON storage.objects;
CREATE POLICY "Users can delete their story media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);