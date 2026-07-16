import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Megaphone, Image, X, MapPin, Target, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface CreateSponsoredPostProps {
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { days: 1, credits: 10, label: "1 Dia" },
  { days: 3, credits: 25, label: "3 Dias" },
  { days: 7, credits: 50, label: "7 Dias" },
];

const CATEGORY_OPTIONS = [
  "General", "Electronics", "Vehicles", "Furniture", "Clothing", "Sports", "Home & Garden", "Other",
];

const CreateSponsoredPost = ({ onClose }: CreateSponsoredPostProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Targeting state
  const [targetCategory, setTargetCategory] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [frequencyCap, setFrequencyCap] = useState(5);
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

  const option = DURATION_OPTIONS[selectedDuration];
  const canAfford = creditBalance >= option.credits;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !content.trim() || !canAfford) return;
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `sponsored/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(path, imageFile);
      if (!upErr) {
        const { data: pubData } = supabase.storage.from("post-images").getPublicUrl(path);
        imageUrl = pubData.publicUrl;
      }
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + option.days);

    const { error } = await supabase.from("sponsored_posts").insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl,
      link_url: linkUrl.trim() || null,
      credits_spent: option.credits,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      target_category: targetCategory || null,
      target_location: targetLocation.trim() || null,
      frequency_cap: frequencyCap,
    } as any);

    if (error) {
      toast.error("Falha ao criar publicação patrocinada");
      setSubmitting(false);
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
      description: `Publicação patrocinada por ${option.days} dia(s)`,
    });

    toast.success("Publicação patrocinada criada!");
    queryClient.invalidateQueries({ queryKey: ["promotion-credits"] });
    queryClient.invalidateQueries({ queryKey: ["sponsored-posts"] });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Criar Publicação Patrocinada</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Seu anúncio aparecerá no feed de todos com o rótulo Patrocinado.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-sm text-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> Seus Créditos
            </span>
            <span className="text-sm font-bold text-foreground">{creditBalance}</span>
          </div>

          {/* Content */}
          <Textarea
            placeholder="Escreva o texto do seu anúncio..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />

          {/* Image */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={imagePreview} alt="" className="w-full max-h-48 object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(""); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/80 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center gap-1.5 hover:bg-secondary/50 transition-colors"
            >
              <Image className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Adicionar uma imagem (opcional)</span>
            </button>
          )}

          {/* Link */}
          <Input
            placeholder="Link URL (opcional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />

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
                  Direcionar a usuários interessados em categorias ou locais específicos. Deixe em branco para amplo alcance.
                </p>
                {/* Category targeting */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Categoria de Interesse</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTargetCategory("")}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        !targetCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Todos
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => {
                      const catLabels: Record<string, string> = {
                        "General": "Geral",
                        "Electronics": "Eletrônicos",
                        "Vehicles": "Veículos",
                        "Furniture": "Móveis",
                        "Clothing": "Roupas",
                        "Sports": "Esportes",
                        "Home & Garden": "Casa e Jardim",
                        "Other": "Outro"
                      };
                      return (
                        <button
                          key={cat}
                          onClick={() => setTargetCategory(cat === targetCategory ? "" : cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            targetCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {catLabels[cat] || cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Location targeting */}
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
                {/* Frequency Cap */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Limite de Frequência (máx visualizações por usuário em 24h)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={frequencyCap}
                    onChange={(e) => setFrequencyCap(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cada usuário verá este anúncio no máximo {frequencyCap} {frequencyCap === 1 ? "vez" : "vezes"} por dia.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Duração</p>
            {DURATION_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedDuration(i)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedDuration === i
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
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
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || !canAfford || submitting}
            className="flex-1"
          >
            {submitting ? "Criando..." : `Patrocinar por ${option.credits} créditos`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSponsoredPost;
