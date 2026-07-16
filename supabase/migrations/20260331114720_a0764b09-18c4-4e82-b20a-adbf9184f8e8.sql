
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. RLS on user_roles: admins can view all, users can view own
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Allow admins to read ALL listing reports (not just their own)
CREATE POLICY "Admins can view all reports"
  ON public.listing_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Allow admins to update report status
CREATE POLICY "Admins can update reports"
  ON public.listing_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Allow admins to update listing status (e.g. mark as removed)
CREATE POLICY "Admins can update listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
