import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Sparkles, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import SidebarSection from "./SidebarSection";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { GROUP_CATEGORY_LABELS, GroupCategory } from "@/constants/groupCategories";

const GroupsContextSidebar = () => {
  const { user } = useAuth();

  const { data: myGroups = [] } = useQuery({
    queryKey: ["sidebar-my-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (!memberships?.length) return [];
      const ids = memberships.map((m) => m.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, avatar_url, category")
        .in("id", ids)
        .limit(6);
      return groups || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: suggestedGroups = [] } = useQuery({
    queryKey: ["sidebar-suggested-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const joinedIds = (memberships || []).map((m) => m.group_id);
      let query = supabase
        .from("groups")
        .select("id, name, avatar_url, category, description")
        .eq("privacy", "public")
        .limit(4);
      if (joinedIds.length > 0) {
        // Filter out joined groups manually after fetch
      }
      const { data } = await query;
      return (data || []).filter((g) => !joinedIds.includes(g.id)).slice(0, 4);
    },
    enabled: !!user,
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      {myGroups.length > 0 && (
        <SidebarSection title="Seus Grupos" icon={Users}>
          <div className="space-y-1">
            {myGroups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <img
                  src={group.avatar_url || defaultAvatar}
                  alt={group.name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {GROUP_CATEGORY_LABELS[group.category as GroupCategory] || group.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}

      {suggestedGroups.length > 0 && (
        <SidebarSection title="Grupos Sugeridos" icon={Sparkles}>
          <div className="space-y-1">
            {suggestedGroups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <img
                  src={group.avatar_url || defaultAvatar}
                  alt={group.name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {group.description || GROUP_CATEGORY_LABELS[group.category as GroupCategory] || group.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}
    </div>
  );
};

export default GroupsContextSidebar;
