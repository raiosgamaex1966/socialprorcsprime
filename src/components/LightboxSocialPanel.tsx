import { useState, useEffect, useRef } from "react";
import { ThumbsUp, Heart, MessageCircle, Share2, Download, Send, Laugh, Frown, Angry } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import ShareModal from "@/components/ShareModal";

interface LightboxSocialPanelProps {
  postId: string;
  postType: "post" | "group_post";
  authorName: string;
  authorAvatar?: string | null;
  authorId?: string;
  createdAt: string;
  currentImageUrl?: string;
}

const REACTIONS = [
  { type: "like", icon: ThumbsUp, label: "Curtir", color: "text-primary" },
  { type: "love", icon: Heart, label: "Amei", color: "text-red-500" },
  { type: "haha", icon: Laugh, label: "Haha", color: "text-amber-500" },
  { type: "sad", icon: Frown, label: "Triste", color: "text-amber-600" },
  { type: "angry", icon: Angry, label: "Irado", color: "text-orange-600" },
];

const LightboxSocialPanel = ({
  postId,
  postType,
  authorName,
  authorAvatar,
  authorId,
  createdAt,
  currentImageUrl,
}: LightboxSocialPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const likesTable = postType === "post" ? "post_likes" : "group_post_likes";
  const likeFk = postType === "post" ? "post_id" : "group_post_id";
  const commentsTable = postType === "post" ? "comments" : "group_post_comments";
  const commentFk = postType === "post" ? "post_id" : "group_post_id";

  // Fetch likes
  const { data: likes } = useQuery({
    queryKey: ["lightbox-likes", postId, postType],
    queryFn: async () => {
      const { data } = await supabase
        .from(likesTable as any)
        .select("*")
        .eq(likeFk, postId);
      return (data as any[]) || [];
    },
    enabled: !!postId,
  });

  // Fetch comments with replies
  const { data: comments } = useQuery({
    queryKey: ["lightbox-comments", postId, postType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(commentsTable as any)
        .select("*")
        .eq(commentFk, postId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const allComments = data as any[];
      const userIds = [...new Set(allComments.map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const withProfiles = allComments.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id),
      }));

      // Separate top-level and replies
      const topLevel = withProfiles.filter((c: any) => !c.parent_id);
      const replies = withProfiles.filter((c: any) => c.parent_id);
      const replyMap = new Map<string, any[]>();
      replies.forEach((r: any) => {
        const arr = replyMap.get(r.parent_id) || [];
        arr.push(r);
        replyMap.set(r.parent_id, arr);
      });

      return topLevel.map((c: any) => ({
        ...c,
        replies: replyMap.get(c.id) || [],
      }));
    },
    enabled: !!postId,
  });

  const userReaction = likes?.find((l: any) => l.user_id === user?.id);
  const totalLikes = likes?.length || 0;

  const handleReaction = async (reactionType: string) => {
    if (!user) return;
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(false);

    try {
      if (userReaction) {
        await supabase.from(likesTable as any).delete().eq("id", userReaction.id);
      }

      if (!userReaction || userReaction.reaction_type !== reactionType) {
        await supabase.from(likesTable as any).insert({
          [likeFk]: postId,
          user_id: user.id,
          reaction_type: reactionType,
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["lightbox-likes", postId, postType] });
      queryClient.invalidateQueries({ queryKey: ["post-likes", postId] });
      queryClient.invalidateQueries({ queryKey: ["group-post-likes", postId] });
    } catch {
      toast.error("Falha ao reagir");
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const insertData: any = {
        [commentFk]: postId,
        user_id: user.id,
        content: commentText.trim(),
      };
      if (replyingTo) {
        insertData.parent_id = replyingTo.id;
      }
      await supabase.from(commentsTable as any).insert(insertData as any);
      setCommentText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["lightbox-comments", postId, postType] });
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      toast.error("Falha ao enviar comentário");
    }
    setSubmitting(false);
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyingTo({ id: commentId, name: authorName });
    inputRef.current?.focus();
  };

  const handleDownload = async () => {
    if (!currentImageUrl) return;
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada!");
    } catch {
      toast.error("Falha ao baixar imagem");
    }
  };

  // Group reactions by type for display
  const reactionCounts = likes?.reduce((acc: Record<string, number>, l: any) => {
    acc[l.reaction_type] = (acc[l.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <>
      <div
        className="w-full flex-1 flex-shrink-0 bg-card border-l border-border flex flex-col h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Author info */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img
            src={authorAvatar || defaultAvatar}
            alt={authorName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Reaction summary */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm">
          {Object.entries(reactionCounts).length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(reactionCounts).map(([type, count]) => {
                const r = REACTIONS.find((r) => r.type === type);
                if (!r) return null;
                const Icon = r.icon;
                return (
                  <span key={type} className="flex items-center gap-0.5 text-muted-foreground">
                    <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                    <span className="text-xs">{count as number}</span>
                  </span>
                );
              })}
              <span className="text-muted-foreground text-xs ml-1">
                {totalLikes} {totalLikes === 1 ? "reação" : "reações"}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">Nenhuma reação ainda</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center border-b border-border">
           <div className="relative flex-1">
            <button
              onMouseEnter={handleMouseEnterReactions}
              onMouseLeave={handleMouseLeaveReactions}
              onClick={() => handleReaction(userReaction?.reaction_type === "like" ? "like" : "like")}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary ${
                userReaction ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {userReaction ? (
                (() => {
                  const r = REACTIONS.find((r) => r.type === userReaction.reaction_type);
                  const Icon = r?.icon || ThumbsUp;
                  return <Icon className={`w-4 h-4 ${r?.color || "text-primary"}`} />;
                })()
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              {userReaction ? REACTIONS.find((r) => r.type === userReaction.reaction_type)?.label || "Curtir" : "Curtir"}
            </button>

            {showReactions && (
              <div
                onMouseEnter={handleMouseEnterReactions}
                onMouseLeave={handleMouseLeaveReactions}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-lg z-10"
              >
                {REACTIONS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.type}
                      onClick={() => handleReaction(r.type)}
                      title={r.label}
                      className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-transform hover:scale-125"
                    >
                      <Icon className={`w-5 h-5 ${r.color}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowShareDialog(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Baixar
          </button>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {(!comments || comments.length === 0) && (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhum comentário ainda. Seja o primeiro!</p>
          )}
          {comments?.map((c: any) => (
            <div key={c.id}>
              {/* Top-level comment */}
              <div className="flex gap-2">
                <img
                  src={c.profile?.avatar_url || defaultAvatar}
                  alt={c.profile?.display_name || "User"}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{c.profile?.display_name || "Usuário"}</p>
                    <p className="text-sm text-foreground mt-0.5 break-words">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                    <button
                      onClick={() => handleReply(c.id, c.profile?.display_name || "Usuário")}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Responder
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {c.replies?.length > 0 && (
                <div className="ml-10 mt-2 space-y-2">
                  {c.replies.map((r: any) => (
                    <div key={r.id} className="flex gap-2">
                      <img
                        src={r.profile?.avatar_url || defaultAvatar}
                        alt={r.profile?.display_name || "User"}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-secondary rounded-xl px-3 py-1.5">
                          <p className="text-xs font-semibold text-foreground">{r.profile?.display_name || "Usuário"}</p>
                          <p className="text-sm text-foreground mt-0.5 break-words">{r.content}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 ml-2">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment input */}
        <div className="p-3 border-t border-border">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-xs text-muted-foreground">
                Respondendo a <span className="font-semibold text-foreground">{replyingTo.name}</span>
              </p>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
              placeholder={replyingTo ? `Responder para ${replyingTo.name}...` : "Escreva um comentário..."}
              className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showShareDialog && (
        <div onClick={(e) => e.stopPropagation()}>
          <ShareModal postId={postId} authorLabel={authorName} postContent="" onClose={() => setShowShareDialog(false)} />
        </div>
      )}
    </>
  );
};

export default LightboxSocialPanel;
