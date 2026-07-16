import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Coins, Clock } from "lucide-react";
import { toast } from "sonner";

interface BoostPageModalProps {
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageAvatarUrl?: string | null;
  onClose: () => void;
}

const BOOST_OPTIONS = [
  { days: 3, credits: 15, label: "3 Dias", description: "Pequeno impulso de visibilidade" },
  { days: 7, credits: 30, label: "7 Dias", description: "Escolha popular", popular: true },
  { days: 14, credits: 50, label: "14 Dias", description: "Exposição máxima" },
];

const BoostPageModal = ({ pageId, pageName, pageSlug, pageAvatarUrl, onClose }: BoostPageModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState(1);
  const [boosting, setBoosting] = useState(false);

  const { data: creditBalance = 0 } = useQuery({
    queryKey: ["promotion-credits", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("promotion_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.balance || 0;
    },
    enabled: !!user,
  });

  const option = BOOST_OPTIONS[selectedOption];
  const canAfford = creditBalance >= option.credits;

  const handleBoost = async () => {
    if (!user || !canAfford) return;
    setBoosting(true);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + option.days);

    const { error } = await supabase.from("sponsored_posts").insert({
      user_id: user.id,
      content: `📄 ${pageName} — Visite esta página para saber mais!`,
      image_url: pageAvatarUrl || null,
      link_url: `/pages/${pageSlug}`,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      credits_spent: option.credits,
      is_active: true,
    });

    if (error) {
      toast.error("Falha ao impulsionar página");
      setBoosting(false);
      return;
    }

    await supabase
      .from("promotion_credits")
      .update({ balance: creditBalance - option.credits })
      .eq("user_id", user.id);

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -option.credits,
      type: "spend",
      description: `Impulsionou página "${pageName}" por ${option.days} dia(s)`,
    });

    // Spending notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      actor_id: user.id,
      type: "credit_spent",
      message: `gastou ${option.credits} créditos impulsionando a página "${pageName}" por ${option.days} dia(s)`,
      reference_id: null,
    });

    toast.success(`Página impulsionada por ${option.days} dia(s)! ${option.credits} créditos usados.`);

    const newBalance = creditBalance - option.credits;
    if (newBalance > 0 && newBalance <= 10) {
      toast.warning(`Saldo baixo! Você tem ${newBalance} créditos restantes.`, { duration: 5000 });
    }

    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
    queryClient.invalidateQueries({ queryKey: ["sponsored-feed-posts"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setBoosting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Impulsionar Página</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Promova "${pageName}" para aparecer em mais feeds e alcançar novos seguidores.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> Seus Créditos
            </span>
            <span className="text-sm font-bold text-foreground">{creditBalance}</span>
          </div>

          <div className="space-y-2">
            {BOOST_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedOption(i)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedOption === i ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    {opt.popular && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">Popular</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground ml-5.5">{opt.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-foreground">{opt.credits}</span>
                </div>
              </button>
            ))}
          </div>

          {!canAfford && (
            <p className="text-xs text-destructive text-center">
              Créditos insuficientes. Você precisa de mais {option.credits - creditBalance}.
            </p>
          )}
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleBoost} disabled={!canAfford || boosting} className="flex-1">
            <Rocket className="w-4 h-4 mr-1" />
            {boosting ? "Impulsionando..." : `Impulsionar por ${option.credits} créditos`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BoostPageModal;
