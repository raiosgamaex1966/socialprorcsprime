import { Users, Flag, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";
import PageHoverCard from "@/components/PageHoverCard";

interface PageCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  category: string;
  followerCount: number;
  isFollowing: boolean;
  onFollow: (pageId: string) => void;
  following?: boolean;
}

const PageCard = ({ id, name, slug, description, avatarUrl, coverPhotoUrl, category, followerCount, isFollowing, onFollow, following }: PageCardProps) => {
  const navigate = useNavigate();
  const categoryLabel = PAGE_CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Cover */}
      <div
        className="h-28 bg-gradient-to-br from-primary/20 to-primary/5 cursor-pointer"
        style={coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        onClick={() => navigate(`/pages/${slug}`)}
      />

      <div className="p-4 pt-0 -mt-8">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-xl border-4 border-card bg-secondary flex items-center justify-center overflow-hidden cursor-pointer shadow-sm"
          onClick={() => navigate(`/pages/${slug}`)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Flag className="w-7 h-7 text-primary" />
          )}
        </div>

        {/* Info */}
        <div className="mt-2">
          <PageHoverCard pageId={id} pageName={name} pageSlug={slug} pageAvatarUrl={avatarUrl}>
            <h3
              className="font-bold text-foreground text-[15px] hover:underline cursor-pointer truncate"
              onClick={() => navigate(`/pages/${slug}`)}
            >
              {name}
            </h3>
          </PageHoverCard>
          <p className="text-xs text-muted-foreground mt-0.5">{categoryLabel}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Heart className="w-3 h-3" />
            <span>{followerCount} {followerCount === 1 ? "seguidor" : "seguidores"}</span>
          </div>
        </div>

        {/* Follow button */}
        <button
          onClick={() => onFollow(id)}
          disabled={following}
          className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            isFollowing
              ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isFollowing ? "Seguindo" : "Seguir"}
        </button>
      </div>
    </div>
  );
};

export default PageCard;
