import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, X, Clock, RotateCcw, ChevronDown, ChevronUp, Globe, Lock, MapPin, Smile, Palette, FileText, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditHistoryModalProps {
  postId: string;
  currentContent: string;
  onClose: () => void;
}

const EditHistoryModal = ({ postId, currentContent, onClose }: EditHistoryModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["post-edit-history", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("post_edit_history")
        .select("*")
        .eq("post_id", postId)
        .order("edited_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const handleRestore = async () => {
    if (!restoreEntry || !user) return;
    setIsRestoring(true);
    try {
      // Save current version to history first
      await supabase.from("post_edit_history").insert({
        post_id: postId,
        user_id: user.id,
        content: currentContent,
      });

      // Restore the selected version
      const updateData: Record<string, any> = { content: restoreEntry.content };
      if (restoreEntry.privacy) updateData.privacy = restoreEntry.privacy;
      if (restoreEntry.location !== undefined) updateData.location = restoreEntry.location;
      if (restoreEntry.feeling !== undefined) updateData.feeling = restoreEntry.feeling;
      if (restoreEntry.background_style !== undefined) updateData.background_style = restoreEntry.background_style;

      const { error } = await supabase
        .from("posts")
        .update(updateData as never)
        .eq("id", postId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["post-edit-history", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publicação restaurada para a versão anterior");
      setRestoreEntry(null);
      onClose();
    } catch {
      toast.error("Falha ao restaurar publicação");
    } finally {
      setIsRestoring(false);
    }
  };

  const getChangedFields = (entry: any) => {
    const fields: { icon: any; label: string; value: string }[] = [];
    if (entry.privacy) fields.push({ icon: entry.privacy === "public" ? Globe : Lock, label: "Privacidade", value: entry.privacy });
    if (entry.location) fields.push({ icon: MapPin, label: "Localização", value: entry.location });
    if (entry.feeling) fields.push({ icon: Smile, label: "Sentimento", value: entry.feeling });
    if (entry.background_style) fields.push({ icon: Palette, label: "Estilo", value: entry.background_style });
    return fields;
  };

  const totalEdits = history.length;
  const isExpanded = (id: string) => expandedEntry === id;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
        <div className="bg-card rounded-xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Histórico de Edições</h2>
                <p className="text-xs text-muted-foreground">
                  {totalEdits === 0 ? "Nenhuma edição ainda" : `${totalEdits} ${totalEdits === 1 ? "versão anterior" : "versões anteriores"}`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {/* Current version */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px] uppercase tracking-wider">Atual</Badge>
                  <span className="text-xs text-muted-foreground">Última versão</span>
                </div>
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{currentContent}</p>
                </div>
              </div>

              {/* Timeline */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Sem histórico de edições</p>
                  <p className="text-xs text-muted-foreground mt-1">Versões anteriores aparecerão aqui após editar.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Versões Anteriores
                  </p>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                    {history.map((entry: any, index: number) => {
                      const versionNum = history.length - index;
                      const expanded = isExpanded(entry.id);
                      const changedFields = getChangedFields(entry);

                      return (
                        <div key={entry.id} className="relative pl-10 pb-4">
                          {/* Timeline dot */}
                          <div className="absolute left-[11px] top-2 w-[10px] h-[10px] rounded-full border-2 border-muted-foreground/30 bg-card" />

                          <div className={`rounded-lg border transition-all duration-200 ${expanded ? "border-primary/30 bg-accent/30" : "border-border hover:border-primary/20"}`}>
                            {/* Entry header - clickable */}
                            <button
                              className="w-full flex items-center justify-between p-3 text-left"
                              onClick={() => setExpandedEntry(expanded ? null : entry.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                  v{versionNum}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span title={format(new Date(entry.edited_at), "PPP 'às' p", { locale: ptBR })}>
                                    {formatDistanceToNow(new Date(entry.edited_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                                {changedFields.length > 0 && (
                                  <Badge variant="secondary" className="text-[9px] shrink-0">
                                    +{changedFields.length} campo{changedFields.length > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                              {expanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                            </button>

                            {/* Collapsed preview */}
                            {!expanded && (
                              <div className="px-3 pb-3 -mt-1">
                                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                  {entry.content}
                                </p>
                              </div>
                            )}

                            {/* Expanded content */}
                            {expanded && (
                              <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Conteúdo</p>
                                  <p className="text-sm text-foreground/90 whitespace-pre-wrap bg-background/50 rounded p-2.5 border border-border/50">
                                    {entry.content}
                                  </p>
                                </div>

                                {changedFields.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Metadados</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {changedFields.map((field, i) => {
                                        const Icon = field.icon;
                                        return (
                                          <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                                            <Icon className="w-3 h-3" />
                                            {field.value}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Restore button */}
                                <div className="flex items-center gap-2 pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRestoreEntry(entry);
                                    }}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Restaurar esta versão
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreEntry} onOpenChange={() => setRestoreEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão anterior?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Seu conteúdo atual será salvo no histórico de edições antes de restaurar.</span>
              <span className="block text-xs bg-muted rounded-lg p-3 text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                {restoreEntry?.content}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? "Restaurando..." : "Restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditHistoryModal;
