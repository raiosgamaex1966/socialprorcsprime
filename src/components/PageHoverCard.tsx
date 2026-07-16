import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Flag, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";

interface PageHoverCardProps {
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageAvatarUrl?: string | null;
  children: React.ReactNode;
}

const PageHoverCard = ({ pageId, pageName, pageSlug, pageAvatarUrl, children }: PageHoverCardProps) => {
  const navigate = useNavigate();

  const { data: pageInfo } = useQuery({
    queryKey: ["page-hover-info", pageId],
    queryFn: async () => {
      const [pageRes, followersRes, postsRes] = await Promise.all([
        supabase.from("pages").select("*").eq("id", pageId).single(),
        supabase.from("page_followers").select("id", { count: "exact", head: true }).eq("page_id", pageId),
        supabase.from("page_posts").select("id", { count: "exact", head: true }).eq("page_id", pageId),
      ]);
      return {
        page: pageRes.data,
        followerCount: followersRes.count ?? 0,
        postCount: postsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const page = pageInfo?.page;
  const slug = page?.slug || pageSlug;
  const categoryLabel = PAGE_CATEGORIES.find(c => c.value === page?.category)?.label || page?.category || "";

  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72 p-0 overflow-hidden" side="bottom" align="start">
        {/* Cover */}
        <div
          className="h-16 bg-gradient-to-br from-primary/20 to-accent/20"
          style={
            page?.cover_photo_url
              ? { backgroundImage: `url(${page.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}
          }
        />

        <div className="px-3 pb-3 -mt-5">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-lg bg-primary/20 border-2 border-card flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => navigate(`/pages/${slug}`)}
          >
            {(page?.avatar_url || pageAvatarUrl) ? (
              <img src={page?.avatar_url || pageAvatarUrl!} alt={pageName} className="w-full h-full object-cover" />
            ) : (
              <Flag className="w-5 h-5 text-primary" />
            )}
          </div>

          {/* Name */}
          <h4
            className="font-bold text-foreground text-sm mt-1.5 cursor-pointer hover:underline truncate"
            onClick={() => navigate(`/pages/${slug}`)}
          >
            {page?.name || pageName}
          </h4>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Flag className="w-3 h-3" />
            {categoryLabel && <span className="capitalize">{categoryLabel}</span>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span className="font-semibold text-foreground">{pageInfo?.followerCount ?? "—"}</span> seguidores
            </span>
            <span>
              <span className="font-semibold text-foreground">{pageInfo?.postCount ?? "—"}</span> publicações
            </span>
          </div>

          {/* Description */}
          {page?.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{page.description}</p>
          )}

          {/* View button */}
          <button
            onClick={() => navigate(`/pages/${slug}`)}
            className="w-full mt-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ver Página
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default PageHoverCard;