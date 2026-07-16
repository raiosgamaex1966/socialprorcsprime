import { useCallback, useEffect, useState } from "react";

const useWebNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (document.hasFocus()) return; // Don't show if app is focused

      try {
        const notification = new Notification(title, {
          icon: "/placeholder.svg",
          badge: "/placeholder.svg",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTimeout(() => notification.close(), 5000);
      } catch {
        // Notification not supported in this context
      }
    },
    []
  );

  const isSupported = typeof Notification !== "undefined";
  const isEnabled = permission === "granted";

  return { permission, requestPermission, showNotification, isSupported, isEnabled };
};

export default useWebNotifications;
