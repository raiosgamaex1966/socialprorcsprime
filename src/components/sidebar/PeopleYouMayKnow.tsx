import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

const PeopleYouMayKnow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: suggestions = [] } = useQuery({
    queryKey: ["sidebar-people-you-may-know", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all users connected via friendships
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

      // Get friend IDs only (accepted)
      const friendIds = (friendships || [])
        .filter((f) => f.requester_id !== user.id ? true : true) // keep all
        .map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));

      // Find friends-of-friends (mutual connection basis)
      let mutualMap: Record<string, number> = {};
      if (friendIds.length > 0) {
        const { data: fof } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(
            friendIds.map((id) => `requester_id.eq.${id},addressee_id.eq.${id}`).join(",")
          );

        fof?.forEach((f) => {
          const otherId = friendIds.includes(f.requester_id) ? f.addressee_id : f.requester_id;
          if (!connectedIds.has(otherId)) {
            mutualMap[otherId] = (mutualMap[otherId] || 0) + 1;
          }
        });
      }

      // Get profiles for suggestions — prioritise those with mutual friends
      const mutualIds = Object.entries(mutualMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      let profileIds = mutualIds;

      // If not enough mutual suggestions, fill with random profiles
      if (profileIds.length < 5) {
        const { data: extra } = await supabase
          .from("profiles")
          .select("user_id")
          .limit(20);
        const extraIds = (extra || [])
          .map((p) => p.user_id)
          .filter((id) => !connectedIds.has(id) && !profileIds.includes(id));
        profileIds = [...profileIds, ...extraIds].slice(0, 5);
      }

      if (!profileIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .in("user_id", profileIds);

      return (profiles || []).map((p) => ({
        ...p,
        mutualCount: mutualMap[p.user_id] || 0,
      })).sort((a, b) => b.mutualCount - a.mutualCount);
    },
    enabled: !!user,
    staleTime: 120000,
  });

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 px-2 mb-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h3 className="text-[15px] font-semibold text-foreground">Pessoas que você talvez conheça</h3>
      </div>
      <div className="space-y-1 px-1">
        {suggestions.map((person) => (
          <button
            key={person.user_id}
            onClick={() => navigate(`/profile/${person.user_id}`)}
            className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <img
              src={person.avatar_url || defaultAvatar}
              alt={person.display_name || "Usuário"}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground truncate">
                {person.display_name || "Usuário"}
              </p>
              {person.mutualCount > 0 ? (
                <p className="text-[11px] text-primary">
                  {person.mutualCount} {person.mutualCount === 1 ? "amigo em comum" : "amigos em comum"}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {person.bio || "Sugerido para você"}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeopleYouMayKnow;
