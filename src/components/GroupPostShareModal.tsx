import { useState } from "react";
import { X, Share2, Send, Users, Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface GroupPostShareModalProps {
  postId: string;
  groupId: string;
  postAuthorName: string;
  postContent: string;
  onClose: () => void;
}

const GroupPostShareModal = ({ postId, groupId, postAuthorName, postContent, onClose }: GroupPostShareModalProps) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"timeline" | "friend">("timeline");
  const [shareText, setShareText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState("");

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

  const handleShareToTimeline = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: shareText.trim() || `Compartilhou uma publicação de grupo de ${postAuthorName}`,
        shared_group_post_id: postId,
      } as any);
      if (error) throw error;
      toast.success("Compartilhado no seu feed!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Falha ao compartilhar");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFriend = async () => {
    if (!user || !selectedFriend) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("is_group", false)
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${selectedFriend}),and(participant_one.eq.${selectedFriend},participant_two.eq.${user.id})`
        )
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ participant_one: user.id, participant_two: selectedFriend })
          .select("id")
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      const groupPostUrl = `${window.location.origin}/groups/${groupId}`;
      const messageContent = shareText.trim()
        ? `${shareText.trim()}\n\n📎 Publicação de grupo de ${postAuthorName}: ${groupPostUrl}`
        : `📎 Compartilhou uma publicação de grupo de ${postAuthorName}: ${groupPostUrl}`;

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
      });
      if (error) throw error;

      toast.success("Enviado para o amigo!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-lg w-full max-w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div />
          <h2 className="text-lg font-bold text-foreground">Compartilhar Publicação de Grupo</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("timeline")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === "timeline" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Repeat2 className="w-4 h-4" /> Seu Feed
          </button>
          <button
            onClick={() => setTab("friend")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === "friend" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Users className="w-4 h-4" /> Enviar para Amigo
          </button>
        </div>

        <div className="mx-4 mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Publicação de grupo de {postAuthorName}</p>
          <p className="text-sm text-foreground line-clamp-3">{postContent}</p>
        </div>

        <div className="px-4 mt-3">
          <textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            placeholder={tab === "timeline" ? "Escreva algo sobre isso..." : "Adicione uma mensagem..."}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[60px]"
            maxLength={500}
          />
        </div>

        {tab === "friend" && (
          <div className="px-4 mt-3">
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Pesquisar amigos..."
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
            />
            <div className="max-h-[160px] overflow-y-auto space-y-1">
              {filteredFriends?.map((friend: any) => (
                <button
                  key={friend.user_id}
                  onClick={() => setSelectedFriend(friend.user_id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    selectedFriend === friend.user_id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-secondary"
                  }`}
                >
                  <img src={friend.avatar_url || defaultAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-sm font-medium text-foreground">{friend.display_name}</span>
                </button>
              ))}
              {filteredFriends?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum amigo encontrado</p>
              )}
            </div>
          </div>
        )}

        <div className="p-4">
          <button
            onClick={tab === "timeline" ? handleShareToTimeline : handleSendToFriend}
            disabled={loading || (tab === "friend" && !selectedFriend)}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Compartilhando..." : tab === "timeline" ? (
              <><Repeat2 className="w-4 h-4" /> Compartilhar no Feed</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupPostShareModal;
