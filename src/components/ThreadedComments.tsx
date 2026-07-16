import { useState, useEffect, useRef } from "react";
import { Reply, Send, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import UserProfileCard from "@/components/UserProfileCard";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface Comment {
  id: string;
  post_id?: string;
  group_post_id?: string;
  page_post_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
}

interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: string;
}

interface ThreadedCommentsProps {
  postId: string;
  postUserId: string;
  groupId?: string;
  pageId?: string;
}

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Curtir" },
  { type: "love", emoji: "❤️", label: "Amei" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Uau" },
  { type: "sad", emoji: "😢", label: "Triste" },
  { type: "angry", emoji: "😡", label: "Irado" },
];

const CommentReactions = ({ commentId }: { commentId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const pickerTimeoutRef = useRef<any>(null);

  const handleMouseEnterPicker = () => {
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    setShowPicker(true);
  };

  const handleMouseLeavePicker = () => {
    pickerTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    };
  }, []);

  const { data: likes } = useQuery({
    queryKey: ["comment-likes", commentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_likes")
        .select("*")
        .eq("comment_id", commentId);
      if (error) throw error;
      return data as CommentLike[];
    },
  });

  const userLike = likes?.find((l) => l.user_id === user?.id);
  const totalLikes = likes?.length ?? 0;

  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: likes?.filter((l) => l.reaction_type === r.type).length ?? 0,
  })).filter((r) => r.count > 0);

  const handleReact = async (reactionType: string) => {
    if (!user) return;
    setShowPicker(false);
    try {
      if (userLike && userLike.reaction_type === reactionType) {
        await supabase.from("comment_likes").delete().eq("id", userLike.id);
      } else if (userLike) {
        await supabase.from("comment_likes").update({ reaction_type: reactionType }).eq("id", userLike.id);
      } else {
        await supabase.from("comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["comment-likes", commentId] });
    } catch {
      toast.error("Falha ao reagir");
    }
  };

  return (
    <div className="relative inline-flex items-center max-w-full">
      <button
        onClick={() => handleReact(userLike?.reaction_type === "like" ? "like" : "like")}
        onMouseEnter={handleMouseEnterPicker}
        onMouseLeave={handleMouseLeavePicker}
        className={`text-[12px] font-semibold transition-colors ${
          userLike ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {userLike
          ? REACTIONS.find((r) => r.type === userLike.reaction_type)?.label || "Curtir"
          : "Curtir"}
      </button>

      {totalLikes > 0 && (
        <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
          {reactionCounts.slice(0, 3).map((r) => (
            <span key={r.type} className="text-[10px]">{r.emoji}</span>
          ))}
          {totalLikes}
        </span>
      )}

      {showPicker && (
        <div
          className="absolute bottom-full right-0 mb-1 flex items-center gap-0.5 whitespace-nowrap bg-card rounded-full shadow-lg border border-border px-1.5 py-1 z-50"
          onMouseEnter={handleMouseEnterPicker}
          onMouseLeave={handleMouseLeavePicker}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={(e) => { e.stopPropagation(); handleReact(r.type); }}
              className={`text-lg hover:scale-125 transition-transform px-0.5 ${
                userLike?.reaction_type === r.type ? "scale-125" : ""
              }`}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CommentItem = ({
  comment,
  replies,
  allReplies,
  onReply,
  depth = 0,
  groupId,
  pageId,
}: {
  comment: Comment;
  replies: Comment[];
  allReplies: Comment[];
  onReply: (parentId: string, authorName: string) => void;
  depth?: number;
  groupId?: string;
  pageId?: string;
}) => {
  const [showReplies, setShowReplies] = useState(depth === 0);
  const maxDepth = 3;

  return (
    <div className={depth > 0 ? "ml-8 mt-2" : ""}>
      <div className="flex gap-2">
        <UserProfileCard userId={comment.user_id}>
          <img
            src={comment.profiles?.avatar_url || defaultAvatar}
            alt={comment.profiles?.display_name || "Usuário"}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5 cursor-pointer"
          />
        </UserProfileCard>
        <div className="flex-1 min-w-0">
          <div className="bg-secondary rounded-2xl px-3 py-2">
            <UserProfileCard userId={comment.user_id}>
              <p className="font-semibold text-[13px] text-foreground hover:underline cursor-pointer inline">
                {comment.profiles?.display_name || "Desconhecido"}
              </p>
            </UserProfileCard>
            <p className="text-[15px] text-foreground">{comment.content}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-3 mt-0.5 min-w-0">
            <span className="text-[12px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            {!groupId && !pageId && <CommentReactions commentId={comment.id} />}
            <button
              onClick={() => onReply(comment.id, comment.profiles?.display_name || "Desconhecido")}
              className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Responder
            </button>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <>
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-10 mt-1 flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
            >
              <Reply className="w-3.5 h-3.5" />
              {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
            </button>
          ) : (
            <div className="mt-1">
              {replies.map((reply) => {
                const childReplies =
                  depth < maxDepth - 1
                    ? allReplies.filter((r) => r.parent_id === reply.id)
                    : [];
                return (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    replies={childReplies}
                    allReplies={allReplies}
                    onReply={onReply}
                    depth={depth + 1}
                    groupId={groupId}
                    pageId={pageId}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ThreadedComments = ({ postId, postUserId, groupId, pageId }: ThreadedCommentsProps) => {
  const { user } = useAuth();
  const { profile: currentProfile } = useCurrentProfile();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const commentsTable = groupId ? "group_post_comments" : pageId ? "page_post_comments" : "comments";
  const commentFk = groupId ? "group_post_id" : pageId ? "page_post_id" : "post_id";
  const commentsQueryKey = groupId ? ["group-post-comments", postId] : pageId ? ["page-post-comments", postId] : ["comments", postId];

  const { data: comments, refetch } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(commentsTable)
        .select("*")
        .eq(commentFk, postId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const commentsData = (data || []) as Comment[];
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      if (userIds.length === 0) return [] as Comment[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return commentsData.map((c) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      })) as Comment[];
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from(commentsTable as any).insert({
        [commentFk]: postId,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyTo?.id || null,
      } as any);
      if (error) throw error;

      if (postUserId !== user.id) {
        const type = groupId ? "group_post_comment" : pageId ? "page_post_comment" : "comment";
        const message = groupId
          ? (replyTo ? "respondeu a um comentário na sua publicação no grupo" : "comentou na sua publicação no grupo")
          : pageId
            ? (replyTo ? "respondeu a um comentário na sua publicação na página" : "comentou na sua publicação na página")
            : (replyTo ? "respondeu a um comentário na sua publicação" : "comentou na sua publicação");

        await supabase.from("notifications").insert({
          user_id: postUserId,
          actor_id: user.id,
          type,
          reference_id: postId,
          message,
        });
      }

      setNewComment("");
      setReplyTo(null);
      refetch();

      // Invalidate comment counts
      const commentsCountQueryKey = groupId ? ["group-comment-count", postId] : pageId ? ["page-comment-count", postId] : ["comment-count", postId];
      queryClient.invalidateQueries({ queryKey: commentsCountQueryKey });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (error: any) {
      toast.error(error.message || "Falha ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (parentId: string, authorName: string) => {
    setReplyTo({ id: parentId, name: authorName });
  };

  const topLevelComments = comments?.filter((c) => !c.parent_id) || [];
  const allReplies = comments?.filter((c) => !!c.parent_id) || [];

  return (
    <div className="border-t border-border">
      <div className="px-4 py-2 space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden">
        {topLevelComments.map((comment) => {
          const directReplies = allReplies.filter((r) => r.parent_id === comment.id);
          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={directReplies}
              allReplies={allReplies}
              onReply={handleReply}
              groupId={groupId}
              pageId={pageId}
            />
          );
        })}
        {comments?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum comentário ainda</p>
        )}
      </div>

      <div className="px-4 py-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 ml-10 text-[13px] text-muted-foreground">
            <Reply className="w-3.5 h-3.5" />
            <span>Respondendo a <span className="font-semibold text-foreground">{replyTo.name}</span></span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-primary hover:underline font-semibold"
            >
              Cancelar
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <img src={currentProfile?.avatar_url || defaultAvatar} alt="You" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              placeholder={replyTo ? `Responder a ${replyTo.name}...` : "Escreva um comentário..."}
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
              maxLength={1000}
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="ml-2 text-primary disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadedComments;
