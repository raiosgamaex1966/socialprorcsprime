
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings (needed for app-wide config)
CREATE POLICY "Authenticated users can read settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings"
  ON public.site_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
