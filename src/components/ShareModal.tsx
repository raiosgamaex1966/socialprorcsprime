import { useState, useCallback } from "react";
import { X, Send, Users, Repeat2, Search, Copy, Link2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";

export interface ShareModalProps {
  postId: string;
  /** Label shown in preview & fallback share text */
  authorLabel: string;
  postContent: string;
  onClose: () => void;
  /** Title shown in header — defaults to "Share Post" */
  title?: string;
  /** Which column to set when sharing to timeline */
  shareType?: "post" | "group_post" | "page_post";
  /** URL path used when sending to a friend (e.g. "/groups/abc") */
  shareUrl?: string;
}

const ShareModal = ({
  postId,
  authorLabel,
  postContent,
  onClose,
  title = "Compartilhar Publicação",
  shareType = "post",
  shareUrl,
}: ShareModalProps) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"timeline" | "friend">("timeline");
  const [shareText, setShareText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: friends } = useQuery({
    queryKey: ["share-friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      if (error) throw error;

      const friendIds = (data || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      if (friendIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds);
      return profiles || [];
    },
    enabled: tab === "friend" && !!user,
  });

  const filteredFriends = friends?.filter((f: any) =>
    f.display_name?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCopyLink = useCallback(() => {
    const url = shareUrl
      ? `${window.location.origin}${shareUrl}`
      : `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl, postId]);

  const handleShareToTimeline = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const insertData: any = {
        user_id: user.id,
        content: shareText.trim() || `Compartilhou uma publicação de ${authorLabel}`,
      };
      if (shareType === "group_post") insertData.shared_group_post_id = postId;
      else if (shareType === "page_post") insertData.shared_page_post_id = postId;
      else insertData.shared_post_id = postId;

      const { error } = await supabase.from("posts").insert(insertData);
      if (error) throw error;
      toast.success("Compartilhado na sua linha do tempo!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Falha ao compartilhar");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFriends = async () => {
    if (!user || selectedFriends.length === 0) return;
    setLoading(true);
    try {
      for (const friendId of selectedFriends) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("is_group", false)
          .or(
            `and(participant_one.eq.${user.id},participant_two.eq.${friendId}),and(participant_one.eq.${friendId},participant_two.eq.${user.id})`
          )
          .maybeSingle();

        let conversationId = existing?.id;
        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({ participant_one: user.id, participant_two: friendId })
            .select("id")
            .single();
          if (convError) throw convError;
          conversationId = newConv.id;
        }

        const postUrl = shareUrl
          ? `${window.location.origin}${shareUrl}`
          : `${window.location.origin}/?post=${postId}`;
        const messageContent = shareText.trim()
          ? `${shareText.trim()}\n\n📎 ${authorLabel}: ${postUrl}`
          : `📎 Compartilhou uma publicação de ${authorLabel}: ${postUrl}`;

        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
        });
        if (error) throw error;
      }

      toast.success(
        selectedFriends.length === 1 ? "Enviado ao amigo!" : `Enviado para ${selectedFriends.length} amigos!`
      );
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-[460px] shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-2 gap-1">
          {[
            { key: "timeline" as const, icon: Repeat2, label: "Linha do Tempo" },
            { key: "friend" as const, icon: Users, label: "Amigos" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                tab === key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Post preview */}
        <div className="mx-5 mt-3 p-3 rounded-lg bg-muted/50 border border-border/60">
          <p className="text-[11px] text-muted-foreground font-medium mb-1 uppercase tracking-wide">
            {authorLabel}
          </p>
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{postContent}</p>
        </div>

        {/* Share text */}
        <div className="px-5 mt-3">
          <textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            placeholder={tab === "timeline" ? "Diga algo sobre isso..." : "Adicione uma mensagem..."}
            className="w-full bg-muted/50 border border-border/60 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all min-h-[56px]"
            maxLength={500}
          />
        </div>

        {/* Friend selection */}
        {tab === "friend" && (
          <div className="px-5 mt-3">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Pesquisar amigos..."
                className="w-full bg-muted/50 border border-border/60 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>

            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedFriends.map((id) => {
                  const friend = friends?.find((f: any) => f.user_id === id);
                  return friend ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {(friend as any).display_name}
                      <button onClick={() => toggleFriend(id)} className="hover:text-primary/70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <div className="max-h-[150px] overflow-y-auto space-y-0.5 scrollbar-thin">
              {filteredFriends?.map((friend: any) => {
                const isSelected = selectedFriends.includes(friend.user_id);
                return (
                  <button
                    key={friend.user_id}
                    onClick={() => toggleFriend(friend.user_id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      isSelected
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <img
                      src={friend.avatar_url || defaultAvatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-border/50"
                    />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{friend.display_name}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredFriends?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum amigo encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4 pt-3 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="h-10 px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar link"}
          </button>
          <button
            onClick={tab === "timeline" ? handleShareToTimeline : handleSendToFriends}
            disabled={loading || (tab === "friend" && selectedFriends.length === 0)}
            className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Compartilhando...
              </span>
            ) : tab === "timeline" ? (
              <>
                <Repeat2 className="w-4 h-4" />
                Compartilhar na Linha do Tempo
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar{selectedFriends.length > 1 ? ` (${selectedFriends.length})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
