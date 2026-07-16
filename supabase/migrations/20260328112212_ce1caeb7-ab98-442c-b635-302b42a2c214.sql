
-- Groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_photo_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'muted')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Group posts table
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'approved'
  )
$$;

-- Security definer function to check group admin/moderator role
CREATE OR REPLACE FUNCTION public.is_group_admin_or_mod(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role IN ('admin', 'moderator') AND status = 'approved'
  )
$$;

-- Groups policies
CREATE POLICY "Public groups viewable by all authenticated" ON public.groups
  FOR SELECT TO authenticated USING (privacy = 'public' OR is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update groups" ON public.groups
  FOR UPDATE TO authenticated USING (is_group_admin_or_mod(id, auth.uid()));

CREATE POLICY "Admins can delete groups" ON public.groups
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Group members policies
CREATE POLICY "Members visible to group members and public groups" ON public.group_members
  FOR SELECT TO authenticated USING (
    is_group_member(group_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND privacy = 'public')
  );

CREATE POLICY "Users can join public groups or request private" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update members or self" ON public.group_members
  FOR UPDATE TO authenticated USING (
    is_group_admin_or_mod(group_id, auth.uid()) OR auth.uid() = user_id
  );

CREATE POLICY "Admins can remove or users can leave" ON public.group_members
  FOR DELETE TO authenticated USING (
    is_group_admin_or_mod(group_id, auth.uid()) OR auth.uid() = user_id
  );

-- Group posts policies
CREATE POLICY "Group posts visible to members" ON public.group_posts
  FOR SELECT TO authenticated USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can create posts" ON public.group_posts
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Users can update own posts" ON public.group_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users or admins can delete posts" ON public.group_posts
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR is_group_admin_or_mod(group_id, auth.uid())
  );

-- Update trigger for groups
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_posts_updated_at
  BEFORE UPDATE ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
