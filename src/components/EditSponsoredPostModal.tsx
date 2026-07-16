import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Target, MapPin, ChevronDown, ChevronUp } from "lucide-react";

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
  "Home & Garden": "Casa e Jardim",
  "Other": "Outro",
};

interface EditSponsoredPostModalProps {
  post: any;
  onClose: () => void;
  onSave: (updates: { id: string; content: string; link_url: string | null; target_category: string | null; target_location: string | null; frequency_cap: number }) => void;
  saving?: boolean;
}

const EditSponsoredPostModal = ({ post, onClose, onSave, saving }: EditSponsoredPostModalProps) => {
  const [content, setContent] = useState(post.content || "");
  const [linkUrl, setLinkUrl] = useState(post.link_url || "");
  const [targetCategory, setTargetCategory] = useState(post.target_category || "");
  const [targetLocation, setTargetLocation] = useState(post.target_location || "");
  const [frequencyCap, setFrequencyCap] = useState(post.frequency_cap || 5);
  const [showTargeting, setShowTargeting] = useState(false);

  const handleSave = () => {
    onSave({
      id: post.id,
      content: content.trim(),
      link_url: linkUrl.trim() || null,
      target_category: targetCategory || null,
      target_location: targetLocation.trim() || null,
      frequency_cap: frequencyCap,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Editar Publicação Patrocinada</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <Textarea
            placeholder="Texto do anúncio..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />

          <Input
            placeholder="URL do Link (opcional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />

          {/* Targeting */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTargeting(!showTargeting)}
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" /> Segmentação de Público
              </span>
              <div className="flex items-center gap-2">
                {(targetCategory || targetLocation) && (
                  <Badge variant="secondary" className="text-[10px]">
                    {[targetCategory, targetLocation].filter(Boolean).length} filtro(s)
                  </Badge>
                )}
                {showTargeting ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {showTargeting && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Categoria</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setTargetCategory("")}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!targetCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                    >
                      Todas
                    </button>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setTargetCategory(cat === targetCategory ? "" : cat)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${targetCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
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
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">
                    Limite de Frequência (máx. visualizações por usuário em 24h)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={frequencyCap}
                    onChange={(e) => setFrequencyCap(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={!content.trim() || saving} className="flex-1">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditSponsoredPostModal;
