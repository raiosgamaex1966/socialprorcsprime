
-- Create message_read_receipts table
CREATE TABLE public.message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_read_receipts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_read_receipts.message_id
    AND (
      c.participant_one = auth.uid()
      OR c.participant_two = auth.uid()
      OR (c.is_group AND is_conversation_member(c.id, auth.uid()))
    )
  )
);

-- Users can insert their own read receipts
CREATE POLICY "Users can insert their own read receipts"
ON public.message_read_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_read_receipts.message_id
    AND (
      c.participant_one = auth.uid()
      OR c.participant_two = auth.uid()
      OR (c.is_group AND is_conversation_member(c.id, auth.uid()))
    )
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
