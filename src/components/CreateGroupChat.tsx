import { useState } from "react";
import { Search, X, Users, Check } from "lucide-react";
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

interface CreateGroupChatProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

const CreateGroupChat = ({ open, onClose, onGroupCreated }: CreateGroupChatProps) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    { user_id: string; display_name: string | null; avatar_url: string | null }[]
  >([]);
  const [creating, setCreating] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["group-user-search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .neq("user_id", user!.id)
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: open && searchQuery.length > 0 && !!user,
  });

  const toggleUser = (u: { user_id: string; display_name: string | null; avatar_url: string | null }) => {
    setSelectedUsers((prev) =>
      prev.some((s) => s.user_id === u.user_id)
        ? prev.filter((s) => s.user_id !== u.user_id)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!user || selectedUsers.length < 2) {
      toast.error("Selecione pelo menos 2 pessoas para um chat em grupo");
      return;
    }
    if (!groupName.trim()) {
      toast.error("Por favor, insira o nome do grupo");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        p_group_name: groupName.trim(),
        p_member_ids: selectedUsers.map((u) => u.user_id),
      });
      if (error) throw error;
      onGroupCreated(data as string);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar grupo");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setSearchQuery("");
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Criar Chat em Grupo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nome do grupo..."
            className="w-full px-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm border border-border focus:ring-2 focus:ring-primary/20"
          />

          {/* Selected members */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.user_id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  <img
                    src={u.avatar_url || defaultAvatar}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  {u.display_name || "Usuário"}
                  <button onClick={() => toggleUser(u)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar pessoas para adicionar..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm"
            />
          </div>

          {/* Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              {searchResults.map((u: any) => {
                const isSelected = selectedUsers.some((s) => s.user_id === u.user_id);
                return (
                  <button
                    key={u.user_id}
                    onClick={() => toggleUser(u)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <img
                      src={u.avatar_url || defaultAvatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-foreground flex-1">
                      {u.display_name || "Usuário"}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {creating ? "Criando..." : `Criar Grupo (${selectedUsers.length + 1} membros)`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupChat;
