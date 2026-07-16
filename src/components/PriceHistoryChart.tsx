import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PriceHistoryChartProps {
  listingId: string;
  currentPrice: number;
}

const PriceHistoryChart = ({ listingId, currentPrice }: PriceHistoryChartProps) => {
  const { data: history } = useQuery({
    queryKey: ["price-history", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_price_history")
        .select("price, changed_at")
        .eq("listing_id", listingId)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  if (!history || history.length <= 1) return null;

  const chartData = history.map((h) => ({
    date: format(new Date(h.changed_at), "d 'de' MMM", { locale: ptBR }),
    fullDate: format(new Date(h.changed_at), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR }),
    price: Number(h.price),
  }));

  const firstPrice = chartData[0].price;
  const lastPrice = chartData[chartData.length - 1].price;
  const priceDiff = lastPrice - firstPrice;
  const isDown = priceDiff < 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg bg-card px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{payload[0].payload.fullDate}</p>
        <p className="text-sm font-bold text-foreground">R$ {payload[0].value.toLocaleString()}</p>
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Histórico de Preços</h3>
        {priceDiff !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isDown ? "text-green-500" : "text-red-500"}`}>
            {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {isDown ? "-" : "+"}R$ {Math.abs(priceDiff).toLocaleString()}
          </div>
        )}
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDown ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isDown ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$ ${v}`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isDown ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={{ r: 3, fill: "hsl(var(--card))", stroke: isDown ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {chartData.length} {chartData.length === 1 ? "alteração de preço registrada" : "alterações de preço registradas"}
      </p>
    </div>
  );
};

export default PriceHistoryChart;
