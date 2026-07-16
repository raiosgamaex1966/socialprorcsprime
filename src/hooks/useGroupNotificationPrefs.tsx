import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface GroupNotifPrefs {
  muted: boolean;
  notify_posts: boolean;
  notify_comments: boolean;
  notify_events: boolean;
}

const defaults: GroupNotifPrefs = {
  muted: false,
  notify_posts: true,
  notify_comments: true,
  notify_events: true,
};

export const useGroupNotificationPrefs = (groupId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["group-notif-prefs", groupId, user?.id],
    queryFn: async () => {
      if (!user || !groupId) return defaults;
      const { data } = await supabase
        .from("group_notification_preferences" as any)
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return defaults;
      const d = data as any;
      return {
        muted: d.muted,
        notify_posts: d.notify_posts,
        notify_comments: d.notify_comments,
        notify_events: d.notify_events,
      } as GroupNotifPrefs;
    },
    enabled: !!user && !!groupId,
  });

  const updatePrefs = async (updates: Partial<GroupNotifPrefs>) => {
    if (!user || !groupId) return;
    const newPrefs = { ...(prefs || defaults), ...updates };

    try {
      const { data: existing } = await supabase
        .from("group_notification_preferences" as any)
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("group_notification_preferences" as any)
          .update({
            ...newPrefs,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("group_id", groupId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("group_notification_preferences" as any)
          .insert({
            group_id: groupId,
            user_id: user.id,
            ...newPrefs,
          } as any);
      }

      queryClient.invalidateQueries({ queryKey: ["group-notif-prefs", groupId, user.id] });
    } catch {
      toast.error("Failed to update notification settings");
    }
  };

  const toggleMute = () => {
    const newMuted = !(prefs?.muted ?? false);
    updatePrefs({ muted: newMuted });
    toast.success(newMuted ? "Group notifications muted" : "Group notifications unmuted");
  };

  return { prefs: prefs || defaults, isLoading, updatePrefs, toggleMute };
};
