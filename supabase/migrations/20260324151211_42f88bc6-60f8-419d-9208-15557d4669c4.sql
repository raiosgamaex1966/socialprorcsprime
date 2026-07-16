
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());
