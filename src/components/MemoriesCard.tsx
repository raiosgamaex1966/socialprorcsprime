import { useState, useEffect, useCallback, forwardRef, useRef } from "react";
import { Clock, ChevronRight, ChevronLeft, X, Sparkles, Share2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subYears } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Post from "@/components/Post";
import ShareModal from "@/components/ShareModal";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

const MemoriesCard = forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const reactionTimeoutRef = useRef<any>(null);

  const handleMouseEnterReactions = () => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(true);
  };

  const handleMouseLeaveReactions = () => {
    reactionTimeoutRef.current = setTimeout(() => {
      setShowReactions(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, []);

  const [sharePostId, setSharePostId] = useState<string | null>(null);

  const today = new Date();

  const { data: memories } = useQuery({
    queryKey: ["memories", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const results: any[] = [];
      for (let yearsAgo = 1; yearsAgo <= 5; yearsAgo++) {
        const targetDate = subYears(today, yearsAgo);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          results.push(...data.map((p: any) => ({ ...p, yearsAgo })));
        }
      }

      if (results.length === 0) return [];

      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      return results.map((post: any) => ({
        ...post,
        profiles: prof,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });

  const memoryIds = memories?.map((m: any) => m.id) ?? [];

  const { data: likes } = useQuery({
    queryKey: ["memory-likes", memoryIds],
    queryFn: async () => {
      if (!memoryIds.length) return [];
      const { data } = await supabase
        .from("post_likes")
        .select("*")
        .in("post_id", memoryIds);
      return data || [];
    },
    enabled: memoryIds.length > 0,
  });

  const handleReact = async (postId: string, reactionType: string) => {
    if (!user) return;
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(false);
    try {
      const existing = likes?.find(
        (l: any) => l.post_id === postId && l.user_id === user.id
      );
      if (existing && existing.reaction_type === reactionType) {
        await supabase.from("post_likes").delete().eq("id", existing.id);
      } else if (existing) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("id", existing.id);
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id, reaction_type: reactionType });
      }
      queryClient.invalidateQueries({ queryKey: ["memory-likes"] });
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    } catch {
      toast.error("Failed to react");
    }
  };

  const slideCount = memories?.length ?? 0;

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || slideCount <= 1 || expanded) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideCount);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, slideCount, expanded]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slideCount);
    setIsAutoPlaying(false);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
    setIsAutoPlaying(false);
  }, [slideCount]);

  if (!memories || memories.length === 0 || dismissed) return null;

  const currentMemory = memories[currentSlide];

  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden animate-fade-in border border-primary/10">
      {/* Animated header */}
      <div className="relative p-4 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                On This Day
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </h3>
              <p className="text-xs text-muted-foreground">
                {format(today, "MMMM d")} · {memories.length} {memories.length === 1 ? "memory" : "memories"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/memories")}
              className="text-xs font-semibold text-primary hover:text-primary/80 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              View All
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel preview */}
      {!expanded ? (
        <div className="relative group">
          {/* Slide content */}
          <div className="p-4 min-h-[140px] transition-all duration-500 ease-out">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {currentMemory.yearsAgo} {currentMemory.yearsAgo === 1 ? "year" : "years"} ago
              </span>
            </div>

            {currentMemory.image_url ? (
              <div className="flex gap-3">
                <img
                  src={currentMemory.image_url}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0 shadow-sm hover-scale cursor-pointer"
                  onClick={() => setExpanded(true)}
                />
                <p className="text-foreground text-[15px] line-clamp-4 leading-relaxed flex-1">
                  {currentMemory.content}
                </p>
              </div>
            ) : (
              <p className="text-foreground text-[15px] line-clamp-3 leading-relaxed">
                {currentMemory.content}
              </p>
            )}
          </div>

          {/* Quick reaction bar */}
          <div className="px-4 pb-1 relative">
            {(() => {
              const postLikes = likes?.filter((l: any) => l.post_id === currentMemory.id) || [];
              const userLike = postLikes.find((l: any) => l.user_id === user?.id);
              const topReactions = REACTIONS
                .map((r) => ({ ...r, count: postLikes.filter((l: any) => l.reaction_type === r.type).length }))
                .filter((r) => r.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);
              
              return (
                <div className="flex items-center gap-2">
                  {topReactions.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="flex -space-x-0.5">
                        {topReactions.map((r) => (
                          <span key={r.type} className="text-sm">{r.emoji}</span>
                        ))}
                      </span>
                      <span>{postLikes.length}</span>
                    </div>
                  )}

                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnterReactions}
                    onMouseLeave={handleMouseLeaveReactions}
                  >
                    <button
                      onClick={() => handleReact(currentMemory.id, userLike ? userLike.reaction_type : "like")}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                        userLike
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {userLike ? (
                        <span className="text-sm">{REACTIONS.find((r) => r.type === userLike.reaction_type)?.emoji || "👍"}</span>
                      ) : (
                        <span className="text-sm">👍</span>
                      )}
                      {userLike ? REACTIONS.find((r) => r.type === userLike.reaction_type)?.label || "Like" : "React"}
                    </button>

                    {showReactions && (
                      <div 
                        onMouseEnter={handleMouseEnterReactions}
                        onMouseLeave={handleMouseLeaveReactions}
                        className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-card rounded-full shadow-lg border border-border px-2 py-1 z-50 animate-fade-in"
                      >
                        {REACTIONS.map((r) => (
                          <button
                            key={r.type}
                            onClick={() => handleReact(currentMemory.id, r.type)}
                            className="text-xl hover:scale-125 transition-transform px-0.5"
                            title={r.label}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSharePostId(currentMemory.id)}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                </div>
              );
            })()}
          </div>

          {slideCount > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card border border-border"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card border border-border"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </>
          )}

          {/* Dot indicators + expand button */}
          <div className="px-4 pb-3 flex items-center justify-between">
            {slideCount > 1 ? (
              <div className="flex items-center gap-1.5">
                {memories.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? "w-5 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div />
            )}
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 animate-fade-in">
          {memories.map((post: any, idx: number) => (
            <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
              <div className="text-xs font-semibold text-primary mb-2 bg-primary/10 inline-block px-2 py-0.5 rounded-full">
                {post.yearsAgo} {post.yearsAgo === 1 ? "year" : "years"} ago
              </div>
              <Post
                id={post.id}
                postUserId={post.user_id}
                author={post.profiles?.display_name || "You"}
                avatarUrl={post.profiles?.avatar_url}
                createdAt={post.created_at}
                content={post.content}
                image={post.image_url}
                imageUrls={post.image_urls || []}
                videoUrl={post.video_url || null}
                commentCount={0}
                privacy={post.privacy || "public"}
                backgroundStyle={post.background_style || null}
                location={post.location || null}
                feeling={post.feeling || null}
              />
            </div>
          ))}
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
          >
            Show less
          </button>
        </div>
      )}

      {sharePostId && currentMemory && (
        <ShareModal
          postId={sharePostId}
          authorLabel={currentMemory.profiles?.display_name || "You"}
          postContent={currentMemory.content}
          onClose={() => setSharePostId(null)}
        />
      )}
    </div>
  );
});

export default MemoriesCard;
