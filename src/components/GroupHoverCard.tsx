import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GROUP_CATEGORY_LABELS } from "@/constants/groupCategories";
interface GroupHoverCardProps {
  groupId: string;
  groupName: string;
  groupAvatarUrl?: string | null;
  children: React.ReactNode;
}

const GroupHoverCard = ({ groupId, groupName, groupAvatarUrl, children }: GroupHoverCardProps) => {
  const navigate = useNavigate();

  const { data: groupInfo } = useQuery({
    queryKey: ["group-hover-info", groupId],
    queryFn: async () => {
      const [groupRes, membersRes, postsRes] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).single(),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "approved"),
        supabase.from("group_posts").select("id", { count: "exact", head: true }).eq("group_id", groupId),
      ]);
      return {
        group: groupRes.data,
        memberCount: membersRes.count ?? 0,
        postCount: postsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const group = groupInfo?.group;

  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72 p-0 overflow-hidden" side="bottom" align="start">
        {/* Cover */}
        <div
          className="h-16 bg-gradient-to-br from-primary/20 to-accent/20"
          style={
            group?.cover_photo_url
              ? { backgroundImage: `url(${group.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}
          }
        />

        <div className="px-3 pb-3 -mt-5">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-lg bg-primary/20 border-2 border-card flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            {(group?.avatar_url || groupAvatarUrl) ? (
              <img src={group?.avatar_url || groupAvatarUrl!} alt={groupName} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
          </div>

          {/* Name */}
          <h4
            className="font-bold text-foreground text-sm mt-1.5 cursor-pointer hover:underline truncate"
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            {group?.name || groupName}
          </h4>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {group?.privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            <span>{group?.privacy === "private" ? "Privado" : "Público"}</span>
            {group?.category && group.category !== "General" && (
              <>
                <span>·</span>
                <span className="text-primary font-medium">{GROUP_CATEGORY_LABELS[group.category as any] || group.category}</span>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="font-semibold text-foreground">{groupInfo?.memberCount ?? "—"}</span> membros
            </span>
            <span>
              <span className="font-semibold text-foreground">{groupInfo?.postCount ?? "—"}</span> publicações
            </span>
          </div>

          {/* Description */}
          {group?.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{group.description}</p>
          )}

          {/* View button */}
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="w-full mt-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ver Grupo
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default GroupHoverCard;
