import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventCommentsProps {
  eventId: string;
}

const EventComments = ({ eventId }: EventCommentsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["event-comments", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_comments" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) }));
    },
    enabled: !!eventId,
  });

  const topLevel = comments.filter((c: any) => !c.parent_id);
  const replies = comments.filter((c: any) => !!c.parent_id);
  const replyMap = new Map<string, any[]>();
  replies.forEach((r: any) => {
    if (!replyMap.has(r.parent_id)) replyMap.set(r.parent_id, []);
    replyMap.get(r.parent_id)!.push(r);
  });

  const handlePost = async (parentId?: string) => {
    if (!user) return;
    const text = parentId ? replyContent : content;
    if (!text.trim()) return;
    setSending(true);
    try {
      await supabase.from("event_comments" as any).insert({
        event_id: eventId,
        user_id: user.id,
        content: text.trim(),
        parent_id: parentId || null,
      } as any);
      if (parentId) {
        setReplyContent("");
        setReplyTo(null);
      } else {
        setContent("");
      }
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
    } catch {
      toast.error("Falha ao publicar comentário");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await supabase.from("event_comments" as any).delete().eq("id", commentId);
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
    } catch {
      toast.error("Falha ao excluir comentário");
    }
  };

  const CommentItem = ({ comment, isReply }: { comment: any; isReply?: boolean }) => (
    <div className={`flex gap-2 ${isReply ? "ml-8 mt-1.5" : "mt-2"}`}>
      <Avatar className="w-6 h-6 flex-shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || ""} />
        <AvatarFallback className="text-[10px]">
          {(comment.profile?.display_name || "?")[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-secondary/60 rounded-lg px-2.5 py-1.5">
          <p className="text-[11px] font-semibold text-foreground">{comment.profile?.display_name || "Desconhecido"}</p>
          <p className="text-xs text-foreground">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
          </span>
          {!isReply && (
            <button
              onClick={() => { setReplyTo(comment.id); setReplyContent(""); }}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Responder
            </button>
          )}
          {comment.user_id === user?.id && (
            <button
              onClick={() => handleDelete(comment.id)}
              className="text-[10px] text-muted-foreground hover:text-destructive"
            >
              Excluir
            </button>
          )}
        </div>
        {/* Reply input */}
        {replyTo === comment.id && (
          <div className="flex items-center gap-1.5 mt-1.5 ml-0">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva uma resposta..."
              className="flex-1 px-2.5 py-1 bg-background rounded-full text-xs border border-border outline-none focus:ring-1 focus:ring-primary/30"
              onKeyDown={(e) => e.key === "Enter" && handlePost(comment.id)}
              autoFocus
            />
            <button
              onClick={() => handlePost(comment.id)}
              disabled={!replyContent.trim() || sending}
              className="p-1 text-primary hover:text-primary/80 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Replies */}
        {(replyMap.get(comment.id) || []).map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-2 border-t border-border pt-2">
      {topLevel.map((comment: any) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}

      {/* New comment input */}
      <div className="flex items-center gap-1.5 mt-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 px-3 py-1.5 bg-background rounded-full text-xs border border-border outline-none focus:ring-1 focus:ring-primary/30"
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
        />
        <button
          onClick={() => handlePost()}
          disabled={!content.trim() || sending}
          className="p-1.5 text-primary hover:text-primary/80 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      {comments.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-1">Nenhum comentário ainda</p>
      )}
    </div>
  );
};

export default EventComments;
