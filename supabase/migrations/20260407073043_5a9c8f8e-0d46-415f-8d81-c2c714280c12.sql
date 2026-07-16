-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any profile
CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user roles
CREATE POLICY "Admins can view user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert user roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all blocked_users
CREATE POLICY "Admins can view all blocks"
ON public.blocked_users FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));