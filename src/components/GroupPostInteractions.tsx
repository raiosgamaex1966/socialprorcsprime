import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.jpg";
import ShareModal from "@/components/ShareModal";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Curtir" },
  { type: "love", emoji: "❤️", label: "Amei" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Uau" },
  { type: "sad", emoji: "😢", label: "Triste" },
  { type: "angry", emoji: "😡", label: "Irado" },
];

interface GroupPostInteractionsProps {
  postId: string;
  groupId: string;
  postAuthorId: string;
  postAuthorName: string;
  postContent: string;
}

const GroupPostInteractions = ({ postId, groupId, postAuthorId, postAuthorName, postContent }: GroupPostInteractionsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
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

  const [showShare, setShowShare] = useState(false);

  // Fetch likes
  const { data: likes } = useQuery({
    queryKey: ["group-post-likes", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_post_likes")
        .select("*")
        .eq("group_post_id", postId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch comments with profiles
  const { data: comments } = useQuery({
    queryKey: ["group-post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_post_comments")
        .select("*")
        .eq("group_post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id),
      }));
    },
    enabled: showComments,
  });

  const userLike = likes?.find((l: any) => l.user_id === user?.id);
  const likeCount = likes?.length || 0;

  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: likes?.filter((l: any) => l.reaction_type === r.type).length ?? 0,
  })).filter((r) => r.count > 0);

  // Build comment tree
  const topLevelComments = comments?.filter((c: any) => !c.parent_id) || [];
  const replies = comments?.filter((c: any) => c.parent_id) || [];
  const replyMap = new Map<string, any[]>();
  replies.forEach((r: any) => {
    const arr = replyMap.get(r.parent_id) || [];
    arr.push(r);
    replyMap.set(r.parent_id, arr);
  });

  const commentCount = comments?.length || 0;

  const handleReact = async (reactionType: string) => {
    if (!user) return;
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(false);
    try {
      if (userLike) {
        // Delete existing reaction first
        await supabase
          .from("group_post_likes")
          .delete()
          .eq("group_post_id", postId)
          .eq("user_id", user.id);
      }

      if (!userLike || userLike.reaction_type !== reactionType) {
        // Insert new reaction
        await supabase
          .from("group_post_likes")
          .insert({ group_post_id: postId, user_id: user.id, reaction_type: reactionType });
        if (postAuthorId !== user.id) {
          await supabase.from("notifications").insert({
            user_id: postAuthorId,
            actor_id: user.id,
            type: "group_post_like",
            message: "reagiu à sua publicação no grupo",
            reference_id: postId,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["group-post-likes", postId] });
    } catch {
      toast.error("Falha ao reagir");
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("group_post_comments").insert({
        group_post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
        parent_id: replyTo?.id || null,
      });
      const notifyUserId = replyTo ? null : postAuthorId;
      if (notifyUserId && notifyUserId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: notifyUserId,
          actor_id: user.id,
          type: "group_post_comment",
          message: "comentou na sua publicação no grupo",
          reference_id: postId,
        });
      }
      setCommentText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
    } catch {
      toast.error("Falha ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await supabase.from("group_post_comments").delete().eq("id", commentId);
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
    } catch {
      toast.error("Falha ao excluir comentário");
    }
  };

  const currentReaction = userLike ? REACTIONS.find((r) => r.type === userLike.reaction_type) : null;

  const CommentItem = ({ comment, depth = 0 }: { comment: any; depth?: number }) => {
    const childReplies = replyMap.get(comment.id) || [];
    return (
      <div className={depth > 0 ? "ml-8 border-l-2 border-border pl-3" : ""}>
        <div className="flex items-start gap-2 py-2">
          <img
            src={comment.profile?.avatar_url || defaultAvatar}
            alt=""
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-secondary rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-foreground">
                {comment.profile?.display_name || "Desconhecido"}
              </p>
              <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 px-1">
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
              </span>
              {depth < 2 && (
                <button
                  onClick={() => setReplyTo({ id: comment.id, name: comment.profile?.display_name || "Desconhecido" })}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                >
                  Responder
                </button>
              )}
              {comment.user_id === user?.id && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
        {childReplies.map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="border-t border-border mt-3 pt-2">
      {/* Reaction & Comment counts */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted-foreground">
          {likeCount > 0 && (
            <span className="flex items-center gap-1">
              {reactionCounts.slice(0, 3).map((r) => (
                <span key={r.type} className="text-sm -mr-0.5">{r.emoji}</span>
              ))}
              <span className="ml-1">{likeCount}</span>
            </span>
          )}
          {commentCount > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {commentCount} {commentCount === 1 ? "comentário" : "comentários"}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center border-t border-border relative">
        <div
          className="flex-1 relative"
          onMouseEnter={handleMouseEnterReactions}
          onMouseLeave={handleMouseLeaveReactions}
        >
          {/* Reaction picker popup */}
          {showReactions && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-full shadow-lg px-2 py-1.5 flex items-center gap-0.5 z-20 animate-fade-in">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleReact(r.type)}
                  className={`text-xl hover:scale-125 transition-transform px-1.5 py-0.5 rounded-full ${
                    userLike?.reaction_type === r.type ? "bg-secondary scale-110" : ""
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => handleReact(currentReaction ? currentReaction.type : "like")}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-secondary ${
              currentReaction ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {currentReaction ? (
              <>
                <span className="text-base">{currentReaction.emoji}</span>
                {currentReaction.label}
              </>
            ) : (
              <>
                <span className="text-base">👍</span>
                Curtir
              </>
            )}
          </button>
        </div>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors rounded-lg hover:bg-secondary"
        >
          <MessageCircle className="w-4 h-4" />
          Comentar
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors rounded-lg hover:bg-secondary"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareModal
          postId={postId}
          authorLabel={postAuthorName}
          postContent={postContent}
          title="Compartilhar publicação do grupo"
          shareType="group_post"
          shareUrl={`/groups/${groupId}`}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border pt-2 animate-fade-in">
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {topLevelComments.map((comment: any) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            {topLevelComments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum comentário ainda</p>
            )}
          </div>

          {replyTo && (
            <div className="flex items-center gap-2 px-2 pt-2 text-xs text-muted-foreground">
              <span>Respondendo a <strong className="text-foreground">{replyTo.name}</strong></span>
              <button onClick={() => setReplyTo(null)} className="text-destructive hover:underline">Cancelar</button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
              placeholder={replyTo ? `Responder para ${replyTo.name}...` : "Escreva um comentário..."}
              className="flex-1 bg-secondary rounded-full px-3.5 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={1000}
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting}
              className="p-2 rounded-full text-primary hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupPostInteractions;
