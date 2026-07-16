import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Coins, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface GiftCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected recipient (admin gifting to specific user) */
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string;
  /** If true, sender is admin/mod — no balance deduction */
  isAdminGift?: boolean;
}

const GiftCreditsModal = ({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  recipientAvatar,
  isAdminGift = false,
}: GiftCreditsModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; avatar: string | null } | null>(
    recipientId ? { id: recipientId, name: recipientName || "", avatar: recipientAvatar || null } : null
  );

  // Fetch sender's balance (for user-to-user gifts)
  const { data: senderBalance = 0 } = useQuery({
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
    enabled: !!user && !isAdminGift,
  });

  // Search friends for user-to-user gifting
  const { data: friends = [] } = useQuery({
    queryKey: ["gift-friend-search", friendSearch],
    queryFn: async () => {
      if (!user || friendSearch.length < 2) return [];
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships?.length) return [];
      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds)
        .ilike("display_name", `%${friendSearch}%`)
        .limit(10);

      return (profiles || []).map((p) => ({
        id: p.user_id,
        name: p.display_name || "Unknown",
        avatar: p.avatar_url,
      }));
    },
    enabled: !!user && !isAdminGift && !recipientId && friendSearch.length >= 2,
  });

  const handleSend = async () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Insira um valor válido");
      return;
    }
    const target = selectedFriend || (recipientId ? { id: recipientId, name: recipientName || "", avatar: recipientAvatar || null } : null);
    if (!target) {
      toast.error("Selecione um destinatário");
      return;
    }
    if (!isAdminGift && numAmount > senderBalance) {
      toast.error("Créditos insuficientes");
      return;
    }
    if (!user) return;

    setSending(true);
    try {
      // 1. Get or create recipient's credit record
      const { data: recipientCredits } = await supabase
        .from("promotion_credits")
        .select("id, balance")
        .eq("user_id", target.id)
        .maybeSingle();

      if (recipientCredits) {
        await supabase
          .from("promotion_credits")
          .update({ balance: recipientCredits.balance + numAmount })
          .eq("user_id", target.id);
      } else {
        await supabase.from("promotion_credits").insert({
          user_id: target.id,
          balance: numAmount,
        });
      }

      // 2. Log transaction for recipient
      await supabase.from("credit_transactions").insert({
        user_id: target.id,
        amount: numAmount,
        type: "gift_received",
        description: isAdminGift
          ? `Presente do administrador: ${message || "Sem mensagem"}`
          : `Presente de ${user.email}: ${message || "Sem mensagem"}`,
      });

      // 3. If user-to-user, deduct from sender
      if (!isAdminGift) {
        const { data: senderCredits } = await supabase
          .from("promotion_credits")
          .select("id, balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (senderCredits) {
          await supabase
            .from("promotion_credits")
            .update({ balance: senderCredits.balance - numAmount })
            .eq("user_id", user.id);
        }

        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          amount: -numAmount,
          type: "gift_sent",
          description: `Presente para ${target.name}: ${message || "Sem mensagem"}`,
        });
      }

      // 4. Create in-app notification for recipient
      const senderProfile = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const senderName = senderProfile.data?.display_name || user.email || "Alguém";

      await supabase.from("notifications").insert({
        user_id: target.id,
        actor_id: user.id,
        type: isAdminGift ? "admin_credit_gift" : "credit_gift",
        message: isAdminGift
          ? `enviou para você ${numAmount} créditos de bônus${message ? `: "${message}"` : ""}`
          : `enviou para você ${numAmount} créditos${message ? `: "${message}"` : ""}`,
        reference_id: null,
      });

      toast.success(`${numAmount} créditos enviados para ${target.name}!`);

      // 5. Low balance warning for sender (user-to-user only)
      if (!isAdminGift) {
        const newBalance = senderBalance - numAmount;
        if (newBalance > 0 && newBalance <= 10) {
          toast.warning(`Saldo baixo! Você tem ${newBalance} créditos restantes.`, { duration: 5000 });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setAmount("");
      setMessage("");
      setSelectedFriend(null);
      onOpenChange(false);
    } catch (err) {
      toast.error("Falha ao enviar créditos");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            {isAdminGift ? "Enviar Créditos de Presente" : "Presentear Créditos para Amigo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient selection */}
          {recipientId ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Avatar className="w-10 h-10">
                <AvatarImage src={recipientAvatar || ""} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(recipientName || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-foreground">{recipientName || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">Destinatário</p>
              </div>
            </div>
          ) : !isAdminGift ? (
            <div className="space-y-2">
              <Label>Pesquisar Amigo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={friendSearch}
                  onChange={(e) => { setFriendSearch(e.target.value); setSelectedFriend(null); }}
                  placeholder="Pesquisar por nome..."
                  className="pl-9"
                />
              </div>
              {friends.length > 0 && !selectedFriend && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                  {friends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedFriend(f); setFriendSearch(f.name); }}
                      className="flex items-center gap-2 w-full p-2 hover:bg-secondary/50 text-left"
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={f.avatar || ""} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{f.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedFriend && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={selectedFriend.avatar || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{selectedFriend.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{selectedFriend.name}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <Input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Insira a quantidade de créditos"
                className="pl-9"
              />
            </div>
            {!isAdminGift && (
              <p className="text-xs text-muted-foreground">
                Seu saldo: <span className="font-semibold text-foreground">{senderBalance}</span> créditos
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[10, 25, 50, 100, 250, 500].map((v) => (
              <Button
                key={v}
                size="sm"
                variant={amount === String(v) ? "default" : "outline"}
                onClick={() => setAmount(String(v))}
                className="text-xs"
              >
                {v}
              </Button>
            ))}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Adicionar uma nota..."
              rows={2}
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
            <Gift className="w-4 h-4" />
            {sending ? "Enviando..." : `Enviar ${amount || "0"} Créditos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftCreditsModal;
