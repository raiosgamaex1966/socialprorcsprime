ALTER TABLE public.groups 
ADD COLUMN category text NOT NULL DEFAULT 'General',
ADD COLUMN rules text DEFAULT NULL;