CREATE POLICY "Anyone can check if admin exists"
ON public.user_roles
FOR SELECT
TO anon
USING (role = 'admin'::app_role);