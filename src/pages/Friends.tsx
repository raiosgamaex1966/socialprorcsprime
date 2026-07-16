import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { UserPlus, UserCheck, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import defaultAvatar from "@/assets/default-avatar.jpg";
import AppPageShell from "@/components/AppPageShell";

const Friends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as "friends" | "requests" | "find") || "friends";
  const [tab, setTab] = useState<"friends" | "requests" | "find">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch friendships
  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (error) throw error;
      // Fetch profiles for all involved users
      const userIds = [...new Set((data as any[]).flatMap((f: any) => [f.requester_id, f.addressee_id]))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((f: any) => ({
        ...f,
        requester: profileMap.get(f.requester_id) || null,
        addressee: profileMap.get(f.addressee_id) || null,
      }));
    },
    enabled: !!user,
  });

  // Fetch all profiles for "find friends"
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles", searchQuery],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").neq("user_id", user!.id).limit(20);
      if (searchQuery.trim()) {
        query = query.ilike("display_name", `%${searchQuery}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && tab === "find",
  });

  const acceptedFriends = friendships?.filter((f: any) => f.status === "accepted") ?? [];
  const pendingRequests = friendships?.filter((f: any) => f.status === "pending" && f.addressee_id === user?.id) ?? [];
  const sentRequests = friendships?.filter((f: any) => f.status === "pending" && f.requester_id === user?.id) ?? [];

  const getFriendshipWith = (userId: string) => {
    return friendships?.find((f: any) =>
      (f.requester_id === userId || f.addressee_id === userId)
    );
  };

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: addresseeId,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: addresseeId,
        actor_id: user.id,
        type: "friend_request",
        message: "te enviou uma solicitação de amizade",
      });
      toast.success("Solicitação de amizade enviada!");
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    try {
      if (accept) {
        await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
        toast.success("Solicitação de amizade aceita!");
      } else {
        await supabase.from("friendships").delete().eq("id", friendshipId);
        toast.success("Solicitação de amizade recusada");
      }
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const tabs = [
    { key: "friends" as const, label: "Todos os Amigos", count: acceptedFriends.length },
    { key: "requests" as const, label: "Solicitações", count: pendingRequests.length },
    { key: "find" as const, label: "Encontrar Amigos" },
  ];

  return (
    <AppPageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          Amigos
        </h1>
      </div>

      {/* Tabs + Search (single row) */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-secondary rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "find" && (
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Friends list */}
      {tab === "friends" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {acceptedFriends.map((f: any) => {
            const friend = f.requester_id === user?.id ? f.addressee : f.requester;
            return (
              <div key={f.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center gap-3">
                <img src={friend?.avatar_url || defaultAvatar} alt={friend?.display_name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{friend?.display_name || "Usuário"}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => respondRequest(f.id, false)}>
                  Desfazer Amizade
                </Button>
              </div>
            );
          })}
          {acceptedFriends.length === 0 && (
            <p className="text-muted-foreground col-span-2 text-center py-8">Nenhum amigo ainda. Encontre pessoas para se conectar!</p>
          )}
        </div>
      )}

      {/* Pending requests */}
      {tab === "requests" && (
        <div className="space-y-4">
          {pendingRequests.length > 0 && <h3 className="font-semibold text-foreground">Solicitações Recebidas</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pendingRequests.map((f: any) => (
              <div key={f.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center gap-3">
                <img src={f.requester?.avatar_url || defaultAvatar} alt={f.requester?.display_name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{f.requester?.display_name || "Usuário"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondRequest(f.id, true)}>Confirmar</Button>
                  <Button variant="secondary" size="sm" onClick={() => respondRequest(f.id, false)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
          {pendingRequests.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação pendente</p>
          )}
        </div>
      )}

      {/* Find friends */}
      {tab === "find" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allProfiles?.map((p: any) => {
            const friendship = getFriendshipWith(p.user_id);
            const isPending = friendship?.status === "pending";
            const isFriend = friendship?.status === "accepted";
            return (
              <div key={p.id} className="bg-card rounded-lg shadow-sm p-4 flex items-center gap-3">
                <img src={p.avatar_url || defaultAvatar} alt={p.display_name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{p.display_name || "Usuário"}</p>
                </div>
                {isFriend ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserCheck className="w-4 h-4" /> Amigos
                  </span>
                ) : isPending ? (
                  <span className="text-sm text-muted-foreground">Pendente</span>
                ) : (
                  <Button size="sm" onClick={() => sendRequest(p.user_id)}>
                    <UserPlus className="w-4 h-4" /> Adicionar Amigo
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppPageShell>
  );
};

export default Friends;
