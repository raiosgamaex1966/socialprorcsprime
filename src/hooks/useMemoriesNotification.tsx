import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useWebNotifications from "@/hooks/useWebNotifications";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import useNotificationSound from "@/hooks/useNotificationSound";
import { subYears } from "date-fns";
import { useNavigate } from "react-router-dom";

const useMemoriesNotification = () => {
  const { user } = useAuth();
  const { showNotification, requestPermission, isSupported, isEnabled } = useWebNotifications();
  const { prefs } = useNotificationPreferences();
  const { playNotification } = useNotificationSound();
  const navigate = useNavigate();
  const hasNotified = useRef(false);

  const { data: memoriesCount } = useQuery({
    queryKey: ["memories-push-check", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const today = new Date();
      let count = 0;

      for (let yearsAgo = 1; yearsAgo <= 5; yearsAgo++) {
        const targetDate = subYears(today, yearsAgo);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const { count: c } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString());

        count += c ?? 0;
      }
      return count;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
  });

  // Request permission on first load if not yet decided
  useEffect(() => {
    if (!prefs.memoryBrowserPush) return;
    if (isSupported && !isEnabled && user) {
      const sessionKey = "memories_notif_asked";
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        requestPermission();
      }
    }
  }, [isSupported, isEnabled, user, requestPermission, prefs.memoryBrowserPush]);

  // Show notification when memories are found
  useEffect(() => {
    if (!memoriesCount || memoriesCount === 0 || hasNotified.current) return;
    if (!isEnabled || !prefs.memoryBrowserPush) return;

    // Only notify once per session
    const sessionKey = `memories_notif_shown_${new Date().toDateString()}`;
    if (sessionStorage.getItem(sessionKey)) return;

    hasNotified.current = true;
    sessionStorage.setItem(sessionKey, "1");

    // Small delay so it doesn't fire immediately on page load
    const timer = setTimeout(() => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      try {
        playNotification("memory");
        const notification = new Notification("📸 You have memories from today!", {
          body: `${memoriesCount} ${memoriesCount === 1 ? "memory" : "memories"} from this day in the past. Tap to look back.`,
          icon: "/placeholder.svg",
          tag: "memories-daily",
        });

        notification.onclick = () => {
          window.focus();
          navigate("/memories");
          notification.close();
        };

        setTimeout(() => notification.close(), 8000);
      } catch {
        // Not supported in this context
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [memoriesCount, isEnabled, navigate, prefs.memoryBrowserPush]);
};

export default useMemoriesNotification;
