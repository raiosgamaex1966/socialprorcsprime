import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Flame, Eye, Heart, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TrendingListings = () => {
  const { user } = useAuth();

  const { data: trending = [] } = useQuery({
    queryKey: ["trending-listings"],
    queryFn: async () => {
      // Get view counts per listing
      const { data: views } = await supabase
        .from("listing_views")
        .select("listing_id");

      // Get save counts per listing
      const { data: saves } = await supabase
        .from("saved_listings")
        .select("listing_id");

      // Get offer counts per listing
      const { data: offers } = await supabase
        .from("listing_offers")
        .select("listing_id");

      // Aggregate scores
      const scores: Record<string, { views: number; saves: number; offers: number; score: number }> = {};

      (views || []).forEach((v: any) => {
        if (!scores[v.listing_id]) scores[v.listing_id] = { views: 0, saves: 0, offers: 0, score: 0 };
        scores[v.listing_id].views++;
      });
      (saves || []).forEach((s: any) => {
        if (!scores[s.listing_id]) scores[s.listing_id] = { views: 0, saves: 0, offers: 0, score: 0 };
        scores[s.listing_id].saves++;
      });
      (offers || []).forEach((o: any) => {
        if (!scores[o.listing_id]) scores[o.listing_id] = { views: 0, saves: 0, offers: 0, score: 0 };
        scores[o.listing_id].offers++;
      });

      // Calculate weighted score: views*1 + saves*3 + offers*5
      for (const id of Object.keys(scores)) {
        const s = scores[id];
        s.score = s.views + s.saves * 3 + s.offers * 5;
      }

      // Get top listing IDs sorted by score
      const topIds = Object.entries(scores)
        .sort(([, a], [, b]) => b.score - a.score)
        .slice(0, 6)
        .map(([id]) => id);

      if (topIds.length === 0) return [];

      // Fetch listing details
      const { data: listings } = await supabase
        .from("listings")
        .select("*")
        .in("id", topIds)
        .eq("status", "active");

      if (!listings) return [];

      // Sort by score and attach metrics
      return listings
        .map((l: any) => ({ ...l, metrics: scores[l.id] }))
        .sort((a: any, b: any) => (b.metrics?.score || 0) - (a.metrics?.score || 0));
    },
    enabled: !!user,
    staleTime: 60000,
  });

  if (trending.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
        <Flame className="w-4 h-4 text-orange-500" /> Trending Now
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
        {trending.map((item: any, index: number) => {
          const thumb = item.image_url || (item.image_urls && item.image_urls[0]);
          return (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="shrink-0 w-44 rounded-lg overflow-hidden bg-card shadow-sm group"
            >
              <div className="relative aspect-[4/3] bg-secondary">
                {thumb ? (
                  <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                {index < 3 && (
                  <Badge className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0 bg-orange-500 text-white border-0">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> #{index + 1}
                  </Badge>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold text-foreground">${Number(item.price).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  {item.metrics?.views > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> {item.metrics.views}
                    </span>
                  )}
                  {item.metrics?.saves > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" /> {item.metrics.saves}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingListings;
