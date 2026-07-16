import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface ReelCommentsSheetProps {
  reelId: string;
  onClose: () => void;
}

const ReelCommentsSheet = ({ reelId, onClose }: ReelCommentsSheetProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["reel-comments", reelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("reel_id", reelId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { display_name: "Usuário", avatar_url: null },
      }));
    },
    enabled: !!reelId,
  });

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reel_comments").insert({
        reel_id: reelId,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["reel-comments", reelId] });
      queryClient.invalidateQueries({ queryKey: ["reel-comment-counts"] });
    } catch (err: any) {
      toast.error("Falha ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-card rounded-t-2xl w-full max-w-[420px] max-h-[60vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h3 className="font-bold text-foreground">Comentários</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum comentário ainda. Seja o primeiro!
            </p>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.profile.avatar_url || defaultAvatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {comment.profile.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            placeholder="Adicionar um comentário..."
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReelCommentsSheet;
