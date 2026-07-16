import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Package, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryTranslations: Record<string, string> = {
  "General": "Geral",
  "Electronics": "Eletrônicos",
  "Vehicles": "Veículos",
  "Furniture": "Móveis",
  "Clothing": "Vestuário",
  "Sports": "Esportes",
  "Home & Garden": "Casa & Jardim",
  "Other": "Outros",
};

const RecommendedListings = ({ onBrowseCategories }: { onBrowseCategories?: () => void }) => {
  const { user } = useAuth();

  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's saved listing categories to understand preferences
      const { data: savedListings } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id);

      let preferredCategories: string[] = [];

      if (savedListings && savedListings.length > 0) {
        const savedIds = savedListings.map((s: any) => s.listing_id);
        const { data: savedDetails } = await supabase
          .from("listings")
          .select("category")
          .in("id", savedIds);

        if (savedDetails) {
          // Count category frequency
          const catCount: Record<string, number> = {};
          savedDetails.forEach((l: any) => {
            catCount[l.category] = (catCount[l.category] || 0) + 1;
          });
          preferredCategories = Object.entries(catCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat]) => cat);
        }
      }

      // Also check recently viewed categories from listing_views
      const { data: viewedListings } = await supabase
        .from("listing_views")
        .select("listing_id")
        .eq("viewer_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(10);

      if (viewedListings && viewedListings.length > 0) {
        const viewedIds = viewedListings.map((v: any) => v.listing_id);
        const { data: viewedDetails } = await supabase
          .from("listings")
          .select("category")
          .in("id", viewedIds);

        if (viewedDetails) {
          const catCount: Record<string, number> = {};
          viewedDetails.forEach((l: any) => {
            catCount[l.category] = (catCount[l.category] || 0) + 1;
          });
          const viewedCats = Object.entries(catCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([cat]) => cat);
          preferredCategories = [...new Set([...preferredCategories, ...viewedCats])];
        }
      }

      // Get IDs to exclude (user's own + already saved)
      const excludeIds = new Set([
        ...((savedListings || []).map((s: any) => s.listing_id)),
      ]);

      // Fetch recommendations based on preferred categories
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (preferredCategories.length > 0) {
        query = query.in("category", preferredCategories);
      }

      const { data: listings } = await query;
      if (!listings) return [];

      // Filter out already saved and limit
      return listings
        .filter((l: any) => !excludeIds.has(l.id))
        .slice(0, 6);
    },
    enabled: !!user,
    staleTime: 120000,
  });

  if (recommended.length === 0) return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-primary" /> Recomendados para Você
      </h3>
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma recomendação ainda</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Salve anúncios e navegue por diferentes categorias para receber recomendações personalizadas
        </p>
        {onBrowseCategories && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onBrowseCategories}>
            <Grid3X3 className="w-4 h-4 mr-1" /> Navegar por Categorias
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-primary" /> Recomendados para Você
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
        {recommended.map((item: any) => {
          const thumb = item.image_url || (item.image_urls && item.image_urls[0]);
          return (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="shrink-0 w-40 rounded-lg overflow-hidden bg-card shadow-sm group"
            >
              <div className="aspect-square bg-secondary">
                {thumb ? (
                  <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold text-foreground">R$ {Number(item.price).toLocaleString("pt-BR")}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.title}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {categoryTranslations[item.category] || item.category}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendedListings;
