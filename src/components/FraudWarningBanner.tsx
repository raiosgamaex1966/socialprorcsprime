import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";

interface FraudWarningBannerProps {
  listingId: string;
}

const severityConfig = {
  high: {
    icon: ShieldAlert,
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    label: "Alto Risco",
  },
  medium: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    label: "Atenção",
  },
  low: {
    icon: Info,
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    label: "Informativo",
  },
};

const FraudWarningBanner = ({ listingId }: FraudWarningBannerProps) => {
  const { data: signals = [] } = useQuery({
    queryKey: ["fraud-signals", listingId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("listing_fraud_signals")
        .select("*")
        .eq("listing_id", listingId)
        .eq("resolved", false)
        .order("severity", { ascending: true });
      return data || [];
    },
    enabled: !!listingId,
  });

  if (signals.length === 0) return null;

  // Use highest severity signal for the banner style
  const highestSeverity = signals.find((s: any) => s.severity === "high")
    ? "high"
    : signals.find((s: any) => s.severity === "medium")
    ? "medium"
    : "low";

  const config = severityConfig[highestSeverity as keyof typeof severityConfig];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-4 ${config.bg} space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${config.text} shrink-0`} />
        <h4 className={`text-sm font-bold ${config.text}`}>
          Alerta de Segurança: {config.label} — Prossiga com cautela
        </h4>
      </div>
      <ul className="space-y-1 ml-7">
        {signals.map((signal: any) => {
          const sc = severityConfig[signal.severity as keyof typeof severityConfig] || severityConfig.low;
          return (
            <li key={signal.id} className="flex items-start gap-2">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                signal.severity === "high" ? "bg-destructive" : signal.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
              }`} />
              <span className="text-xs text-foreground/80">{signal.description}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground ml-7">
        Estes sinais são detectados automaticamente. Sempre verifique a credibilidade do vendedor antes de realizar transações.
      </p>
    </div>
  );
};

export default FraudWarningBanner;
