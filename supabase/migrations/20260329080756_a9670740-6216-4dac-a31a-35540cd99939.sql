
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group events visible to members"
  ON public.group_events FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Admins and mods can create events"
  ON public.group_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_group_admin_or_mod(group_id, auth.uid()));

CREATE POLICY "Admins and mods can update events"
  ON public.group_events FOR UPDATE TO authenticated
  USING (is_group_admin_or_mod(group_id, auth.uid()));

CREATE POLICY "Admins and mods can delete events"
  ON public.group_events FOR DELETE TO authenticated
  USING (is_group_admin_or_mod(group_id, auth.uid()));
