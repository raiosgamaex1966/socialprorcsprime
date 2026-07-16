import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Pencil, Trash2, Save, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface GenderOption {
  id: string;
  label: string;
}

const defaultGenders: GenderOption[] = [
  { id: "1", label: "Masculino" },
  { id: "2", label: "Feminino" },
  { id: "3", label: "Não-binário" },
  { id: "4", label: "Transgênero" },
  { id: "5", label: "Genderqueer" },
  { id: "6", label: "Prefiro não dizer" },
  { id: "7", label: "Outro" },
];

const AdminGenders = () => {
  const { settings, loading, saving, saveSettings } = useSiteSettings("gender_options");
  const [genders, setGenders] = useState<GenderOption[]>(defaultGenders);
  const [newGender, setNewGender] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (settings && Array.isArray(settings.options) && settings.options.length) {
      setGenders(settings.options);
    }
  }, [settings]);

  const handleAdd = () => {
    const trimmed = newGender.trim();
    if (!trimmed) return;
    if (genders.some((g) => g.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Esta opção de gênero já existe");
      return;
    }
    setGenders([...genders, { id: crypto.randomUUID(), label: trimmed }]);
    setNewGender("");
  };

  const handleDelete = (id: string) => {
    setGenders(genders.filter((g) => g.id !== id));
  };

  const startEdit = (g: GenderOption) => {
    setEditingId(g.id);
    setEditValue(g.label);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (genders.some((g) => g.id !== editingId && g.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Esta opção de gênero já existe");
      return;
    }
    setGenders(genders.map((g) => (g.id === editingId ? { ...g, label: trimmed } : g)));
    setEditingId(null);
    setEditValue("");
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const updated = [...genders];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(idx, 0, moved);
    setGenders(updated);
    setDraggedIdx(idx);
  };
  const handleDragEnd = () => setDraggedIdx(null);

  const handleSave = async () => {
    await saveSettings({ options: genders });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Gerenciar Gêneros
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione, edite, reordene ou remova as opções de gênero disponíveis para os usuários. As alterações são salvas no servidor.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar Opção de Gênero</CardTitle>
          <CardDescription className="text-xs">Crie uma nova opção de gênero para os perfis de usuário.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="ex: Agênero"
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newGender.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Opções de Gênero</CardTitle>
              <CardDescription className="text-xs">
                Arraste para reordenar. Estas opções aparecem no cadastro e nas configurações de perfil.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{genders.length} opções</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {genders.map((g, idx) => (
            <div
              key={g.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-md border border-border bg-background hover:bg-muted/40 transition-colors ${
                draggedIdx === idx ? "opacity-50" : ""
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />

              {editingId === g.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    className="h-8 text-sm flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                    <Save className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm flex-1">{g.label}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(g)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(g.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {genders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma opção de gênero configurada.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Opções de Gênero"}
        </Button>
      </div>
    </div>
  );
};

export default AdminGenders;
