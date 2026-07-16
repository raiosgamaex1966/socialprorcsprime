import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Coins, Gift, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AppPageShell from "@/components/AppPageShell";
import GiftCreditsModal from "@/components/GiftCreditsModal";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";

const Credits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [giftOpen, setGiftOpen] = useState(false);

  const { data: balance = 0 } = useQuery({
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

  const { data: transactions = [] } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const pagination = usePagination(transactions, 10);

  const claimFreeCredits = async () => {
    if (!user) return;
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
      await supabase.from("promotion_credits").insert({ user_id: user.id, balance: 50 });
    }

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: 50,
      type: "bonus",
      description: "Créditos de bônus de boas-vindas",
    });

    toast.success("Você recebeu 50 créditos de promoção grátis!");
    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
    queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
  };

  const totalReceived = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const getTypeBadge = (type: string, amount: number) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      bonus: { label: "Bônus", variant: "default" },
      gift_received: { label: "Presente Recebido", variant: "default" },
      gift_sent: { label: "Presente Enviado", variant: "secondary" },
      spend: { label: "Gasto", variant: "destructive" },
      promotion: { label: "Promoção", variant: "destructive" },
    };
    const c = config[type] || { label: type, variant: amount > 0 ? "default" : "secondary" };
    return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
  };

  return (
    <AppPageShell as="div">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Créditos</h1>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-3xl font-bold text-foreground">{balance}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-3xl font-bold text-green-600">+{totalReceived}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-3xl font-bold text-destructive font-bold">-{totalSpent}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {balance === 0 && (
            <Button onClick={claimFreeCredits} variant="outline" className="gap-2">
              <Gift className="w-4 h-4" /> Resgatar 50 Créditos Grátis
            </Button>
          )}
          <Button onClick={() => setGiftOpen(true)} className="gap-2">
            <Gift className="w-4 h-4" /> Presentear Créditos para Amigo
          </Button>
        </div>

        {/* Transaction history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Histórico de Transações
            </CardTitle>
            <CardDescription>{transactions.length} transações no total</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação ainda</p>
            ) : (
              <div className="space-y-2">
                {pagination.paginatedItems.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                        {tx.amount > 0 ? (
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()} · {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getTypeBadge(tx.type, tx.amount)}
                      <span className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </span>
                    </div>
                  </div>
                ))}
                <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GiftCreditsModal open={giftOpen} onOpenChange={setGiftOpen} />
    </AppPageShell>
  );
};

export default Credits;
