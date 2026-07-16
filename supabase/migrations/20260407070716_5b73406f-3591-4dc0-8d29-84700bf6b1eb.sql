
-- Admin can SELECT all posts (already open, skip)
-- Admin can DELETE any post
CREATE POLICY "Admins can delete any post" ON public.posts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can UPDATE any post
CREATE POLICY "Admins can update any post" ON public.posts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can SELECT all group_posts (currently requires membership)
CREATE POLICY "Admins can view all group posts" ON public.group_posts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can DELETE any group_post
CREATE POLICY "Admins can delete any group post" ON public.group_posts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can SELECT all page_posts (already open, skip)
-- Admin can DELETE any page_post
CREATE POLICY "Admins can delete any page post" ON public.page_posts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can DELETE any page
CREATE POLICY "Admins can delete any page" ON public.pages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can UPDATE any page
CREATE POLICY "Admins can update any page" ON public.pages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can DELETE any group
CREATE POLICY "Admins can delete any group" ON public.groups FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can SELECT all groups (including private)
CREATE POLICY "Admins can view all groups" ON public.groups FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can DELETE any listing
CREATE POLICY "Admins can delete any listing" ON public.listings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can SELECT all group_events (currently requires membership)
CREATE POLICY "Admins can view all events" ON public.group_events FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can DELETE any group_event
CREATE POLICY "Admins can delete any event" ON public.group_events FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can UPDATE any group_event
CREATE POLICY "Admins can update any event" ON public.group_events FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
