import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Rocket, Coins, MapPin, Target, ChevronDown, ChevronUp,
  Eye, MousePointerClick, Clock, Users, Zap,
} from "lucide-react";
import { toast } from "sonner";

interface BoostPostModalProps {
  postId: string;
  postContent: string;
  onClose: () => void;
}

const BOOST_OPTIONS = [
  { days: 1, credits: 5, label: "1 Dia", description: "Aumento rápido de visibilidade" },
  { days: 3, credits: 12, label: "3 Dias", description: "Escolha popular", popular: true },
  { days: 7, credits: 25, label: "7 Dias", description: "Alcance máximo" },
];

const CATEGORY_OPTIONS = [
  "General", "Technology", "Sports", "Entertainment", "News", "Business", "Lifestyle", "Other",
];

const CATEGORY_LABELS: Record<string, string> = {
  "General": "Geral",
  "Technology": "Tecnologia",
  "Sports": "Esportes",
  "Entertainment": "Entretenimento",
  "News": "Notícias",
  "Business": "Negócios",
  "Lifestyle": "Estilo de Vida",
  "Other": "Outro",
};

const BoostPostModal = ({ postId, postContent, onClose }: BoostPostModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState(1);
  const [boosting, setBoosting] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);
  const [targetCategory, setTargetCategory] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [frequencyCap, setFrequencyCap] = useState(3);

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

  // Check if post is already boosted
  const { data: existingBoost } = useQuery({
    queryKey: ["post-boost-status", postId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("sponsored_posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString());
      // Match by content snippet (since sponsored_posts stores content, not post_id)
      return data?.find((sp: any) => sp.content?.includes(postContent.slice(0, 50))) || null;
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
      content: postContent,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      credits_spent: option.credits,
      target_category: targetCategory || null,
      target_location: targetLocation.trim() || null,
      target_gender: targetGender || null,
      frequency_cap: frequencyCap,
      is_active: true,
    });

    if (error) {
      toast.error("Falha ao impulsionar publicação");
      setBoosting(false);
      return;
    }

    // Deduct credits
    await supabase
      .from("promotion_credits")
      .update({ balance: creditBalance - option.credits })
      .eq("user_id", user.id);

    // Log transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -option.credits,
      type: "spend",
      description: `Impulsionou publicação por ${option.days} dia(s)`,
    });

    // Create spending confirmation notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      actor_id: user.id,
      type: "credit_spent",
      message: `gastou ${option.credits} créditos impulsionando uma publicação por ${option.days} dia(s)`,
      reference_id: postId,
    });

    toast.success(`Publicação impulsionada por ${option.days} dia(s)! ${option.credits} créditos usados.`);

    // Low balance warning
    const newBalance = creditBalance - option.credits;
    if (newBalance > 0 && newBalance <= 10) {
      toast.warning(`Saldo baixo! Você tem ${newBalance} créditos restantes.`, { duration: 5000 });
    }

    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
    queryClient.invalidateQueries({ queryKey: ["sponsored-feed-posts"] });
    queryClient.invalidateQueries({ queryKey: ["post-boost-status", postId] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setBoosting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Impulsionar Publicação</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Promova esta publicação para alcançar mais pessoas no feed.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Already boosted notice */}
          {existingBoost && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Esta publicação já está impulsionada</p>
                <p className="text-muted-foreground">
                  {existingBoost.impressions?.toLocaleString() || 0} impressões · {existingBoost.clicks?.toLocaleString() || 0} cliques
                </p>
              </div>
            </div>
          )}

          {/* Post preview */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm text-foreground line-clamp-3">{postContent}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Aparece nos feeds</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Público mais amplo</span>
            </div>
          </div>

          {/* Credit balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> Seus Créditos
            </span>
            <span className="text-sm font-bold text-foreground">{creditBalance}</span>
          </div>

          {/* Duration options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duração</p>
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
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    {opt.popular && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                        Popular
                      </Badge>
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

          {/* Estimated reach */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MousePointerClick className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Alcance Estimado</p>
              <p className="text-xs text-muted-foreground">
                ~{(option.days * 150).toLocaleString()}-{(option.days * 500).toLocaleString()} impressões
              </p>
            </div>
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
                {(targetCategory || targetLocation || targetGender) && (
                  <Badge variant="secondary" className="text-[10px]">
                    {[targetCategory, targetLocation, targetGender].filter(Boolean).length} filtro
                    {[targetCategory, targetLocation, targetGender].filter(Boolean).length > 1 ? "s" : ""}
                  </Badge>
                )}
                {showTargeting ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {showTargeting && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground mt-2">
                  Refine seu público para obter melhor engajamento.
                </p>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Categoria</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTargetCategory("")}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        !targetCategory
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Todos
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setTargetCategory(cat === targetCategory ? "" : cat)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          targetCategory === cat
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Gênero</label>
                  <div className="flex gap-1.5">
                    {["", "male", "female", "other"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setTargetGender(g)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          targetGender === g
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {g === "" ? "Todos" : g === "male" ? "Masculino" : g === "female" ? "Feminino" : "Outro"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Localização</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="ex: São Paulo, BR"
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Frequency cap */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Limite de Frequência (máx visualizações por usuário)
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 3, 5, 10].map((cap) => (
                      <button
                        key={cap}
                        onClick={() => setFrequencyCap(cap)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          frequencyCap === cap
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {cap}×
                      </button>
                    ))}
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

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleBoost}
            disabled={!canAfford || boosting}
            className="flex-1"
          >
            <Rocket className="w-4 h-4 mr-1" />
            {boosting ? "Impulsionando..." : `Impulsionar por ${option.credits} créditos`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BoostPostModal;
