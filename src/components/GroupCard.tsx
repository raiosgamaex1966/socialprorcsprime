import { Globe, Lock, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GroupHoverCard from "@/components/GroupHoverCard";
import { GROUP_CATEGORY_LABELS } from "@/constants/groupCategories";

interface GroupCardProps {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  privacy: string;
  category?: string | null;
  memberCount: number;
  isMember: boolean;
  onJoin: (groupId: string) => void;
  joining?: boolean;
  trending?: boolean;
}

const GroupCard = ({ id, name, description, avatarUrl, coverPhotoUrl, privacy, category, memberCount, isMember, onJoin, joining, trending }: GroupCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden relative">
      {/* Trending badge */}
      {trending && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
          <TrendingUp className="w-3 h-3" />
          Em Alta
        </div>
      )}

      {/* Cover */}
      <div
        className="h-24 bg-gradient-to-br from-primary/20 to-accent/20 cursor-pointer"
        style={coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        onClick={() => navigate(`/groups/${id}`)}
      />

      <div className="p-3 -mt-8">
        {/* Avatar */}
        <div className="flex items-end justify-between">
          <div
            className="w-14 h-14 rounded-xl bg-primary/20 border-2 border-card flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => navigate(`/groups/${id}`)}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-7 h-7 text-primary" />
            )}
          </div>

          {/* Member count badge */}
          <div className="flex items-center gap-1 bg-secondary/80 backdrop-blur-sm text-foreground text-xs font-semibold px-2.5 py-1 rounded-full mb-1">
            <Users className="w-3 h-3 text-muted-foreground" />
            {memberCount}
          </div>
        </div>

        <div className="mt-2">
          <GroupHoverCard groupId={id} groupName={name} groupAvatarUrl={avatarUrl}>
            <h3
              className="font-bold text-foreground text-sm truncate cursor-pointer hover:underline"
              onClick={() => navigate(`/groups/${id}`)}
            >
              {name}
            </h3>
          </GroupHoverCard>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            <span>{privacy === "private" ? "Privado" : "Público"}</span>
            {category && category !== "General" && (
              <>
                <span>·</span>
                <span className="text-primary font-medium">{GROUP_CATEGORY_LABELS[category as any] || category}</span>
              </>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
        </div>

        <div className="mt-3">
          {isMember ? (
            <button
              onClick={() => navigate(`/groups/${id}`)}
              className="w-full py-1.5 text-sm font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              Ver Grupo
            </button>
          ) : (
            <button
              onClick={() => onJoin(id)}
              disabled={joining}
              className="w-full py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {joining ? "Entrando..." : privacy === "private" ? "Solicitar Entrada" : "Participar do Grupo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
