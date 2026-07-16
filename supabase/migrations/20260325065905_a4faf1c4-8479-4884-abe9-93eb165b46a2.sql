-- Add group chat columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN group_name text,
  ADD COLUMN group_avatar_url text,
  ADD COLUMN created_by uuid;

-- Make participant_one and participant_two nullable for group chats
ALTER TABLE public.conversations
  ALTER COLUMN participant_one DROP NOT NULL,
  ALTER COLUMN participant_two DROP NOT NULL;

-- Create conversation_members table
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view members of conversations they belong to
CREATE POLICY "Users can view conversation members"
  ON public.conversation_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

-- RLS: Admins can add members, or creator adding initial members
CREATE POLICY "Admins can add members"
  ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    -- User is admin of this conversation
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
    OR
    -- Creator adding themselves as first member
    (
      auth.uid() = user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id
      )
    )
  );

-- RLS: Admins can remove members, members can leave
CREATE POLICY "Admins can remove or members can leave"
  ON public.conversation_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- Update conversations RLS to include group chats
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    (auth.uid() = participant_one OR auth.uid() = participant_two)
    OR (is_group AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = participant_one OR auth.uid() = participant_two)
    OR (is_group AND auth.uid() = created_by)
  );

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    (auth.uid() = participant_one OR auth.uid() = participant_two)
    OR (is_group AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    ))
  );

-- Update messages RLS to also allow group chat participants
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
          OR (c.is_group AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
          OR (c.is_group AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );

DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
CREATE POLICY "Users can update messages they received"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
          OR (c.is_group AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );

-- Update message_reactions RLS for group chats
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND (
          (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
          OR (c.is_group AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND (
          (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
          OR (c.is_group AND EXISTS (
            SELECT 1 FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth.uid()
          ))
        )
    )
  );

-- Backfill existing DM conversations into conversation_members
INSERT INTO public.conversation_members (conversation_id, user_id, role)
SELECT id, participant_one, 'member' FROM public.conversations WHERE participant_one IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_members (conversation_id, user_id, role)
SELECT id, participant_two, 'member' FROM public.conversations WHERE participant_two IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable realtime for conversation_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;