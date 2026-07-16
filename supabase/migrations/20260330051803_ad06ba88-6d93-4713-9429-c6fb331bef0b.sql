
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(8), 'hex'),
  created_by uuid NOT NULL,
  expires_at timestamp with time zone,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create invites" ON public.group_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_group_admin_or_mod(group_id, auth.uid()));

CREATE POLICY "Authenticated can view active invites" ON public.group_invites
  FOR SELECT TO authenticated
  USING (is_active = true OR is_group_member(group_id, auth.uid()));

CREATE POLICY "Admins can update invites" ON public.group_invites
  FOR UPDATE TO authenticated
  USING (is_group_admin_or_mod(group_id, auth.uid()));

CREATE POLICY "Admins can delete invites" ON public.group_invites
  FOR DELETE TO authenticated
  USING (is_group_admin_or_mod(group_id, auth.uid()));
