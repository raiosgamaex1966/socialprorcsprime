
-- Story reactions table
CREATE TABLE public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on their stories or stories they reacted to"
  ON public.story_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.story_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON public.story_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Story highlights table
CREATE TABLE public.story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights are viewable by authenticated"
  ON public.story_highlights FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create their own highlights"
  ON public.story_highlights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON public.story_highlights FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON public.story_highlights FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Story highlight items table
CREATE TABLE public.story_highlight_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_id UUID NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_highlight_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlight items viewable by authenticated"
  ON public.story_highlight_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can add items to their highlights"
  ON public.story_highlight_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.story_highlights h
    WHERE h.id = highlight_id AND h.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove items from their highlights"
  ON public.story_highlight_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.story_highlights h
    WHERE h.id = highlight_id AND h.user_id = auth.uid()
  ));

-- Enable realtime for story_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
