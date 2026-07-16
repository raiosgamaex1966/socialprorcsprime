
CREATE TABLE public.group_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  muted boolean NOT NULL DEFAULT false,
  notify_posts boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_events boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.group_notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.group_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.group_notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON public.group_notification_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
