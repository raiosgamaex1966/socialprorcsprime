import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Derive single typingUserId for backward compat
  const typingUserIds = Array.from(typingUsers.keys());
  const typingUserId = typingUserIds[0] ?? null;

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== user.id) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            // Clear existing timeout for this user
            const existing = next.get(senderId);
            if (existing) clearTimeout(existing);
            // Set new timeout to remove after 3s
            const timeout = setTimeout(() => {
              setTypingUsers((p) => {
                const n = new Map(p);
                n.delete(senderId);
                return n;
              });
            }, 3000);
            next.set(senderId, timeout);
            return next;
          });
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== user.id) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            const existing = next.get(senderId);
            if (existing) clearTimeout(existing);
            next.delete(senderId);
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      // Clear all timeouts
      setTypingUsers((prev) => {
        prev.forEach((t) => clearTimeout(t));
        return new Map();
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
    });
  }, [user]);

  const sendStopTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { user_id: user.id },
    });
  }, [user]);

  return { typingUserId, typingUserIds, sendTyping, sendStopTyping };
};
