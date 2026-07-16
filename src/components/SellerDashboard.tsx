import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, Heart, DollarSign, Package, BarChart3, TrendingUp, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const SellerDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["seller-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, price, status, image_url, image_urls, created_at")
        .eq("user_id", user.id);

      if (!listings || listings.length === 0) return null;

      const listingIds = listings.map((l: any) => l.id);
      const activeListings = listings.filter((l: any) => l.status === "active");
      const soldListings = listings.filter((l: any) => l.status === "sold");

      const { data: views } = await supabase
        .from("listing_views")
        .select("listing_id, viewed_at")
        .in("listing_id", listingIds);

      const { data: saves } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .in("listing_id", listingIds);

      const { data: offers } = await supabase
        .from("listing_offers")
        .select("listing_id, amount, status")
        .in("listing_id", listingIds);

      // Aggregate per listing
      const viewCount: Record<string, number> = {};
      const saveCount: Record<string, number> = {};
      const offerCount: Record<string, number> = {};

      (views || []).forEach((v: any) => {
        viewCount[v.listing_id] = (viewCount[v.listing_id] || 0) + 1;
      });
      (saves || []).forEach((s: any) => {
        saveCount[s.listing_id] = (saveCount[s.listing_id] || 0) + 1;
      });
      (offers || []).forEach((o: any) => {
        offerCount[o.listing_id] = (offerCount[o.listing_id] || 0) + 1;
      });

      const totalViews = Object.values(viewCount).reduce((a, b) => a + b, 0);
      const totalSaves = Object.values(saveCount).reduce((a, b) => a + b, 0);
      const totalOffers = (offers || []).length;
      const pendingOffers = (offers || []).filter((o: any) => o.status === "pending").length;
      const acceptedOffers = (offers || []).filter((o: any) => o.status === "accepted").length;

      // Revenue from accepted offers
      const revenue = (offers || [])
        .filter((o: any) => o.status === "accepted")
        .reduce((sum: number, o: any) => sum + Number(o.amount), 0);

      // Conversion rate: offers / views
      const conversionRate = totalViews > 0 ? ((totalOffers / totalViews) * 100) : 0;

      // Views over last 7 days for chart
      const now = new Date();
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().split("T")[0];
        const dayLabel = day.toLocaleDateString("pt-BR", { weekday: "short" });
        const dayViews = (views || []).filter((v: any) => v.viewed_at?.startsWith(dayStr)).length;
        chartData.push({ day: dayLabel, views: dayViews });
      }

      // Per-listing breakdown sorted by views
      const perListing = activeListings.map((l: any) => ({
        ...l,
        views: viewCount[l.id] || 0,
        saves: saveCount[l.id] || 0,
        offers: offerCount[l.id] || 0,
        saveRate: viewCount[l.id] ? (((saveCount[l.id] || 0) / viewCount[l.id]) * 100).toFixed(0) : "0",
      })).sort((a: any, b: any) => b.views - a.views);

      return {
        totalListings: listings.length,
        activeCount: activeListings.length,
        soldCount: soldListings.length,
        totalViews,
        totalSaves,
        totalOffers,
        pendingOffers,
        acceptedOffers,
        revenue,
        conversionRate,
        chartData,
        perListing,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  if (!stats) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Visualizações</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Salvos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalSaves.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Propostas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalOffers}</p>
          {stats.pendingOffers > 0 && (
            <p className="text-[10px] text-amber-500 font-medium">{stats.pendingOffers} pendentes</p>
          )}
        </div>
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Receita</span>
          </div>
          <p className="text-2xl font-bold text-foreground">R$ {stats.revenue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{stats.acceptedOffers} acordos</p>
        </div>
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Conversão</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.conversionRate.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">propostas/visitas</p>
        </div>
        <div className="rounded-lg bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Anúncios</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.activeCount}</p>
          <p className="text-[10px] text-muted-foreground">{stats.soldCount} vendidos</p>
        </div>
      </div>

      {/* Views chart */}
      {stats.chartData.some((d: any) => d.views > 0) && (
        <div className="rounded-lg bg-card shadow-sm p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Visualizações (Últimos 7 Dias)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-listing breakdown */}
      {stats.perListing.length > 0 && (
        <div className="rounded-lg bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Desempenho dos Anúncios</h3>
          </div>
          <div className="divide-y divide-border">
            {stats.perListing.slice(0, 8).map((item: any) => {
              const thumb = item.image_url || (item.image_urls && item.image_urls[0]);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">R$ {Number(item.price).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1" title="Visualizações">
                      <Eye className="w-3 h-3" /> {item.views}
                    </span>
                    <span className="flex items-center gap-1" title="Salvos">
                      <Heart className="w-3 h-3" /> {item.saves}
                    </span>
                    <span className="flex items-center gap-1" title="Propostas">
                      <DollarSign className="w-3 h-3" /> {item.offers}
                    </span>
                    <span className="text-[10px] text-muted-foreground" title="Taxa de salvamento">
                      {item.saveRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
