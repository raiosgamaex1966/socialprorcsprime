
-- Content reports table for flagged posts/comments
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'post', 'comment', 'group_post', 'page_post', 'reel', 'message'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view all content reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create content reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can update content reports"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- User warnings table
CREATE TABLE public.user_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  issued_by UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'suspension', 'ban'
  reason TEXT NOT NULL,
  details TEXT,
  duration_hours INTEGER, -- null = permanent (for bans), or hours for suspensions
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_by UUID,
  revoked_at TIMESTAMP WITH TIME ZONE,
  related_report_id UUID REFERENCES public.content_reports(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view all warnings"
  ON public.user_warnings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Moderators can create warnings"
  ON public.user_warnings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update warnings"
  ON public.user_warnings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- Moderation activity log
CREATE TABLE public.moderation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'report_reviewed', 'report_dismissed', 'warning_issued', 'user_suspended', 'user_banned', 'ban_revoked', 'content_removed', 'bulk_action'
  target_type TEXT, -- 'user', 'post', 'comment', 'listing', 'report'
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view moderation log"
  ON public.moderation_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can create log entries"
  ON public.moderation_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));
