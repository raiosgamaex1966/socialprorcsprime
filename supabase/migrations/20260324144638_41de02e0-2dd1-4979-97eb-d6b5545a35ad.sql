CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  ));

CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  ));

CREATE POLICY "Users can remove their reactions" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;