// Ad Performance Dashboard v2
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Eye, MousePointerClick, TrendingUp, Zap, Megaphone, ShieldCheck, CalendarIcon, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { isAdCapped, getImpressionCount, DEFAULT_MAX_IMPRESSIONS } from "@/lib/adFrequencyCap";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

const PRESET_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const AdPerformanceDashboard = () => {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: promotedListings = [] } = useQuery({
    queryKey: ["my-promoted-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("promoted_listings")
        .select("*, listings(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: sponsoredPosts = [] } = useQuery({
    queryKey: ["my-sponsored-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("sponsored_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Filter by date range
  const filterByDate = (items: any[]) => {
    if (!dateFrom && !dateTo) return items;
    return items.filter((item) => {
      const created = new Date(item.created_at);
      const from = dateFrom ? startOfDay(dateFrom) : new Date(0);
      const to = dateTo ? endOfDay(dateTo) : new Date();
      return isWithinInterval(created, { start: from, end: to });
    });
  };

  const filteredListings = useMemo(() => filterByDate(promotedListings), [promotedListings, dateFrom, dateTo]);
  const filteredPosts = useMemo(() => filterByDate(sponsoredPosts), [sponsoredPosts, dateFrom, dateTo]);
  const hasDateFilter = dateFrom || dateTo;

  const applyPreset = (days: number) => {
    setDateFrom(subDays(new Date(), days));
    setDateTo(new Date());
  };

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const totalImpressions = [...filteredListings, ...filteredPosts].reduce(
    (sum: number, item: any) => sum + (item.impressions || 0), 0
  );
  const totalClicks = [...filteredListings, ...filteredPosts].reduce(
    (sum: number, item: any) => sum + (item.clicks || 0), 0
  );
  const totalSpent = [...filteredListings, ...filteredPosts].reduce(
    (sum: number, item: any) => sum + (item.credits_spent || 0), 0
  );
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  const cappedCount = filteredPosts.filter((p: any) => isAdCapped(p.id, (p as any).frequency_cap ?? DEFAULT_MAX_IMPRESSIONS)).length;
  const avgFrequency = filteredPosts.length > 0
    ? (filteredPosts.reduce((sum: number, p: any) => sum + getImpressionCount(p.id), 0) / filteredPosts.length).toFixed(1)
    : "0.0";

  const categoryStats = filteredPosts.reduce((acc: Record<string, { impressions: number; clicks: number; count: number }>, p: any) => {
    const cat = p.target_category || "Untargeted";
    if (!acc[cat]) acc[cat] = { impressions: 0, clicks: 0, count: 0 };
    acc[cat].impressions += p.impressions || 0;
    acc[cat].clicks += p.clicks || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryStats).map(([category, s]) => {
    const stats = s as { impressions: number; clicks: number; count: number };
    return {
      name: category,
      impressions: stats.impressions,
      clicks: stats.clicks,
      ctr: stats.impressions > 0 ? parseFloat(((stats.clicks / stats.impressions) * 100).toFixed(1)) : 0,
      count: stats.count,
    };
  });

  const chartData = [
    ...filteredListings.map((p: any) => ({
      name: (p.listings as any)?.title?.slice(0, 15) || "Listing",
      impressions: p.impressions || 0,
      clicks: p.clicks || 0,
      type: "listing",
    })),
    ...filteredPosts.map((p: any, i: number) => ({
      name: `Ad #${i + 1}`,
      impressions: p.impressions || 0,
      clicks: p.clicks || 0,
      type: "post",
    })),
  ].slice(0, 8);

  if (promotedListings.length === 0 && sponsoredPosts.length === 0) return null;

  return (
    <div className="rounded-lg bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Ad Performance</h3>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_RANGES.map((preset) => (
          <Button
            key={preset.days}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1.5", dateFrom && "border-primary")}>
              <CalendarIcon className="w-3 h-3" />
              {dateFrom ? format(dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">–</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1.5", dateTo && "border-primary")}>
              <CalendarIcon className="w-3 h-3" />
              {dateTo ? format(dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {hasDateFilter && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={clearDates}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {hasDateFilter && (
        <p className="text-[10px] text-muted-foreground">
          Showing {filteredListings.length + filteredPosts.length} of {promotedListings.length + sponsoredPosts.length} ads
          {dateFrom && dateTo && ` from ${format(dateFrom, "MMM d, yyyy")} to ${format(dateTo, "MMM d, yyyy")}`}
        </p>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Impressions</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <MousePointerClick className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalClicks.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Clicks</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <TrendingUp className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{overallCtr}%</p>
          <p className="text-[10px] text-muted-foreground">CTR</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <ShieldCheck className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{avgFrequency}x</p>
          <p className="text-[10px] text-muted-foreground">Avg Freq</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <span className="text-sm font-bold block mb-1">🪙</span>
          <p className="text-lg font-bold text-foreground">{totalSpent}</p>
          <p className="text-[10px] text-muted-foreground">Spent</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Impressions" />
              <Bar dataKey="clicks" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryChartData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Category</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) =>
                    name === "ctr" ? [`${value}%`, "CTR"] : [value, name === "impressions" ? "Impressions" : "Clicks"]
                  }
                />
                <Bar dataKey="impressions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="impressions" />
                <Bar dataKey="clicks" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="clicks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {categoryChartData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">{cat.name}</Badge>
                  <span className="text-[11px] text-muted-foreground">{cat.count} ad{cat.count !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{cat.impressions.toLocaleString()} views</span>
                  <span>{cat.clicks.toLocaleString()} clicks</span>
                  <span className="font-medium text-foreground">{cat.ctr}% CTR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual items */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredListings.map((p: any) => {
          const isActive = p.is_active && new Date(p.end_date) > new Date();
          const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : "0.0";
          return (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 min-w-0">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">
                  {(p.listings as any)?.title || "Listing"}
                </span>
                <Badge variant={isActive ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 shrink-0">
                  {isActive ? "Active" : "Ended"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                <span>{p.impressions || 0} views</span>
                <span>{p.clicks || 0} clicks</span>
                <span>{ctr}% CTR</span>
              </div>
            </div>
          );
        })}
        {filteredPosts.map((p: any, i: number) => {
          const isActive = p.is_active && new Date(p.end_date) > new Date();
          const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : "0.0";
          const localFreq = getImpressionCount(p.id);
          const adCap = (p as any).frequency_cap ?? DEFAULT_MAX_IMPRESSIONS;
          const capped = isAdCapped(p.id, adCap);
          return (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">
                  {p.content?.slice(0, 30) || `Sponsored Ad #${i + 1}`}
                </span>
                <Badge variant={isActive ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 shrink-0">
                  {isActive ? "Active" : "Ended"}
                </Badge>
                {capped && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                    Capped
                  </Badge>
                )}
                {p.target_category && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                    {p.target_category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                <span>{p.impressions || 0} views</span>
                <span>{p.clicks || 0} clicks</span>
                <span>{ctr}% CTR</span>
                <span className={capped ? "text-destructive font-medium" : ""}>{localFreq}/{adCap} freq</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdPerformanceDashboard;
