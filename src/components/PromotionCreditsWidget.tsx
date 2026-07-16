import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Coins, Plus, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PromotionCreditsWidget = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const claimFreeCredits = async () => {
    if (!user) return;

    // Check if user already has a credits record
    const { data: existing } = await supabase
      .from("promotion_credits")
      .select("id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("promotion_credits")
        .update({ balance: existing.balance + 50 })
        .eq("user_id", user.id);
    } else {
      await supabase.from("promotion_credits").insert({
        user_id: user.id,
        balance: 50,
      });
    }

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: 50,
      type: "bonus",
      description: "Créditos de bônus de boas-vindas",
    });

    toast.success("Você recebeu 50 créditos de promoção gratuitos!");
    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
  };

  return (
    <div className="rounded-lg bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Créditos de Promoção</span>
        </div>
        <span className="text-lg font-bold text-foreground">{creditBalance}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Use créditos para impulsionar anúncios e criar publicações patrocinadas.
      </p>
      {creditBalance === 0 && (
        <Button size="sm" variant="outline" onClick={claimFreeCredits} className="w-full gap-1.5">
          <Gift className="w-3.5 h-3.5" /> Resgatar 50 Créditos Grátis
        </Button>
      )}
    </div>
  );
};

export default PromotionCreditsWidget;
