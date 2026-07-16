import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Clock } from "lucide-react";
import SidebarSection from "./SidebarSection";
import defaultAvatar from "@/assets/default-avatar.jpg";

const FriendsContextSidebar = () => {
  const { user } = useAuth();

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["sidebar-pending-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: pending } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending");
      if (!pending?.length) return [];
      const ids = pending.map((p) => p.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      return pending.map((p) => ({
        ...p,
        profile: profiles?.find((pr) => pr.user_id === p.requester_id),
      }));
    },
    enabled: !!user,
    staleTime: 15000,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["sidebar-friend-suggestions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get current friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const connectedIds = new Set<string>();
      connectedIds.add(user.id);
      friendships?.forEach((f) => {
        connectedIds.add(f.requester_id);
        connectedIds.add(f.addressee_id);
      });
      // Get some profiles not yet connected
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .limit(20);
      return (profiles || [])
        .filter((p) => !connectedIds.has(p.user_id))
        .slice(0, 5);
    },
    enabled: !!user,
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <SidebarSection title="Solicitações Pendentes" icon={Clock}>
          <div className="space-y-1">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-secondary/50">
                <img
                  src={req.profile?.avatar_url || defaultAvatar}
                  alt={req.profile?.display_name || "Usuário"}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {req.profile?.display_name || "Usuário"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Quer ser seu amigo(a)</p>
                </div>
              </div>
            ))}
          </div>
        </SidebarSection>
      )}

      {suggestions.length > 0 && (
        <SidebarSection title="Pessoas que você talvez conheça" icon={UserPlus}>
          <div className="space-y-1">
            {suggestions.map((person) => (
              <div key={person.user_id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <img
                  src={person.avatar_url || defaultAvatar}
                  alt={person.display_name || "Usuário"}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {person.display_name || "Usuário"}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{person.bio || "Sem biografia"}</p>
                </div>
              </div>
            ))}
          </div>
        </SidebarSection>
      )}
    </div>
  );
};

export default FriendsContextSidebar;
