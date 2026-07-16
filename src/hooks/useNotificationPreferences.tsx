import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPreferences {
  memoryBrowserPush: boolean;
  memoryInApp: boolean;
  likeAlerts: boolean;
  commentAlerts: boolean;
  friendRequestAlerts: boolean;
  messageAlerts: boolean;
  weeklyEventDigest: boolean;
}

const STORAGE_KEY = "notification_preferences";

const defaults: NotificationPreferences = {
  memoryBrowserPush: true,
  memoryInApp: true,
  likeAlerts: true,
  commentAlerts: true,
  friendRequestAlerts: true,
  messageAlerts: true,
  weeklyEventDigest: true,
};

const useNotificationPreferences = () => {
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Load digest preference from database on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_notification_settings")
      .select("weekly_event_digest")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs((prev) => ({ ...prev, weeklyEventDigest: data.weekly_event_digest }));
        }
      });
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const updatePref = useCallback(
    <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));

      // Sync digest pref to database
      if (key === "weeklyEventDigest" && user) {
        supabase
          .from("user_notification_settings" as any)
          .upsert(
            { user_id: user.id, weekly_event_digest: value, updated_at: new Date().toISOString() } as any,
            { onConflict: "user_id" }
          )
          .then();
      }
    },
    [user]
  );

  return { prefs, updatePref };
};

export default useNotificationPreferences;
