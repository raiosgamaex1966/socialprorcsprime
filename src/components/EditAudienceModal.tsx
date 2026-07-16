import { useState } from "react";
import { Globe, Users, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EditAudienceModalProps {
  postId: string;
  currentPrivacy: string;
  onClose: () => void;
}

const PRIVACY_OPTIONS = [
  {
    value: "public",
    label: "Público",
    description: "Qualquer pessoa pode ver esta publicação",
    icon: Globe,
  },
  {
    value: "friends",
    label: "Amigos",
    description: "Apenas seus amigos podem ver esta publicação",
    icon: Users,
  },
  {
    value: "private",
    label: "Somente eu",
    description: "Apenas você pode ver esta publicação",
    icon: Lock,
  },
];

const EditAudienceModal = ({ postId, currentPrivacy, onClose }: EditAudienceModalProps) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentPrivacy || "public");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selected === currentPrivacy) {
      onClose();
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from("posts")
      .update({ privacy: selected })
      .eq("id", postId);

    if (error) {
      toast.error("Falha ao atualizar público");
    } else {
      const label = PRIVACY_OPTIONS.find((o) => o.value === selected)?.label || selected;
      toast.success(`Público alterado para "${label}"`);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Editar Público</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha quem pode ver esta publicação.
          </p>
        </div>

        <div className="p-5 space-y-2">
          {PRIVACY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                  isSelected ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-foreground"}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5 border-t border-border flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditAudienceModal;
