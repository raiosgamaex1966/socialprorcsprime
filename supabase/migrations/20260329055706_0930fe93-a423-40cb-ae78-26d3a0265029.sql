
-- Add conversation_id to groups table to link each group to its chat
ALTER TABLE public.groups ADD COLUMN conversation_id uuid REFERENCES public.conversations(id);

-- Create a function that auto-creates a group conversation when a group is created
CREATE OR REPLACE FUNCTION public.create_group_conversation_for_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Create the group conversation
  INSERT INTO public.conversations (is_group, group_name, created_by)
  VALUES (true, NEW.name, NEW.created_by)
  RETURNING id INTO v_conv_id;

  -- Add creator as admin member of the conversation
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, NEW.created_by, 'admin');

  -- Link the conversation to the group
  NEW.conversation_id := v_conv_id;

  RETURN NEW;
END;
$$;

-- Trigger to auto-create conversation on group insert
CREATE TRIGGER trg_create_group_conversation
  BEFORE INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.create_group_conversation_for_group();

-- Also sync: when a member is approved in group_members, add them to the conversation
CREATE OR REPLACE FUNCTION public.sync_group_member_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Get the conversation_id for this group
  SELECT conversation_id INTO v_conv_id FROM public.groups WHERE id = NEW.group_id;
  
  IF v_conv_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    -- Add to conversation if not already there
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_conv_id, NEW.user_id, CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_group_member_to_conversation
  AFTER INSERT OR UPDATE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_group_member_to_conversation();

-- Sync: when a member is removed from group_members, remove from conversation
CREATE OR REPLACE FUNCTION public.remove_group_member_from_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  SELECT conversation_id INTO v_conv_id FROM public.groups WHERE id = OLD.group_id;
  
  IF v_conv_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.conversation_members
  WHERE conversation_id = v_conv_id AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_remove_group_member_from_conversation
  AFTER DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_group_member_from_conversation();
