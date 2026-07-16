import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Flag, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import SidebarSection from "./SidebarSection";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";

const PagesContextSidebar = () => {
  const { user } = useAuth();

  const { data: followedPages = [] } = useQuery({
    queryKey: ["sidebar-followed-pages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: follows } = await supabase
        .from("page_followers")
        .select("page_id")
        .eq("user_id", user.id);
      if (!follows?.length) return [];
      const ids = follows.map((f) => f.page_id);
      const { data: pages } = await supabase
        .from("pages")
        .select("id, name, slug, avatar_url, category")
        .in("id", ids)
        .limit(6);
      return pages || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: trendingPages = [] } = useQuery({
    queryKey: ["sidebar-trending-pages"],
    queryFn: async () => {
      const { data: followerCounts } = await supabase
        .from("page_followers")
        .select("page_id");
      const counts: Record<string, number> = {};
      followerCounts?.forEach((f) => { counts[f.page_id] = (counts[f.page_id] || 0) + 1; });
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);
      if (!topIds.length) return [];
      const { data: pages } = await supabase
        .from("pages")
        .select("id, name, slug, avatar_url, category")
        .in("id", topIds);
      return (pages || []).map((p) => ({ ...p, followers: counts[p.id] || 0 }));
    },
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      {followedPages.length > 0 && (
        <SidebarSection title="Páginas que você segue" icon={Heart}>
          <div className="space-y-1">
            {followedPages.map((page) => (
              <Link
                key={page.id}
                to={`/pages/${page.slug}`}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <img
                  src={page.avatar_url || defaultAvatar}
                  alt={page.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{page.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {PAGE_CATEGORIES.find((c) => c.value === page.category)?.label || page.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}

      {trendingPages.length > 0 && (
        <SidebarSection title="Páginas Populares" icon={Sparkles}>
          <div className="space-y-1">
            {trendingPages.map((page: any) => (
              <Link
                key={page.id}
                to={`/pages/${page.slug}`}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <img
                  src={page.avatar_url || defaultAvatar}
                  alt={page.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{page.name}</p>
                  <p className="text-[11px] text-muted-foreground">{page.followers} {page.followers === 1 ? "seguidor" : "seguidores"}</p>
                </div>
              </Link>
            ))}
          </div>
        </SidebarSection>
      )}
    </div>
  );
};

export default PagesContextSidebar;
