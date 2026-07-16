
CREATE TABLE public.listing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  title text,
  description text,
  category text NOT NULL DEFAULT 'General',
  condition text NOT NULL DEFAULT 'Used - Good',
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON public.listing_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.listing_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.listing_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.listing_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
