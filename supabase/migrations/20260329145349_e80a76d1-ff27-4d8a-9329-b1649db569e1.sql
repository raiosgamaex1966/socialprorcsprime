ALTER TABLE public.group_events 
ADD COLUMN recurrence_type text NOT NULL DEFAULT 'none',
ADD COLUMN recurrence_end_date timestamp with time zone DEFAULT NULL,
ADD COLUMN parent_event_id uuid REFERENCES public.group_events(id) ON DELETE CASCADE DEFAULT NULL;