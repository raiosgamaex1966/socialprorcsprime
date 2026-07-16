import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import defaultAvatar from "@/assets/default-avatar.jpg";
import GroupHoverCard from "@/components/GroupHoverCard";
import SidebarTabSection from "@/components/SidebarTabSection";

const GroupActivityFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: myGroupIds } = useQuery({
    queryKey: ["my-group-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (error) throw error;
      return (data || []).map((m: any) => m.group_id);
    },
    enabled: !!user,
  });

  const { data: groupPosts } = useQuery({
    queryKey: ["group-activity-feed", myGroupIds],
    queryFn: async () => {
      if (!myGroupIds?.length) return [];
      const { data, error } = await supabase
        .from("group_posts")
        .select("*")
        .in("group_id", myGroupIds)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      const groupIds = [...new Set((data || []).map((p: any) => p.group_id))];

      const [profilesRes, groupsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
          : { data: [] },
        groupIds.length > 0
          ? supabase.from("groups").select("id, name, avatar_url").in("id", groupIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const groupMap = new Map((groupsRes.data || []).map((g: any) => [g.id, g]));

      return (data || []).map((p: any) => ({
        ...p,
        profile: profileMap.get(p.user_id),
        group: groupMap.get(p.group_id),
      }));
    },
    enabled: !!myGroupIds && myGroupIds.length > 0,
  });

  if (!groupPosts?.length) return null;

  return (
    <SidebarTabSection
      icon={Users}
      title="Group Activity"
      actionLabel="All Groups"
      onAction={() => navigate("/groups")}
    >
      {groupPosts.map((post: any) => (
        <div
          key={post.id}
          className="px-3 py-2.5 hover:bg-secondary/30 transition-colors cursor-pointer"
          onClick={() => navigate(`/groups/${post.group_id}`)}
        >
          <GroupHoverCard groupId={post.group_id} groupName={post.group?.name || "Group"} groupAvatarUrl={post.group?.avatar_url}>
            <div className="flex items-center gap-1.5 mb-1.5 cursor-pointer">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {post.group?.avatar_url ? (
                  <img src={post.group.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-3 h-3 text-primary" />
                )}
              </div>
              <span className="text-xs font-semibold text-primary truncate hover:underline">{post.group?.name || "Group"}</span>
            </div>
          </GroupHoverCard>

          <div className="flex items-start gap-2.5">
            <img
              src={post.profile?.avatar_url || defaultAvatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {post.profile?.display_name || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {post.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </SidebarTabSection>
  );
};

export default GroupActivityFeed;
