CREATE POLICY "Admins can delete any sponsored post"
ON public.sponsored_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));