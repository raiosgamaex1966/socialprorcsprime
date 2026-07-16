CREATE POLICY "Users can update their page post likes"
ON public.page_post_likes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);