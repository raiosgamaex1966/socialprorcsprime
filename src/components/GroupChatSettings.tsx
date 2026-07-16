import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, Crown, LogOut, UserMinus, Pencil, Camera, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import UserProfileCard from "@/components/UserProfileCard";

interface GroupChatSettingsProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupAvatarUrl: string | null;
  onUpdate: () => void;
}

const GroupChatSettings = ({ open, onClose, conversationId, groupName, groupAvatarUrl, onUpdate }: GroupChatSettingsProps) => {
  const { user } = useAuth();
  const [addSearch, setAddSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(groupName);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["group-members", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("*")
        .eq("conversation_id", conversationId);
      if (error) throw error;

      const userIds = (data as any[]).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));
    },
    enabled: open && !!conversationId,
  });

  const { data: addResults } = useQuery({
    queryKey: ["group-add-search", addSearch, conversationId],
    queryFn: async () => {
      const memberIds = members?.map((m: any) => m.user_id) || [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${addSearch}%`)
        .limit(10);
      if (error) throw error;
      return (data as any[]).filter((p: any) => !memberIds.includes(p.user_id));
    },
    enabled: open && addSearch.length > 0 && !!members,
  });

  const isAdmin = members?.some((m: any) => m.user_id === user?.id && m.role === "admin");

  const handleAddMember = async (userId: string) => {
    setAdding(true);
    try {
      const { error } = await supabase.rpc("add_group_member", {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });
      if (error) throw error;
      toast.success("Membro adicionado");
      setAddSearch("");
      refetchMembers();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Falha ao adicionar membro");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("remove_group_member", {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });
      if (error) throw error;
      if (userId === user?.id) {
        toast.success("Você saiu do grupo");
        onClose();
      } else {
        toast.success("Membro removido");
      }
      refetchMembers();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Falha ao remover membro");
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === groupName) {
      setEditingName(false);
      setNewName(groupName);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ group_name: newName.trim() })
        .eq("id", conversationId);
      if (error) throw error;
      toast.success("Grupo renomeado");
      setEditingName(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Falha ao renomear grupo");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `group-avatars/${conversationId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const { error } = await supabase
        .from("conversations")
        .update({ group_avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("id", conversationId);
      if (error) throw error;
      toast.success("Avatar do grupo atualizado");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 w-full max-w-none border-l border-border bg-card flex flex-col h-full shadow-lg md:static md:inset-auto md:w-[300px] md:max-w-none md:shadow-none">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between px-[12px] py-[22px]">
        <h3 className="text-sm font-semibold text-foreground">Informações do Grupo</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Group avatar & name */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            {groupAvatarUrl ? (
              <img src={groupAvatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{groupName}</p>
          {isAdmin ? (
            editingName ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  className="flex-1 px-2 py-1 rounded-md bg-secondary text-foreground text-xs outline-none border border-border"
                  autoFocus
                />
                <button
                  onClick={handleRename}
                  disabled={savingName}
                  className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNewName(groupName); setEditingName(true); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3 h-3" /> Renomear
              </button>
            )
          ) : null}
        </div>

        {/* Members */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Membros · {members?.length || 0}
          </h4>
          <div className="space-y-0.5">
            {members?.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary">
                <UserProfileCard userId={m.user_id}>
                  <img
                    src={m.profile?.avatar_url || defaultAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover cursor-pointer"
                  />
                </UserProfileCard>
                <div className="flex-1 min-w-0">
                  <UserProfileCard userId={m.user_id}>
                    <p className="text-xs font-medium text-foreground truncate cursor-pointer hover:underline">
                      {m.profile?.display_name || "Usuário"}
                      {m.user_id === user?.id && " (Você)"}
                    </p>
                  </UserProfileCard>
                  {m.role === "admin" && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Crown className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}
                </div>
                {m.user_id === user?.id ? (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                ) : isAdmin ? (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                  >
                    <UserMinus className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Add member */}
        {isAdmin && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Adicionar Membro
            </h4>
            <div className="relative mb-1.5">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Pesquisar pessoas..."
                className="w-full pl-7 pr-3 py-1.5 rounded-md bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-xs"
              />
            </div>
            {addResults && addResults.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border border-border">
                {addResults.map((u: any) => (
                  <button
                    key={u.user_id}
                    onClick={() => handleAddMember(u.user_id)}
                    disabled={adding}
                    className="w-full flex items-center gap-2 p-2 hover:bg-secondary transition-colors text-left"
                  >
                    <img src={u.avatar_url || defaultAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-xs text-foreground truncate flex-1">{u.display_name || "User"}</span>
                    <UserPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatSettings;
