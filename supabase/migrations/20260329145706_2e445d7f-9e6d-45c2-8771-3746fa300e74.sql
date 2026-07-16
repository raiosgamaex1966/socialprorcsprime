CREATE TABLE public.event_reminder_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  remind_minutes_before integer NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, remind_minutes_before)
);

ALTER TABLE public.event_reminder_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON public.event_reminder_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
  ON public.event_reminder_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.event_reminder_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.event_reminder_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);