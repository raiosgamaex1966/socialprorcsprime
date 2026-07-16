import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ListingTemplatesProps {
  onApply: (template: {
    title: string;
    description: string;
    category: string;
    condition: string;
    location: string;
  }) => void;
  currentValues?: {
    title: string;
    description: string;
    category: string;
    condition: string;
    location: string;
  };
}

const ListingTemplates = ({ onApply, currentValues }: ListingTemplatesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["listing-templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("listing_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const handleSave = async () => {
    if (!user || !saveName.trim() || !currentValues) return;
    setSaving(true);
    const { error } = await (supabase as any).from("listing_templates").insert({
      user_id: user.id,
      name: saveName.trim(),
      title: currentValues.title || null,
      description: currentValues.description || null,
      category: currentValues.category,
      condition: currentValues.condition,
      location: currentValues.location || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Falha ao salvar modelo");
    } else {
      toast.success("Modelo salvo!");
      setSaveName("");
      setShowSave(false);
      queryClient.invalidateQueries({ queryKey: ["listing-templates"] });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("listing_templates").delete().eq("id", id);
    if (error) toast.error("Falha ao excluir");
    else {
      toast.success("Modelo excluído");
      queryClient.invalidateQueries({ queryKey: ["listing-templates"] });
    }
  };

  const handleApply = (template: any) => {
    onApply({
      title: template.title || "",
      description: template.description || "",
      category: template.category || "General",
      condition: template.condition || "Used - Good",
      location: template.location || "",
    });
    setOpen(false);
    toast.success(`Modelo "${template.name}" aplicado`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
      >
        <FileText className="w-3.5 h-3.5" /> Modelos
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Modelos de Anúncio
            </DialogTitle>
          </DialogHeader>

          {/* Save current as template */}
          {currentValues && (
            <div className="border-b border-border pb-3 mb-3">
              {showSave ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nome do modelo..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                    maxLength={50}
                  />
                  <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || saving}>
                    {saving ? "..." : "Salvar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSave(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSave(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Salvar Atual como Modelo
                </Button>
              )}
            </div>
          )}

          {/* Templates list */}
          {templates && templates.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {templates.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[t.category, t.condition, t.location].filter(Boolean).join(" · ")}
                    </p>
                    {t.title && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        Título: {t.title}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleApply(t)}
                    className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                    title="Usar modelo"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="shrink-0 w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir modelo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum modelo ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Salve as configurações do seu anúncio para reutilizá-las rapidamente
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListingTemplates;
