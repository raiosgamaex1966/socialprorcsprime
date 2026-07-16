import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HandCoins, Send, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MakeOfferButtonProps {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  currentPrice: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", icon: <Clock className="w-3 h-3" />, variant: "secondary" },
  accepted: { label: "Aceita", icon: <CheckCircle2 className="w-3 h-3" />, variant: "default" },
  rejected: { label: "Recusada", icon: <XCircle className="w-3 h-3" />, variant: "destructive" },
};

const MakeOfferButton = ({ listingId, sellerId, listingTitle, currentPrice }: MakeOfferButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: myOffers = [], isLoading } = useQuery({
    queryKey: ["my-offers", listingId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_offers")
        .select("*")
        .eq("listing_id", listingId)
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!listingId,
  });

  const hasPendingOffer = myOffers.some((o: any) => o.status === "pending");

  const submitOffer = async () => {
    if (!user || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Insira um valor válido");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("listing_offers").insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        amount: numAmount,
        message: message.trim() || null,
      });
      if (error) throw error;

      // Notify seller
      await supabase.from("notifications").insert({
        user_id: sellerId,
        actor_id: user.id,
        type: "offer",
        message: `fez uma oferta de R$ ${numAmount.toLocaleString()} em "${listingTitle}"`,
        reference_id: listingId,
      });

      toast.success("Oferta enviada!");
      setAmount("");
      setMessage("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-offers", listingId, user.id] });
    } catch {
      toast.error("Falha ao enviar oferta");
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawOffer = async (offerId: string) => {
    const { error } = await supabase.from("listing_offers").delete().eq("id", offerId);
    if (error) {
      toast.error("Falha ao retirar oferta");
      return;
    }
    toast.success("Oferta retirada");
    queryClient.invalidateQueries({ queryKey: ["my-offers", listingId, user?.id] });
  };

  if (!user || user.id === sellerId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          <HandCoins className="w-4 h-4 mr-2" /> Fazer Proposta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-primary" /> Fazer Proposta
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Preço do anúncio: <span className="font-semibold text-foreground">R$ {currentPrice.toLocaleString()}</span>
        </p>

        {/* Previous offers */}
        {myOffers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Suas propostas</p>
            {myOffers.map((offer: any) => {
              const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;
              return (
                <div key={offer.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">R$ {Number(offer.amount).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant} className="text-[10px] flex items-center gap-1">
                      {cfg.icon} {cfg.label}
                    </Badge>
                    {offer.status === "pending" && (
                      <button
                        onClick={() => withdrawOffer(offer.id)}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Retirar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New offer form */}
        {!hasPendingOffer ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Sua proposta (R$)</label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Insira o valor"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Mensagem (opcional)</label>
              <Textarea
                placeholder="Escreva uma mensagem para o vendedor..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <Button className="w-full" onClick={submitOffer} disabled={submitting || !amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Proposta
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Você já tem uma proposta pendente. Retire-a para enviar uma nova.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferButton;
