CREATE POLICY "Users can update their group post likes"
ON public.group_post_likes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);