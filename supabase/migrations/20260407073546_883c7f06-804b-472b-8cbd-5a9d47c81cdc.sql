-- Allow participants to delete their conversations
CREATE POLICY "Users can delete their conversations"
ON public.conversations FOR DELETE TO authenticated
USING (
  (auth.uid() = participant_one) OR 
  (auth.uid() = participant_two) OR 
  (is_group AND is_conversation_member(id, auth.uid()))
);