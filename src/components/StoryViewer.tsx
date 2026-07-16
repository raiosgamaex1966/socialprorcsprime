import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Send, Bookmark, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

interface GroupedStory {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  stories: Story[];
}

interface StoryViewerProps {
  groups: GroupedStory[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 6000;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "🔥", "👏", "🎉"];

const StoryViewer = ({ groups, initialGroupIndex, onClose }: StoryViewerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [savingHighlight, setSavingHighlight] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(STORY_DURATION);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const goNext = useCallback(() => {
    if (!groups) return;
    const currentGroup = groups[groupIndex];
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(i => i + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(i => i + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [groupIndex, storyIndex, groups, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(i => i - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [groupIndex, storyIndex, groups]);

  // Auto-advance timer for images
  useEffect(() => {
    if (!story || story.media_type === "video") return;
    if (paused) return;

    remainingRef.current = STORY_DURATION;
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
        return;
      }
      timerRef.current = requestAnimationFrame(animate);
    };
    timerRef.current = requestAnimationFrame(animate);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [story?.id, paused, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  const sendReaction = async (emoji: string) => {
    if (!user || !story) return;
    try {
      await supabase.from("story_reactions").upsert({
        story_id: story.id,
        user_id: user.id,
        emoji,
      });
      toast.success(`Reagiu com ${emoji}`);
      setShowReactions(false);
    } catch {
      toast.error("Falha ao reagir");
    }
  };

  const sendReply = async () => {
    if (!user || !story || !replyText.trim()) return;
    try {
      await supabase.from("story_reactions").upsert({
        story_id: story.id,
        user_id: user.id,
        emoji: "💬",
        message: replyText.trim(),
      });
      toast.success("Resposta enviada!");
      setReplyText("");
    } catch {
      toast.error("Falha ao enviar resposta");
    }
  };

  const saveToHighlight = async () => {
    if (!user || !story || savingHighlight) return;
    setSavingHighlight(true);
    try {
      // Check if user has a default highlight, create one if not
      let { data: highlights } = await supabase
        .from("story_highlights")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      let highlightId: string;
      if (highlights && highlights.length > 0) {
        highlightId = highlights[0].id;
      } else {
        const { data: newHighlight, error } = await supabase
          .from("story_highlights")
          .insert({ user_id: user.id, title: "Highlights", cover_url: story.media_url })
          .select("id")
          .single();
        if (error) throw error;
        highlightId = newHighlight.id;
      }

      await supabase.from("story_highlight_items").insert({
        highlight_id: highlightId,
        media_url: story.media_url,
        media_type: story.media_type,
      });

      queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
      toast.success("Salvo nos destaques!");
    } catch {
      toast.error("Falha ao salvar");
    } finally {
      setSavingHighlight(false);
    }
  };

  if (!story || !group) return null;

  const isOwn = group.user_id === user?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
      </div>

      {/* Story container */}
      <div className="relative w-full max-w-[420px] h-full max-h-[90vh] mx-auto rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden backdrop-blur-sm">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress * 100}%` : "0%",
                  transition: i === storyIndex ? "none" : "width 0.3s",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden ring-2 ring-primary/50">
              <img
                src={group.avatar_url || defaultAvatar}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-white text-sm font-bold drop-shadow-lg">
                {isOwn ? "Seu story" : group.display_name}
              </p>
              <p className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused(p => !p)}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {story.media_type === "video" ? (
            <video
              key={story.id}
              src={story.media_url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onEnded={goNext}
            />
          ) : (
            <img
              key={story.id}
              src={story.media_url}
              alt=""
              className="w-full h-full object-contain animate-in fade-in duration-300"
            />
          )}
        </div>

        {/* Click zones for navigation */}
        <div className="absolute inset-0 flex z-10">
          <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full cursor-pointer" onClick={goNext} />
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Reaction bar */}
          {showReactions && (
            <div className="flex gap-2 justify-center mb-3 animate-in slide-in-from-bottom-4 duration-200">
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isOwn ? (
              <>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Responder ao story..."
                  className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 rounded-full px-4 py-2.5 text-sm border border-white/20 outline-none focus:border-white/40 transition-colors"
                  onFocus={() => setPaused(true)}
                  onBlur={() => !replyText && setPaused(false)}
                />
                {replyText ? (
                  <button
                    onClick={sendReply}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowReactions(v => !v)}
                      className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={saveToHighlight}
                  disabled={savingHighlight}
                  className="flex items-center gap-2 text-white/80 hover:text-white text-sm bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <Bookmark className="w-4 h-4" />
                  {savingHighlight ? "Salvando..." : "Salvar no Destaque"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side navigation arrows */}
      {groupIndex > 0 && (
        <button
          onClick={() => { setGroupIndex(i => i - 1); setStoryIndex(0); setProgress(0); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white z-20 hover:bg-white/20 transition-colors border border-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button
          onClick={() => { setGroupIndex(i => i + 1); setStoryIndex(0); setProgress(0); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white z-20 hover:bg-white/20 transition-colors border border-white/10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default StoryViewer;
