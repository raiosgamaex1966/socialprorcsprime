import { useState } from "react";
import { Search, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForwardMessageProps {
  open: boolean;
  onClose: () => void;
  message: {
    content: string;
    attachment_url?: string | null;
    attachment_type?: string | null;
    attachment_name?: string | null;
  } | null;
}

interface ConvOption {
  id: string;
  label: string;
  avatar: string | null;
  is_group: boolean;
}

const ForwardMessage = ({ open, onClose, message }: ForwardMessageProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [forwarding, setForwarding] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["forward-conversations"],
    queryFn: async () => {
      // DM conversations
      const { data: dmConvs } = await supabase
        .from("conversations")
        .select("*")
        .eq("is_group", false)
        .or(`participant_one.eq.${user!.id},participant_two.eq.${user!.id}`)
        .order("updated_at", { ascending: false });

      // Group conversations
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      const groupIds = (memberships || []).map((m: any) => m.conversation_id);
      let groupConvs: any[] = [];
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from("conversations")
          .select("*")
          .eq("is_group", true)
          .in("id", groupIds)
          .order("updated_at", { ascending: false });
        groupConvs = data || [];
      }

      // Get profiles for DM partners
      const otherIds = (dmConvs || [])
        .map((c: any) => (c.participant_one === user!.id ? c.participant_two : c.participant_one))
        .filter(Boolean);
      const { data: profiles } = otherIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", otherIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const options: ConvOption[] = [];
      (dmConvs || []).forEach((c: any) => {
        const otherId = c.participant_one === user!.id ? c.participant_two : c.participant_one;
        const p = profileMap.get(otherId);
        options.push({ id: c.id, label: p?.display_name || "User", avatar: p?.avatar_url || null, is_group: false });
      });
      groupConvs.forEach((c: any) => {
        options.push({ id: c.id, label: c.group_name || "Chat de Grupo", avatar: c.group_avatar_url || null, is_group: true });
      });
      return options;
    },
    enabled: open && !!user,
  });

  const filtered = conversations?.filter((c) =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForward = async (convId: string) => {
    if (!message || !user) return;
    setForwarding(convId);
    try {
      const forwardedContent = `↪ Encaminhado: ${message.content}`;
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: forwardedContent,
        attachment_url: message.attachment_url || null,
        attachment_type: message.attachment_type || null,
        attachment_name: message.attachment_name || null,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      toast.success("Mensagem encaminhada");
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao encaminhar mensagem");
    } finally {
      setForwarding(null);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Encaminhar Mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Preview */}
          {message && (
            <div className="p-3 rounded-lg bg-secondary text-sm text-foreground line-clamp-3">
              {message.content}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar conversas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm"
              autoFocus
            />
          </div>

          {/* Conversation list */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {filtered?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa encontrada</p>
            )}
            {filtered?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleForward(conv.id)}
                disabled={!!forwarding}
                className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left disabled:opacity-50"
              >
                <img
                  src={conv.avatar || defaultAvatar}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {conv.label}
                </span>
                {conv.is_group && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Grupo</span>
                )}
                <Send className="w-4 h-4 text-primary shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessage;
