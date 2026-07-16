import { useState, useRef, useEffect } from "react";
import { Globe, Lock, Camera, ImagePlus, X, Search, UserPlus, Loader2, Tag, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateGroupProps {
  open: boolean;
  onClose: () => void;
}

import { GROUP_CATEGORIES, GROUP_CATEGORY_LABELS } from "@/constants/groupCategories";

const CreateGroup = ({ open, onClose }: CreateGroupProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [category, setCategory] = useState("General");
  const [rules, setRules] = useState("");
  const [creating, setCreating] = useState(false);

  // Image state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Invite state
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Friends query
  const { data: friends } = useQuery({
    queryKey: ["friends-for-invite", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (!data?.length) return [];
      const friendIds = data.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds);
      return profiles || [];
    },
    enabled: !!user && open && step === 3,
  });

  const filteredFriends = (friends || []).filter((f: any) =>
    !friendSearch ||
    f.display_name?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  // Cleanup previews
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrivacy("public");
    setCategory("General");
    setRules("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setSelectedFriends([]);
    setFriendSearch("");
    setStep(1);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const toggleFriend = (friend: any) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.user_id === friend.user_id)
        ? prev.filter((f) => f.user_id !== friend.user_id)
        : [...prev, friend]
    );
  };

  const uploadImage = async (file: File, path: string) => {
    const ext = file.name.split(".").pop();
    const filePath = `${path}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("group-images")
      .upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("group-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      let avatarUrl: string | null = null;
      let coverUrl: string | null = null;

      if (avatarFile) avatarUrl = await uploadImage(avatarFile, "avatars");
      if (coverFile) coverUrl = await uploadImage(coverFile, "covers");

      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          privacy,
          created_by: user.id,
          avatar_url: avatarUrl,
          cover_photo_url: coverUrl,
          category,
          rules: rules.trim() || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Add creator as admin
      await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "admin", status: "approved" });

      // Invite selected friends
      if (selectedFriends.length > 0) {
        const invites = selectedFriends.map((f) => ({
          group_id: group.id,
          user_id: f.user_id,
          role: "member",
          status: privacy === "public" ? "approved" : "pending",
        }));
        await supabase.from("group_members").insert(invites);

        // Send notifications
        const notifications = selectedFriends.map((f) => ({
          user_id: f.user_id,
          actor_id: user.id,
          type: "friend_request",
          message: `convidou você para participar do grupo "${name.trim()}"`,
          reference_id: group.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      toast.success("Grupo criado!");
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar grupo");
    } finally {
      setCreating(false);
    }
  };

  const canProceedStep1 = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Criar Novo Grupo
            <span className="text-xs font-normal text-muted-foreground">Etapa {step}/3</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic info + images */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Cover photo */}
            <div
              onClick={() => coverRef.current?.click()}
              className="relative w-full h-28 rounded-xl bg-secondary border-2 border-dashed border-border hover:border-primary/40 cursor-pointer overflow-hidden transition-colors group"
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground hover:bg-background"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground group-hover:text-primary transition-colors">
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Adicionar Foto de Capa</span>
                </div>
              )}
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>

            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-10 ml-4 relative z-10">
              <div
                onClick={() => avatarRef.current?.click()}
                className="w-16 h-16 rounded-xl bg-secondary border-2 border-background shadow-md cursor-pointer overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="pb-1">
                <p className="text-xs text-muted-foreground">Avatar do grupo</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Nome do Grupo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome do grupo..."
                className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sobre o que é este grupo?"
                className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{description.length}/500</p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Avançar
            </button>
          </div>
        )}

        {/* Step 2: Privacy, Category, Rules */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Privacidade</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrivacy("public")}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                    privacy === "public"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Público
                </button>
                <button
                  onClick={() => setPrivacy("private")}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
                    privacy === "private"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Privado
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {privacy === "public"
                  ? "Qualquer pessoa pode encontrar e entrar neste grupo"
                  : "Os membros devem ser aprovados por um administrador"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5" /> Categoria
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{GROUP_CATEGORY_LABELS[cat] || cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Regras do Grupo
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Defina diretrizes para os membros (opcional)..."
                className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={3}
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{rules.length}/2000</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-secondary text-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Avançar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Invite friends */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Convidar Amigos
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Pesquisar amigos..."
                  className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Selected friends */}
            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedFriends.map((f) => (
                  <span
                    key={f.user_id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    {f.display_name || "Usuário"}
                    <button onClick={() => toggleFriend(f)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Friends list */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-lg border border-border">
              {filteredFriends.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {friends?.length ? "Nenhum amigo corresponde à pesquisa" : "Nenhum amigo para convidar"}
                </p>
              ) : (
                filteredFriends.map((f: any) => {
                  const isSelected = selectedFriends.some((s) => s.user_id === f.user_id);
                  return (
                    <button
                      key={f.user_id}
                      onClick={() => toggleFriend(f)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-secondary"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={f.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {(f.display_name || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground flex-1 truncate">
                        {f.display_name || "Usuário"}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-secondary text-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-muted transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? "Criando..." : selectedFriends.length > 0 ? `Criar e Convidar (${selectedFriends.length})` : "Criar Grupo"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroup;
