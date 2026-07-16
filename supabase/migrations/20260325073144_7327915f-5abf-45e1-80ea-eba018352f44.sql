
-- Fix infinite recursion in conversation_members and conversations RLS policies
-- The issue: conversation_members SELECT policy references itself, causing recursion

-- Step 1: Create a SECURITY DEFINER function to check membership without RLS
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

-- Step 2: Drop and recreate conversation_members SELECT policy
DROP POLICY IF EXISTS "Users can view conversation members" ON public.conversation_members;
CREATE POLICY "Users can view conversation members"
  ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Step 3: Fix conversations SELECT policy (had cm.conversation_id = cm.id bug)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    (auth.uid() = participant_one) OR
    (auth.uid() = participant_two) OR
    (is_group AND public.is_conversation_member(id, auth.uid()))
  );

-- Step 4: Fix conversations UPDATE policy (same bug)
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    (auth.uid() = participant_one) OR
    (auth.uid() = participant_two) OR
    (is_group AND public.is_conversation_member(id, auth.uid()))
  );

-- Step 5: Fix messages policies that reference conversation_members
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()
           OR (c.is_group AND public.is_conversation_member(c.id, auth.uid())))
  ));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()
             OR (c.is_group AND public.is_conversation_member(c.id, auth.uid())))
    )
  );

DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;
CREATE POLICY "Users can update messages they received"
  ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()
           OR (c.is_group AND public.is_conversation_member(c.id, auth.uid())))
  ));

-- Step 6: Fix message_reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()
           OR (c.is_group AND public.is_conversation_member(c.id, auth.uid())))
  ));

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid()
             OR (c.is_group AND public.is_conversation_member(c.id, auth.uid())))
    )
  );
