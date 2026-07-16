import { useEffect, useState, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnlinePresenceContextValue {
  onlineUsers: Set<string>;
  isOnline: (userId: string) => boolean;
}

const OnlinePresenceContext = createContext<OnlinePresenceContextValue>({
  onlineUsers: new Set(),
  isOnline: () => false,
});

let channelCounter = 0;

export const OnlinePresenceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const channelName = `online-presence-${++channelCounter}`;

    let channel: ReturnType<typeof supabase.channel>;
    try {
      channel = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel.presenceState();
            const ids = new Set<string>(Object.keys(state));
            setOnlineUsers(ids);
          } catch {}
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
              supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then();
            } catch {}
          }
        });
    } catch {
      return;
    }

    const interval = setInterval(() => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then();
    }, 60000);

    return () => {
      clearInterval(interval);
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", user.id).then();
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user]);

  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers]
  );

  return (
    <OnlinePresenceContext.Provider value={{ onlineUsers, isOnline }}>
      {children}
    </OnlinePresenceContext.Provider>
  );
};

export const useOnlinePresence = () => useContext(OnlinePresenceContext);
