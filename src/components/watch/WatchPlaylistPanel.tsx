import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ListMusic, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WatchPlaylistPanelProps {
  open: boolean;
  onClose: () => void;
  videoId: string | null;
}

const WatchPlaylistPanel = ({ open, onClose, videoId }: WatchPlaylistPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: playlists = [] } = useQuery({
    queryKey: ["watch-playlists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("watch_playlists")
        .select("*, watch_playlist_items(video_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && open,
  });

  const createPlaylist = useMutation({
    mutationFn: async (title: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("watch_playlists")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      if (videoId && data) {
        await supabase.from("watch_playlist_items").insert({ playlist_id: data.id, video_id: videoId, position: 0 });
      }
    },
    onSuccess: () => {
      setNewPlaylistTitle("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["watch-playlists"] });
      toast.success("Playlist criada!");
    },
  });

  const toggleVideoInPlaylist = useMutation({
    mutationFn: async (playlistId: string) => {
      if (!user || !videoId) return;
      const playlist = playlists.find((p: any) => p.id === playlistId);
      const isInPlaylist = playlist?.watch_playlist_items?.some((i: any) => i.video_id === videoId);
      if (isInPlaylist) {
        await supabase.from("watch_playlist_items").delete().eq("playlist_id", playlistId).eq("video_id", videoId);
      } else {
        const maxPos = playlist?.watch_playlist_items?.length || 0;
        await supabase.from("watch_playlist_items").insert({ playlist_id: playlistId, video_id: videoId, position: maxPos });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-playlists"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="w-5 h-5" /> Salvar na Playlist
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {playlists.map((pl: any) => {
              const isInPlaylist = pl.watch_playlist_items?.some((i: any) => i.video_id === videoId);
              return (
                <button
                  key={pl.id}
                  onClick={() => toggleVideoInPlaylist.mutate(pl.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    isInPlaylist ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isInPlaylist ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {isInPlaylist && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm font-medium truncate">{pl.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{pl.watch_playlist_items?.length || 0}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {showCreate ? (
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Nome da playlist"
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPlaylistTitle.trim()) createPlaylist.mutate(newPlaylistTitle.trim());
              }}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={() => newPlaylistTitle.trim() && createPlaylist.mutate(newPlaylistTitle.trim())} disabled={!newPlaylistTitle.trim()}>
              Criar
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full gap-2 mt-2">
            <Plus className="w-4 h-4" /> Nova Playlist
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WatchPlaylistPanel;
