
-- Add cover_image_url and category to group_events
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Add page_id to group_events (nullable, for page events)
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE;

-- Make group_id nullable (events can belong to a page instead)
ALTER TABLE public.group_events ALTER COLUMN group_id DROP NOT NULL;

-- Create event_comments table
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.event_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on event_comments
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_comments
CREATE POLICY "Event comments viewable by authenticated" ON public.event_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create event comments" ON public.event_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event comments" ON public.event_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update group_events RLS to allow page admins
DROP POLICY IF EXISTS "Admins and mods can create events" ON public.group_events;
CREATE POLICY "Admins and mods can create events" ON public.group_events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      (group_id IS NOT NULL AND is_group_admin_or_mod(group_id, auth.uid())) OR
      (page_id IS NOT NULL AND is_page_admin(page_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins and mods can update events" ON public.group_events;
CREATE POLICY "Admins and mods can update events" ON public.group_events
  FOR UPDATE TO authenticated
  USING (
    (group_id IS NOT NULL AND is_group_admin_or_mod(group_id, auth.uid())) OR
    (page_id IS NOT NULL AND is_page_admin(page_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Admins and mods can delete events" ON public.group_events;
CREATE POLICY "Admins and mods can delete events" ON public.group_events
  FOR DELETE TO authenticated
  USING (
    (group_id IS NOT NULL AND is_group_admin_or_mod(group_id, auth.uid())) OR
    (page_id IS NOT NULL AND is_page_admin(page_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Group events visible to members" ON public.group_events;
CREATE POLICY "Events visible to members or public" ON public.group_events
  FOR SELECT TO authenticated
  USING (
    (group_id IS NOT NULL AND is_group_member(group_id, auth.uid())) OR
    (page_id IS NOT NULL)
  );

-- Also allow RSVP for page events
DROP POLICY IF EXISTS "Group members can RSVP to events" ON public.group_event_rsvps;
CREATE POLICY "Users can RSVP to events" ON public.group_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM group_events ge WHERE ge.id = group_event_rsvps.event_id AND (
        (ge.group_id IS NOT NULL AND is_group_member(ge.group_id, auth.uid())) OR
        ge.page_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Group members can view event RSVPs" ON public.group_event_rsvps;
CREATE POLICY "Users can view event RSVPs" ON public.group_event_rsvps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_events ge WHERE ge.id = group_event_rsvps.event_id AND (
        (ge.group_id IS NOT NULL AND is_group_member(ge.group_id, auth.uid())) OR
        ge.page_id IS NOT NULL
      )
    )
  );
