import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Package, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import SidebarSection from "./SidebarSection";

const MarketplaceContextSidebar = () => {
  const { user } = useAuth();

  const { data: trending = [] } = useQuery({
    queryKey: ["sidebar-trending-listings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, image_url, category")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ["sidebar-marketplace-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { count: myListings } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      const { count: myOffers } = await supabase
        .from("listing_offers")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .eq("status", "pending");
      return { myListings: myListings || 0, pendingOffers: myOffers || 0 };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return (
    <div className="space-y-4">
      {stats && (
        <SidebarSection title="Sua Atividade" icon={DollarSign}>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{stats.myListings}</p>
              <p className="text-[11px] text-muted-foreground">Anúncios Ativos</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{stats.pendingOffers}</p>
              <p className="text-[11px] text-muted-foreground">Ofertas Pendentes</p>
            </div>
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="Adicionados Recentemente" icon={TrendingUp}>
        <div className="space-y-2">
          {trending.map((item) => (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                <p className="text-[12px] text-primary font-semibold">${item.price}</p>
              </div>
            </Link>
          ))}
          {trending.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum anúncio ainda</p>
          )}
        </div>
      </SidebarSection>
    </div>
  );
};

export default MarketplaceContextSidebar;
