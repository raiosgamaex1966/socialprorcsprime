import { useState } from "react";
import { Reply, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import UserProfileCard from "@/components/UserProfileCard";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

interface PageComment {
  id: string;
  page_post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
}

const PageCommentItem = ({
  comment,
  replies,
  allReplies,
  onReply,
  depth = 0,
}: {
  comment: PageComment;
  replies: PageComment[];
  allReplies: PageComment[];
  onReply: (parentId: string, authorName: string) => void;
  depth?: number;
}) => {
  const [showReplies, setShowReplies] = useState(depth === 0);
  const maxDepth = 3;

  return (
    <div className={depth > 0 ? "ml-8 mt-2" : ""}>
      <div className="flex gap-2">
        <UserProfileCard userId={comment.user_id}>
          <img
            src={comment.profiles?.avatar_url || defaultAvatar}
            alt={comment.profiles?.display_name || "User"}
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
          <div className="flex items-center gap-3 ml-3 mt-0.5">
            <span className="text-[12px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            <button
              onClick={() => onReply(comment.id, comment.profiles?.display_name || "Desconhecido")}
              className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
                  <PageCommentItem
                    key={reply.id}
                    comment={reply}
                    replies={childReplies}
                    allReplies={allReplies}
                    onReply={onReply}
                    depth={depth + 1}
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

interface PagePostCommentsProps {
  pagePostId: string;
}

const PagePostComments = ({ pagePostId }: PagePostCommentsProps) => {
  const { user } = useAuth();
  const { profile: currentProfile } = useCurrentProfile();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ["page-post-comments", pagePostId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_post_comments")
        .select("*")
        .eq("page_post_id", pagePostId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      if (userIds.length === 0) return [] as PageComment[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data as any[]).map((c: any) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      })) as PageComment[];
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("page_post_comments").insert({
        page_post_id: pagePostId,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyTo?.id || null,
      });
      if (error) throw error;

      // Notify page owner about the comment
      const { data: pagePost } = await supabase
        .from("page_posts")
        .select("page_id")
        .eq("id", pagePostId)
        .single();
      if (pagePost) {
        const { data: page } = await supabase
          .from("pages")
          .select("created_by, name")
          .eq("id", pagePost.page_id)
          .single();
        if (page && page.created_by !== user.id) {
          await supabase.from("notifications").insert({
            user_id: page.created_by,
            actor_id: user.id,
            type: "page_post_comment",
            message: `comentou em uma publicação em "${page.name}"`,
            reference_id: pagePostId,
          });
        }
      }

      setNewComment("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["page-post-comments", pagePostId] });
      queryClient.invalidateQueries({ queryKey: ["page-post-comment-count", pagePostId] });
    } catch (error: any) {
      toast.error(error.message || "Falha ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const topLevelComments = comments?.filter((c) => !c.parent_id) || [];
  const allReplies = comments?.filter((c) => !!c.parent_id) || [];
  const commentCount = comments?.length ?? 0;

  return (
    <div className="border-t border-border">
      <div className="px-4 py-2 space-y-3 max-h-[400px] overflow-y-auto">
        {topLevelComments.map((comment) => {
          const directReplies = allReplies.filter((r) => r.parent_id === comment.id);
          return (
            <PageCommentItem
              key={comment.id}
              comment={comment}
              replies={directReplies}
              allReplies={allReplies}
              onReply={(parentId, name) => setReplyTo({ id: parentId, name })}
            />
          );
        })}
        {commentCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum comentário ainda</p>
        )}
      </div>

      <div className="px-4 py-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 ml-10 text-[13px] text-muted-foreground">
            <Reply className="w-3.5 h-3.5" />
            <span>
              Respondendo a <span className="font-semibold text-foreground">{replyTo.name}</span>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-primary hover:underline font-semibold"
            >
              Cancelar
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <img
            src={currentProfile?.avatar_url || defaultAvatar}
            alt="You"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              placeholder={replyTo ? `Responder para ${replyTo.name}...` : "Escreva um comentário..."}
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

export default PagePostComments;
