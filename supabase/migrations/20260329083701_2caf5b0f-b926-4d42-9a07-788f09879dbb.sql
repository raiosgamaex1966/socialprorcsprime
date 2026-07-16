
CREATE TABLE public.group_event_rsvps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Members can view RSVPs for events in their groups
CREATE POLICY "Group members can view event RSVPs"
ON public.group_event_rsvps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_events ge
    WHERE ge.id = group_event_rsvps.event_id
    AND is_group_member(ge.group_id, auth.uid())
  )
);

-- Members can RSVP to events in their groups
CREATE POLICY "Group members can RSVP to events"
ON public.group_event_rsvps FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_events ge
    WHERE ge.id = group_event_rsvps.event_id
    AND is_group_member(ge.group_id, auth.uid())
  )
);

-- Users can update their own RSVPs
CREATE POLICY "Users can update their RSVPs"
ON public.group_event_rsvps FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete their RSVPs"
ON public.group_event_rsvps FOR DELETE TO authenticated
USING (auth.uid() = user_id);
