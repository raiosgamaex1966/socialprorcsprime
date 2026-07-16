import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Heart, MessageCircle, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, Play, TrendingUp, Compass, Upload, UserPlus, UserCheck, Users, Music, Eye, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { copyShareableLink } from "@/lib/deepLinks";
import ReelUploadModal from "@/components/ReelUploadModal";
import ReelCommentsSheet from "@/components/ReelCommentsSheet";

const Reels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [showUpload, setShowUpload] = useState(searchParams.get("create") === "true");
  const [showComments, setShowComments] = useState(false);
  const [activeTab, setActiveTab] = useState<"foryou" | "following" | "trending" | "discover">("foryou");
  const [videoProgress, setVideoProgress] = useState(0);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<number | null>(null);

  // Followed creator IDs
  const { data: followedCreatorIds = [] } = useQuery({
    queryKey: ["creator-follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("creator_follows")
        .select("creator_id")
        .eq("follower_id", user.id);
      return (data || []).map((f: any) => f.creator_id);
    },
    enabled: !!user,
  });

  const toggleFollow = useMutation({
    mutationFn: async (creatorId: string) => {
      if (!user) return;
      const isFollowing = followedCreatorIds.includes(creatorId);
      if (isFollowing) {
        await supabase.from("creator_follows").delete().eq("follower_id", user.id).eq("creator_id", creatorId);
      } else {
        await supabase.from("creator_follows").insert({ follower_id: user.id, creator_id: creatorId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-follows"] });
    },
  });

  const PAGE_SIZE = 20;
  const [allReels, setAllReels] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);

  const fetchReelsPage = useCallback(async (page: number) => {
    const { data, error } = await supabase
      .from("reels")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length < PAGE_SIZE) setHasMore(false);

    const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
    const reelIds = (data || []).map((r: any) => r.id);

    const [{ data: profiles }, { data: recentLikes }, { data: recentComments }] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
      activeTab === "trending" && reelIds.length > 0
        ? supabase.from("reel_likes").select("reel_id").in("reel_id", reelIds).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        : Promise.resolve({ data: [] }),
      activeTab === "trending" && reelIds.length > 0
        ? supabase.from("reel_comments").select("reel_id").in("reel_id", reelIds).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (data || []).map((r: any) => ({
      ...r,
      profile: profileMap.get(r.user_id) || { display_name: "Usuário", avatar_url: null },
      _recentLikes: (recentLikes || []).filter((l: any) => l.reel_id === r.id).length,
      _recentComments: (recentComments || []).filter((c: any) => c.reel_id === r.id).length,
    }));
  }, [activeTab]);

  const { data: initialReels = [], isSuccess } = useQuery({
    queryKey: ["reels", activeTab],
    queryFn: () => fetchReelsPage(0),
    enabled: !!user,
  });

  useEffect(() => {
    if (isSuccess) {
      pageRef.current = 0;
      setHasMore(initialReels.length >= PAGE_SIZE);
      setAllReels(initialReels);
    }
  }, [isSuccess, initialReels]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const moreReels = await fetchReelsPage(nextPage);
      pageRef.current = nextPage;
      setAllReels((prev) => {
        const existingIds = new Set(prev.map((r: any) => r.id));
        const newReels = moreReels.filter((r: any) => !existingIds.has(r.id));
        return [...prev, ...newReels];
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchReelsPage]);

  const reels = useMemo(() => {
    let sorted = [...allReels];
    if (activeTab === "trending") {
      sorted.sort((a: any, b: any) => {
        const scoreA = (a._recentLikes || 0) * 2 + (a._recentComments || 0) * 3 + (a.view_count || 0) * 0.5;
        const scoreB = (b._recentLikes || 0) * 2 + (b._recentComments || 0) * 3 + (b.view_count || 0) * 0.5;
        return scoreB - scoreA;
      });
    } else if (activeTab === "discover") {
      sorted.sort(() => Math.random() - 0.5);
    } else if (activeTab === "following") {
      const followedSet = new Set(followedCreatorIds);
      sorted = sorted.filter((r: any) => followedSet.has(r.user_id));
    } else if (activeTab === "foryou") {
      const followedSet = new Set(followedCreatorIds);
      const followed = sorted.filter((r: any) => followedSet.has(r.user_id));
      const others = sorted.filter((r: any) => !followedSet.has(r.user_id));
      sorted = [...followed, ...others];
    }
    return sorted;
  }, [allReels, activeTab, followedCreatorIds]);

  useEffect(() => {
    if (reels.length > 0 && currentIndex >= reels.length - 3) {
      loadMore();
    }
  }, [currentIndex, reels.length, loadMore]);

  const { data: likedReelIds = [] } = useQuery({
    queryKey: ["reel-likes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("reel_likes")
        .select("reel_id")
        .eq("user_id", user.id);
      return (data || []).map((l: any) => l.reel_id);
    },
    enabled: !!user,
  });

  const { data: likeCounts = {} } = useQuery({
    queryKey: ["reel-like-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("reel_likes").select("reel_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((l: any) => {
        counts[l.reel_id] = (counts[l.reel_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: commentCounts = {} } = useQuery({
    queryKey: ["reel-comment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("reel_comments").select("reel_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        counts[c.reel_id] = (counts[c.reel_id] || 0) + 1;
      });
      return counts;
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (reelId: string) => {
      if (!user) return;
      const isLiked = likedReelIds.includes(reelId);
      if (isLiked) {
        await supabase.from("reel_likes").delete().eq("reel_id", reelId).eq("user_id", user.id);
      } else {
        await supabase.from("reel_likes").insert({ reel_id: reelId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reel-likes"] });
      queryClient.invalidateQueries({ queryKey: ["reel-like-counts"] });
    },
  });

  const currentReel = reels[currentIndex];

  // Track video progress
  useEffect(() => {
    if (progressInterval.current) cancelAnimationFrame(progressInterval.current);
    const track = () => {
      const video = videoRefs.current.get(currentIndex);
      if (video && video.duration) {
        setVideoProgress(video.currentTime / video.duration);
      }
      progressInterval.current = requestAnimationFrame(track);
    };
    if (playing) progressInterval.current = requestAnimationFrame(track);
    return () => { if (progressInterval.current) cancelAnimationFrame(progressInterval.current); };
  }, [currentIndex, playing]);

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (idx === currentIndex && playing) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex, playing]);

  const goToReel = useCallback((dir: "up" | "down") => {
    if (dir === "up" && currentIndex > 0) { setCurrentIndex((i) => i - 1); setVideoProgress(0); }
    if (dir === "down" && currentIndex < reels.length - 1) { setCurrentIndex((i) => i + 1); setVideoProgress(0); }
  }, [currentIndex, reels.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); goToReel("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); goToReel("down"); }
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToReel]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (e.deltaY > 0) goToReel("down");
        else if (e.deltaY < 0) goToReel("up");
      }, 100);
    };
    const el = containerRef.current;
    el?.addEventListener("wheel", handleWheel, { passive: false });
    return () => { el?.removeEventListener("wheel", handleWheel); clearTimeout(timeout); };
  }, [goToReel]);

  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToReel("down");
        else goToReel("up");
      }
    };
    const el = containerRef.current;
    el?.addEventListener("touchstart", handleTouchStart);
    el?.addEventListener("touchend", handleTouchEnd);
    return () => {
      el?.removeEventListener("touchstart", handleTouchStart);
      el?.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goToReel]);

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  };

  const handleVideoTap = (reelId: string) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap — like
      if (!likedReelIds.includes(reelId)) {
        toggleLike.mutate(reelId);
      }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 800);
    } else {
      // Single tap — play/pause
      setPlaying((p) => !p);
    }
    setLastTap(now);
  };

  const tabItems = [
    { key: "foryou", label: "Para Você", icon: Play },
    { key: "following", label: "Seguindo", icon: Users },
    { key: "trending", label: "Em Alta", icon: TrendingUp },
    { key: "discover", label: "Descobrir", icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-black -mt-14 pt-14">
      {/* Full-width fixed tab bar */}
      <div className="sticky top-0 z-30 w-full bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-center gap-0.5 p-2">
          {tabItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key as any); setCurrentIndex(0); setVideoProgress(0); }}
              className={`relative px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
                activeTab === key
                  ? "bg-white text-black shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[calc(100vh-56px-44px)] flex items-center justify-center relative overflow-hidden pt-2 pb-3">
        <button
          onClick={() => setShowUpload(true)}
          className="absolute top-4 right-4 z-30 bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-transform"
          title="Criar Reel"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Empty state */}
        {reels.length === 0 ? (
          <div className="text-center text-white/60 flex flex-col items-center gap-4 animate-in fade-in duration-500">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Upload className="w-10 h-10 text-white/30" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white/80">Nenhum reel ainda</p>
              <p className="text-sm mt-1 text-white/40">Seja o primeiro a compartilhar algo incrível</p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
            >
              Criar Reel
            </button>
          </div>
        ) : (
          <div className="relative h-full w-full max-w-[480px] mx-auto py-3">
            {reels.map((reel: any, idx: number) => {
              const isActive = idx === currentIndex;
              const isLiked = likedReelIds.includes(reel.id);
              const isFollowing = followedCreatorIds.includes(reel.user_id);

              return (
                <div
                  key={reel.id}
                  className="absolute inset-x-0 top-0 bottom-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                  style={{
                    transform: `translateY(calc(${(idx - currentIndex)} * (100% + 12px)))`,
                    opacity: Math.abs(idx - currentIndex) > 1 ? 0 : 1,
                  }}
                >
                  {/* Video */}
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900">
                    <video
                      ref={(el) => { if (el) videoRefs.current.set(idx, el); }}
                      src={reel.video_url}
                      className="w-full h-full object-cover"
                      loop
                      muted={muted}
                      playsInline
                      onClick={() => handleVideoTap(reel.id)}
                    />

                    {/* Video progress bar */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10 z-20">
                        <div
                          className="h-full bg-white/80 rounded-r-full transition-[width] duration-100"
                          style={{ width: `${videoProgress * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Pause overlay */}
                    {!playing && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-black/50 backdrop-blur-sm rounded-full p-5 animate-in zoom-in-75 duration-200">
                          <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Double-tap heart animation */}
                    {doubleTapHeart && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-in zoom-in-50 duration-300" style={{ animation: "heartPop 0.8s ease-out forwards" }} />
                      </div>
                    )}

                    {/* Top gradient */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none rounded-t-2xl" />

                    {/* Bottom info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-2xl">
                      {/* Creator info */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <img
                            src={reel.profile.avatar_url || defaultAvatar}
                            alt=""
                            className="w-11 h-11 rounded-full border-2 border-white/80 object-cover shadow-lg"
                          />
                          {/* Online-style ring */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-black flex items-center justify-center">
                            <Plus className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-bold text-sm drop-shadow-lg block truncate">
                            {reel.profile.display_name}
                          </span>
                          {reel.view_count != null && (
                            <span className="text-white/50 text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatCount(reel.view_count)} visualizações
                            </span>
                          )}
                        </div>
                        {user && reel.user_id !== user.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFollow.mutate(reel.user_id); }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                              isFollowing
                                ? "bg-white/15 text-white border border-white/20 hover:bg-white/25"
                                : "bg-white text-black hover:bg-white/90"
                            }`}
                          >
                            {isFollowing ? (
                              <><UserCheck className="w-3 h-3" /> Seguindo</>
                            ) : (
                              <><UserPlus className="w-3 h-3" /> Seguir</>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Caption */}
                      {reel.caption && (
                        <p className="text-white/90 text-[13px] leading-relaxed line-clamp-2 drop-shadow-md">
                          {reel.caption}
                        </p>
                      )}

                      {/* Music ticker placeholder */}
                      <div className="flex items-center gap-2 mt-2.5">
                        <Music className="w-3.5 h-3.5 text-white/50" />
                        <div className="text-white/50 text-xs truncate overflow-hidden">
                          <span className="inline-block whitespace-nowrap" style={{ animation: isActive ? "marquee 8s linear infinite" : "none" }}>
                            Áudio original · {reel.profile.display_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right action bar */}
                    <div className="absolute right-3 bottom-36 flex flex-col items-center gap-4 z-10">
                      {/* Like */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike.mutate(reel.id); }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isLiked ? "bg-red-500/20 scale-105" : "bg-black/30 backdrop-blur-md group-hover:bg-black/50"
                        }`}>
                          <Heart
                            className={`w-6 h-6 transition-all duration-200 ${
                              isLiked
                                ? "text-red-500 fill-red-500"
                                : "text-white group-hover:scale-110"
                            }`}
                          />
                        </div>
                        <span className={`text-[11px] font-bold ${isLiked ? "text-red-400" : "text-white/90"}`}>
                          {formatCount(likeCounts[reel.id] || 0)}
                        </span>
                      </button>

                      {/* Comments */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center group-hover:bg-black/50 transition-colors">
                          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-white/90 text-[11px] font-bold">
                          {formatCount(commentCounts[reel.id] || 0)}
                        </span>
                      </button>

                      {/* Share */}
                      <button
                        onClick={(e) => { e.stopPropagation(); copyShareableLink("reel", reel.id); }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center group-hover:bg-black/50 transition-colors">
                          <Share2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-white/90 text-[11px] font-bold">Compartilhar</span>
                      </button>

                      {/* Mute */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                        className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-colors"
                      >
                        {muted ? (
                          <VolumeX className="w-4 h-4 text-white/70" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white/70" />
                        )}
                      </button>

                      {/* Spinning disc avatar */}
                      <div className="mt-1">
                        <div
                          className="w-10 h-10 rounded-full border-[3px] border-neutral-800 overflow-hidden shadow-lg"
                          style={{ animation: isActive && playing ? "spin 4s linear infinite" : "none" }}
                        >
                          <img
                            src={reel.profile.avatar_url || defaultAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Navigation arrows — bottom right corner */}
            {reels.length > 1 && (
              <div className="absolute -right-16 bottom-6 z-20 flex flex-col gap-3">
                <button
                  onClick={() => goToReel("up")}
                  disabled={currentIndex === 0}
                  className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/10"
                >
                  <ChevronUp className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => goToReel("down")}
                  disabled={currentIndex >= reels.length - 1}
                  className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/10"
                >
                  <ChevronDown className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showUpload && (
        <ReelUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            queryClient.invalidateQueries({ queryKey: ["reels"] });
          }}
        />
      )}

      {showComments && currentReel && (
        <ReelCommentsSheet
          reelId={currentReel.id}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(0.3); opacity: 1; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default Reels;
