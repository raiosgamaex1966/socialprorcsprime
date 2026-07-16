-- Function to create a group chat atomically
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_group_name text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_member_id uuid;
BEGIN
  -- Create the conversation
  INSERT INTO public.conversations (is_group, group_name, created_by)
  VALUES (true, p_group_name, auth.uid())
  RETURNING id INTO v_conv_id;

  -- Add creator as admin
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, auth.uid(), 'admin');

  -- Add other members
  FOREACH v_member_id IN ARRAY p_member_ids
  LOOP
    IF v_member_id != auth.uid() THEN
      INSERT INTO public.conversation_members (conversation_id, user_id, role)
      VALUES (v_conv_id, v_member_id, 'member')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

-- Function to add a member to a group (admin only)
CREATE OR REPLACE FUNCTION public.add_group_member(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can add members';
  END IF;

  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (p_conversation_id, p_user_id, 'member')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to remove a member from a group
CREATE OR REPLACE FUNCTION public.remove_group_member(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin or removing self
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  DELETE FROM conversation_members
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;