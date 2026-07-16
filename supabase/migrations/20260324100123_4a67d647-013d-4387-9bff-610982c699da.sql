-- Fix notifications insert policy to be more restrictive
DROP POLICY "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications as actor" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);