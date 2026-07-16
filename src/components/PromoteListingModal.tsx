import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Zap, Coins, MapPin, Target, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface PromoteListingModalProps {
  listing: any;
  onClose: () => void;
}

const BOOST_OPTIONS = [
  { days: 1, credits: 5, label: "1 Dia", description: "Impulsionamento rápido" },
  { days: 3, credits: 12, label: "3 Dias", description: "Escolha popular" },
  { days: 7, credits: 25, label: "7 Dias", description: "Exposição máxima" },
];

const CATEGORY_OPTIONS = [
  "General", "Electronics", "Vehicles", "Furniture", "Clothing", "Sports", "Home & Garden", "Other",
];

const categoryTranslations: Record<string, string> = {
  "General": "Geral",
  "Electronics": "Eletrônicos",
  "Vehicles": "Veículos",
  "Furniture": "Móveis",
  "Clothing": "Vestuário",
  "Sports": "Esportes",
  "Home & Garden": "Casa & Jardim",
  "Other": "Outros",
};

const PromoteListingModal = ({ listing, onClose }: PromoteListingModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState(1);
  const [promoting, setPromoting] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);
  const [targetCategory, setTargetCategory] = useState(listing.category || "");
  const [targetLocation, setTargetLocation] = useState(listing.location || "");

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

  const handlePromote = async () => {
    if (!user || !canAfford) return;
    setPromoting(true);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + option.days);

    const { error: promoError } = await supabase.from("promoted_listings").insert({
      listing_id: listing.id,
      user_id: user.id,
      credits_spent: option.credits,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      target_category: targetCategory || null,
      target_location: targetLocation.trim() || null,
    });

    if (promoError) {
      toast.error("Falha ao promover anúncio");
      setPromoting(false);
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
      description: `Promoveu "${listing.title}" por ${option.days} dia(s)`,
    });

    // Create spending confirmation notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      actor_id: user.id,
      type: "credit_spent",
      message: `gastou ${option.credits} créditos impulsionando "${listing.title}" por ${option.days} dia(s)`,
      reference_id: listing.id,
    });

    toast.success(`Anúncio impulsionado por ${option.days} dia(s)! ${option.credits} créditos utilizados.`);

    // Low balance warning
    const newBalance = creditBalance - option.credits;
    if (newBalance > 0 && newBalance <= 10) {
      toast.warning(`Saldo baixo! Você tem ${newBalance} créditos restantes.`, { duration: 5000 });
    }

    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
    queryClient.invalidateQueries({ queryKey: ["promoted-listings"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setPromoting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Impulsionar Anúncio</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Coloque "{listing.title}" no topo dos resultados de pesquisa com um selo de Patrocinado.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Credit balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> Seus Créditos
            </span>
            <span className="text-sm font-bold text-foreground">{creditBalance}</span>
          </div>

          {/* Duration options */}
          <div className="space-y-2">
            {BOOST_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedOption(i)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedOption === i
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    {i === 1 && <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">Popular</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-foreground">{opt.credits}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Targeting Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTargeting(!showTargeting)}
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" /> Direcionamento de Público
              </span>
              <div className="flex items-center gap-2">
                {(targetCategory || targetLocation) && (
                  <Badge variant="secondary" className="text-[10px]">
                    {[targetCategory, targetLocation].filter(Boolean).length} {[targetCategory, targetLocation].filter(Boolean).length > 1 ? "filtros" : "filtro"}
                  </Badge>
                )}
                {showTargeting ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {showTargeting && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Mostre seu anúncio impulsionado para usuários que navegam em categorias ou localizações específicas.
                </p>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Categoria</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTargetCategory("")}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        !targetCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Todas
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setTargetCategory(cat === targetCategory ? "" : cat)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          targetCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {categoryTranslations[cat] || cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Localização</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="ex: São Paulo, SP"
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!canAfford && (
            <p className="text-xs text-destructive text-center">
              Créditos insuficientes. Você precisa de mais {option.credits - creditBalance}.
            </p>
          )}
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={handlePromote}
            disabled={!canAfford || promoting}
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-1" />
            {promoting ? "Impulsionando..." : `Impulsionar por ${option.credits} créditos`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoteListingModal;
