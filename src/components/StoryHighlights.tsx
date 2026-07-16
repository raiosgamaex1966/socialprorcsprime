import { useState } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface HighlightItem {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

interface Highlight {
  id: string;
  title: string;
  cover_url: string | null;
  items: HighlightItem[];
}

interface StoryHighlightsProps {
  userId: string;
  isOwn: boolean;
}

const StoryHighlights = ({ userId, isOwn }: StoryHighlightsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: highlights } = useQuery({
    queryKey: ["story-highlights", userId],
    queryFn: async () => {
      const { data: hlData, error } = await supabase
        .from("story_highlights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const results: Highlight[] = [];
      for (const hl of hlData) {
        const { data: items } = await supabase
          .from("story_highlight_items")
          .select("*")
          .eq("highlight_id", hl.id)
          .order("created_at", { ascending: true });
        results.push({
          id: hl.id,
          title: hl.title,
          cover_url: hl.cover_url,
          items: (items || []) as HighlightItem[],
        });
      }
      return results;
    },
  });

  const createHighlight = async () => {
    if (!user || !newTitle.trim()) return;
    try {
      await supabase.from("story_highlights").insert({
        user_id: user.id,
        title: newTitle.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
      setCreating(false);
      setNewTitle("");
      toast.success("Destaque criado!");
    } catch {
      toast.error("Falha ao criar destaque");
    }
  };

  const deleteHighlight = async (id: string) => {
    try {
      await supabase.from("story_highlights").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
      toast.success("Destaque excluído");
    } catch {
      toast.error("Falha ao excluir");
    }
  };

  const openHighlight = (hl: Highlight) => {
    if (hl.items.length === 0) {
      toast("Este destaque está vazio");
      return;
    }
    setCurrentHighlight(hl);
    setCurrentItemIndex(0);
    setViewerOpen(true);
  };

  if (!highlights || (highlights.length === 0 && !isOwn)) return null;

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <h3 className="text-base font-bold text-foreground mb-3">Destaques</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {isOwn && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setCreating(true)}
                className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground">Novo</span>
            </div>
          )}
          {highlights.map((hl) => (
            <div key={hl.id} className="flex flex-col items-center gap-1 flex-shrink-0 group relative">
              <button
                onClick={() => openHighlight(hl)}
                className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 overflow-hidden hover:border-primary transition-colors"
              >
                {hl.cover_url || hl.items[0]?.media_url ? (
                  <img
                    src={hl.cover_url || hl.items[0]?.media_url}
                    alt={hl.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-lg">📷</span>
                  </div>
                )}
              </button>
              <span className="text-xs text-foreground font-medium truncate max-w-[64px]">{hl.title}</span>
              {isOwn && (
                <button
                  onClick={() => deleteHighlight(hl.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create highlight modal */}
        {creating && (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createHighlight()}
              placeholder="Nome do destaque..."
              className="flex-1 bg-secondary text-foreground rounded-lg px-3 py-2 text-sm outline-none"
              autoFocus
            />
            <button
              onClick={createHighlight}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              Criar
            </button>
            <button
              onClick={() => { setCreating(false); setNewTitle(""); }}
              className="px-3 py-2 text-muted-foreground hover:text-foreground text-sm"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Highlight viewer */}
      {viewerOpen && currentHighlight && currentHighlight.items[currentItemIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
              style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative w-full max-w-[420px] h-full max-h-[90vh] mx-auto rounded-2xl overflow-hidden">
            {/* Progress */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20">
              {currentHighlight.items.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full bg-white transition-all duration-300 ${
                      i <= currentItemIndex ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-4 z-20">
              <p className="text-white font-bold text-sm drop-shadow-lg">{currentHighlight.title}</p>
              <button onClick={() => setViewerOpen(false)} className="text-white/80 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Media */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {currentHighlight.items[currentItemIndex].media_type === "video" ? (
                <video
                  src={currentHighlight.items[currentItemIndex].media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={currentHighlight.items[currentItemIndex].media_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Navigation zones */}
            <div className="absolute inset-0 flex z-10">
              <div
                className="w-1/2 h-full cursor-pointer"
                onClick={() => currentItemIndex > 0 && setCurrentItemIndex(i => i - 1)}
              />
              <div
                className="w-1/2 h-full cursor-pointer"
                onClick={() => {
                  if (currentItemIndex < currentHighlight.items.length - 1) {
                    setCurrentItemIndex(i => i + 1);
                  } else {
                    setViewerOpen(false);
                  }
                }}
              />
            </div>

            {/* Delete item button (own highlights) */}
            {isOwn && (
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  onClick={async () => {
                    const item = currentHighlight.items[currentItemIndex];
                    await supabase.from("story_highlight_items").delete().eq("id", item.id);
                    queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
                    if (currentHighlight.items.length <= 1) {
                      setViewerOpen(false);
                    } else if (currentItemIndex > 0) {
                      setCurrentItemIndex(i => i - 1);
                    }
                    toast.success("Removido do destaque");
                  }}
                  className="flex items-center gap-1 text-white/70 hover:text-white text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20"
                >
                  <Trash2 className="w-3 h-3" />
                  Remover
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StoryHighlights;
