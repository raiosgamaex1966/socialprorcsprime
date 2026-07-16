import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Upload, Grid3X3, ChevronDown, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AppPageShell from "@/components/AppPageShell";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import WatchVideoCard from "@/components/watch/WatchVideoCard";
import WatchRecommendations from "@/components/watch/WatchRecommendations";
import WatchPlaylistPanel from "@/components/watch/WatchPlaylistPanel";
import WatchUploadModal from "@/components/watch/WatchUploadModal";

const CATEGORIES = [
  { key: "All", label: "Tudo" },
  { key: "Gaming", label: "Jogos" },
  { key: "Music", label: "Música" },
  { key: "Sports", label: "Esportes" },
  { key: "News", label: "Notícias" },
  { key: "Education", label: "Educação" },
  { key: "Entertainment", label: "Entretenimento" },
  { key: "Tech", label: "Tecnologia" },
  { key: "Cooking", label: "Culinária" },
  { key: "Travel", label: "Viagem" }
];

const Watch = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [playlistVideoId, setPlaylistVideoId] = useState<string | null>(null);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);
  const playingVideos = useRef<Set<string>>(new Set());

  // Fetch videos
  const { data: videos = [] } = useQuery({
    queryKey: ["watch-videos", activeCategory, searchQuery],
    queryFn: async () => {
      let query = supabase.from("watch_videos").select("*").order("created_at", { ascending: false }).limit(50);
      if (activeCategory !== "All") query = query.eq("category", activeCategory.toLowerCase());
      if (searchQuery.trim()) query = query.ilike("title", `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((v: any) => v.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((v: any) => ({
        ...v,
        profile: profileMap.get(v.user_id) || { display_name: "Usuário", avatar_url: null },
      }));
    },
    enabled: !!user,
  });

  // Likes
  const { data: likedIds = [] } = useQuery({
    queryKey: ["watch-likes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("watch_video_likes").select("video_id").eq("user_id", user.id);
      return (data || []).map((l: any) => l.video_id);
    },
    enabled: !!user,
  });

  const { data: likeCounts = {} } = useQuery({
    queryKey: ["watch-like-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("watch_video_likes").select("video_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((l: any) => { counts[l.video_id] = (counts[l.video_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: commentCounts = {} } = useQuery({
    queryKey: ["watch-comment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("watch_video_comments").select("video_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => { counts[c.video_id] = (counts[c.video_id] || 0) + 1; });
      return counts;
    },
  });

  // Saved videos
  const { data: savedIds = [] } = useQuery({
    queryKey: ["watch-saved", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("watch_saved_videos").select("video_id").eq("user_id", user.id);
      return (data || []).map((s: any) => s.video_id);
    },
    enabled: !!user,
  });

  // Comments for expanded video
  const { data: comments = [] } = useQuery({
    queryKey: ["watch-comments", expandedVideo],
    queryFn: async () => {
      if (!expandedVideo) return [];
      const { data } = await supabase.from("watch_video_comments").select("*")
        .eq("video_id", expandedVideo).is("parent_id", null).order("created_at", { ascending: false });

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { display_name: "Usuário", avatar_url: null },
      }));
    },
    enabled: !!expandedVideo,
  });

  const toggleLike = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) return;
      if (likedIds.includes(videoId)) {
        await supabase.from("watch_video_likes").delete().eq("video_id", videoId).eq("user_id", user.id);
      } else {
        await supabase.from("watch_video_likes").insert({ video_id: videoId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-likes"] });
      queryClient.invalidateQueries({ queryKey: ["watch-like-counts"] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) return;
      if (savedIds.includes(videoId)) {
        await supabase.from("watch_saved_videos").delete().eq("video_id", videoId).eq("user_id", user.id);
        toast.success("Removido dos salvos");
      } else {
        await supabase.from("watch_saved_videos").insert({ video_id: videoId, user_id: user.id });
        toast.success("Vídeo salvo!");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-saved"] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ videoId, content }: { videoId: string; content: string }) => {
      if (!user) return;
      await supabase.from("watch_video_comments").insert({ video_id: videoId, user_id: user.id, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watch-comments"] });
      queryClient.invalidateQueries({ queryKey: ["watch-comment-counts"] });
    },
  });

  const handleVideoPlay = (videoId: string, videoEl: HTMLVideoElement) => {
    document.querySelectorAll("video").forEach((v) => { if (v !== videoEl) v.pause(); });
    playingVideos.current.clear();
    playingVideos.current.add(videoId);
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Recommendations: shuffle other category videos
  const recommendations = videos.filter((v: any) => v.id !== expandedVideo).slice(0, 8);

  return (
    <>
      <AppPageShell>
        <div className="flex gap-6">
          {/* Main feed */}
          <div className="flex-1 min-w-0">
            {/* Search & Upload & Category filter */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Pesquisar vídeos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {CATEGORIES.find(c => c.key === activeCategory)?.label || activeCategory}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem key={cat.key} onClick={() => setActiveCategory(cat.key)} className={activeCategory === cat.key ? "bg-primary/10 text-primary font-medium" : ""}>
                      {cat.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Enviar
              </Button>
            </div>


            <HorizontalBannerAd category="entertainment" variant="standard" className="mb-5" />

            {/* Video feed */}
            {videos.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium">Nenhum vídeo ainda</p>
                <p className="text-sm mt-1">Seja o primeiro a enviar um vídeo!</p>
                <Button onClick={() => setShowUpload(true)} className="mt-4">Enviar Vídeo</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {videos.map((video: any) => (
                  <WatchVideoCard
                    key={video.id}
                    video={video}
                    isLiked={likedIds.includes(video.id)}
                    likeCount={likeCounts[video.id] || 0}
                    commentCount={commentCounts[video.id] || 0}
                    isSaved={savedIds.includes(video.id)}
                    onToggleLike={(id) => toggleLike.mutate(id)}
                    onToggleSave={(id) => toggleSave.mutate(id)}
                    onAddToPlaylist={(id) => { setPlaylistVideoId(id); setShowPlaylistPanel(true); }}
                    expandedVideo={expandedVideo}
                    onToggleComments={(id) => setExpandedVideo(expandedVideo === id ? null : id)}
                    comments={expandedVideo === video.id ? comments : []}
                    onAddComment={(videoId, content) => addComment.mutate({ videoId, content })}
                    onVideoPlay={handleVideoPlay}
                    formatCount={formatCount}
                    formatDuration={formatDuration}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </AppPageShell>

      <WatchUploadModal open={showUpload} onClose={() => setShowUpload(false)} onSuccess={() => {
        setShowUpload(false);
        queryClient.invalidateQueries({ queryKey: ["watch-videos"] });
      }} />

      <WatchPlaylistPanel
        open={showPlaylistPanel}
        onClose={() => { setShowPlaylistPanel(false); setPlaylistVideoId(null); }}
        videoId={playlistVideoId}
      />
    </>
  );
};

export default Watch;
