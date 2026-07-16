import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Search, Send, Check, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface InviteFriendsModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

const InviteFriendsModal = ({ eventId, eventTitle, onClose }: InviteFriendsModalProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  const { data: friends, isLoading } = useQuery({
    queryKey: ["friends-for-invite", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds);

      return profiles || [];
    },
    enabled: !!user,
  });

  // Get existing RSVPs to mark already-invited users
  const { data: existingRsvps } = useQuery({
    queryKey: ["event-rsvp-users", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_event_rsvps")
        .select("user_id")
        .eq("event_id", eventId);
      return new Set((data || []).map((r) => r.user_id));
    },
  });

  const filtered = (friends || []).filter((f) =>
    !search || (f.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (friendId: string, friendName: string) => {
    if (!user) return;
    setSending(friendId);

    // Send a notification to the friend
    const { error } = await supabase.from("notifications").insert({
      user_id: friendId,
      actor_id: user.id,
      type: "event_invite",
      message: `te convidou para o evento "${eventTitle}"`,
      reference_id: eventId,
    });

    setSending(null);
    if (error) {
      toast.error("Falha ao enviar convite");
      return;
    }

    setSentIds((prev) => new Set(prev).add(friendId));
    toast.success(`Convite enviado para ${friendName}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-[420px] shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Convidar Amigos</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar amigos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-secondary/50" />
                  <div className="h-4 w-32 bg-secondary/50 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? "Nenhum amigo encontrado" : "Nenhum amigo para convidar"}
            </p>
          ) : (
            filtered.map((friend) => {
              const alreadyRsvped = existingRsvps?.has(friend.user_id);
              const alreadySent = sentIds.has(friend.user_id);
              const isSending = sending === friend.user_id;
              const isDisabled = alreadyRsvped || alreadySent || isSending;

              return (
                <div
                  key={friend.user_id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={friend.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(friend.display_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground truncate">
                      {friend.display_name || "Desconhecido"}
                    </span>
                  </div>

                  {alreadyRsvped ? (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Já confirmou
                    </span>
                  ) : alreadySent ? (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Enviado
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      disabled={isSending}
                      onClick={() => handleInvite(friend.user_id, friend.display_name || "amigo")}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {isSending ? "..." : "Convidar"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteFriendsModal;
