import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarTabSection from "@/components/SidebarTabSection";
import PageHoverCard from "@/components/PageHoverCard";

const PageRecommendations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [followingId, setFollowingId] = useState<string | null>(null);

  const { data: followedIds = [] } = useQuery({
    queryKey: ["my-followed-page-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("page_followers")
        .select("page_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((f: any) => f.page_id) as string[];
    },
    enabled: !!user,
  });

  const { data: myPageIds = [] } = useQuery({
    queryKey: ["my-page-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("pages")
        .select("id")
        .eq("created_by", user.id);
      if (error) throw error;
      return (data || []).map((p: any) => p.id) as string[];
    },
    enabled: !!user,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["page-suggestions", followedIds, myPageIds],
    queryFn: async () => {
      const excludeIds = [...followedIds, ...myPageIds];
      let query = supabase
        .from("pages")
        .select("id, name, slug, avatar_url, category, description")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data, error } = await query;
      if (error) throw error;

      const excludeSet = new Set(excludeIds);
      return (data || []).filter((p: any) => !excludeSet.has(p.id)).slice(0, 4);
    },
    enabled: !!user,
  });

  const handleFollow = async (pageId: string) => {
    if (!user) return;
    setFollowingId(pageId);
    try {
      await supabase.from("page_followers").insert({ page_id: pageId, user_id: user.id });
      toast.success("Agora você está seguindo esta página!");
      queryClient.invalidateQueries({ queryKey: ["my-followed-page-ids"] });
      queryClient.invalidateQueries({ queryKey: ["page-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["my-page-follows"] });
    } catch {
      toast.error("Algo deu errado");
    }
    setFollowingId(null);
  };

  if (!user || suggestions.length === 0) return null;

  return (
    <SidebarTabSection
      icon={Flag}
      title="Páginas Sugeridas"
      actionLabel="Todas as Páginas"
      onAction={() => navigate("/pages")}
    >
      {suggestions.map((page: any) => (
        <div
          key={page.id}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors"
        >
          <PageHoverCard pageId={page.id} pageName={page.name} pageSlug={page.slug} pageAvatarUrl={page.avatar_url}>
            <div
              className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/pages/${page.slug}`)}
            >
              {page.avatar_url ? (
                <img src={page.avatar_url} alt={page.name} className="w-full h-full object-cover" />
              ) : (
                <Flag className="w-5 h-5 text-primary" />
              )}
            </div>
          </PageHoverCard>
          <PageHoverCard pageId={page.id} pageName={page.name} pageSlug={page.slug} pageAvatarUrl={page.avatar_url}>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold text-foreground truncate cursor-pointer hover:underline"
                onClick={() => navigate(`/pages/${page.slug}`)}
              >
                {page.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">{page.category}</p>
            </div>
          </PageHoverCard>
          <button
            onClick={() => handleFollow(page.id)}
            disabled={followingId === page.id}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
            title="Seguir"
          >
            {followingId === page.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </SidebarTabSection>
  );
};

export default PageRecommendations;
