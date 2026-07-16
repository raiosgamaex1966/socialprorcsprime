import { useQuery } from "@tanstack/react-query";
import { Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GroupCard from "./GroupCard";

interface GroupRecommendationsProps {
  onJoin: (groupId: string) => void;
  joiningId: string | null;
  membershipMap: Map<string, any>;
  memberCounts: Record<string, number> | undefined;
  trendingGroupIds: Set<string> | undefined;
}

const GroupRecommendations = ({ onJoin, joiningId, membershipMap, memberCounts, trendingGroupIds }: GroupRecommendationsProps) => {
  const { user } = useAuth();

  // Get user's joined group categories
  const { data: myCategories } = useQuery({
    queryKey: ["my-group-categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (!memberships?.length) return [];
      const groupIds = memberships.map(m => m.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("category")
        .in("id", groupIds);
      return [...new Set((groups || []).map(g => g.category))];
    },
    enabled: !!user,
  });

  // Get friends' group memberships
  const { data: friendGroupIds } = useQuery({
    queryKey: ["friend-groups", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (!friendships?.length) return new Set<string>();
      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("user_id", friendIds)
        .eq("status", "approved");
      // Count how many friends are in each group
      const counts: Record<string, number> = {};
      (memberships || []).forEach(m => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Fetch recommended groups (similar categories OR friends are in them, user hasn't joined)
  const { data: recommendations } = useQuery({
    queryKey: ["group-recommendations", user?.id, myCategories, friendGroupIds],
    queryFn: async () => {
      if (!user) return [];

      // Gather candidate group IDs from friends
      const friendCandidateIds = Object.keys(friendGroupIds || {});

      // Fetch groups by similar categories (excluding user's own)
      let categoryGroups: any[] = [];
      if (myCategories?.length) {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .in("category", myCategories)
          .eq("privacy", "public")
          .order("created_at", { ascending: false })
          .limit(20);
        categoryGroups = data || [];
      }

      // Fetch groups friends are in
      let friendGroups: any[] = [];
      if (friendCandidateIds.length) {
        const { data } = await supabase
          .from("groups")
          .select("*")
          .in("id", friendCandidateIds)
          .eq("privacy", "public")
          .limit(20);
        friendGroups = data || [];
      }

      // Merge and deduplicate
      const seen = new Set<string>();
      const all: any[] = [];
      for (const g of [...friendGroups, ...categoryGroups]) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          all.push(g);
        }
      }

      // Filter out groups the user is already a member of
      return all.filter(g => !membershipMap.has(g.id));
    },
    enabled: !!user && (!!myCategories || !!friendGroupIds),
  });

  if (!recommendations?.length) return null;

  // Sort: friend groups first, then by member count
  const friendCounts = (friendGroupIds || {}) as Record<string, number>;
  const sorted = [...recommendations].sort((a, b) => {
    const aFriends = friendCounts[a.id] || 0;
    const bFriends = friendCounts[b.id] || 0;
    if (bFriends !== aFriends) return bFriends - aFriends;
    return (memberCounts?.[b.id] || 0) - (memberCounts?.[a.id] || 0);
  }).slice(0, 6);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Recomendado para Você</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Com base nos seus interesses e nas atividades dos seus amigos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((group) => {
          const friends = friendCounts[group.id] || 0;
          return (
            <div key={group.id} className="relative">
              {friends > 0 && (
                <div className="absolute -top-2 left-3 z-10 flex items-center gap-1 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                  <Users className="w-3 h-3" />
                  {friends} {friends > 1 ? "amigos participam" : "amigo participa"}
                </div>
              )}
              <GroupCard
                id={group.id}
                name={group.name}
                description={group.description}
                avatarUrl={group.avatar_url}
                coverPhotoUrl={group.cover_photo_url}
                privacy={group.privacy}
                category={group.category}
                memberCount={memberCounts?.[group.id] || 0}
                isMember={false}
                onJoin={onJoin}
                joining={joiningId === group.id}
                trending={trendingGroupIds?.has(group.id) || false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupRecommendations;
