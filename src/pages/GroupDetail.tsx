import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Users, Settings, UserPlus, LogOut, Shield, ShieldCheck, UserMinus, Image as ImageIcon, ArrowLeft, Camera, Loader2, MessageCircle, Pencil, Check, X, MoreHorizontal, Trash2, Pin, Tag, Link, Copy, CheckCheck, Crown, Bell, BellOff, BarChart3, Rocket } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GROUP_CATEGORIES } from "@/constants/groupCategories";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import defaultAvatar from "@/assets/default-avatar.jpg";
import GroupPostInteractions from "@/components/GroupPostInteractions";
import ImageLightbox from "@/components/ImageLightbox";
import GroupEvents from "@/components/GroupEvents";
import GroupAnalytics from "@/components/GroupAnalytics";
import { useGroupNotificationPrefs } from "@/hooks/useGroupNotificationPrefs";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";
import SponsoredPostCard from "@/components/SponsoredPostCard";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import AppPageShell from "@/components/AppPageShell";
import BoostPostModal from "@/components/BoostPostModal";

const GroupDetail = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "private">("public");
  const [editCategory, setEditCategory] = useState("General");
  const [editRules, setEditRules] = useState("");
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPost, setLightboxPost] = useState<any>(null);
  const [transferTarget, setTransferTarget] = useState<any>(null);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [boostPostId, setBoostPostId] = useState<string | null>(null);
  const [boostPostContent, setBoostPostContent] = useState("");
  const { prefs: notifPrefs, toggleMute, updatePrefs: updateNotifPrefs } = useGroupNotificationPrefs(groupId);
  // sponsoredPosts hook moved below group query
  // Auto-scroll to events section when deep-linked
  useEffect(() => {
    if (searchParams.get("tab") === "events" && eventsRef.current) {
      setTimeout(() => {
        eventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, [searchParams]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleEditPost = async (postId: string) => {
    if (!editingPostContent.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("group_posts")
        .update({ content: editingPostContent.trim() })
        .eq("id", postId);
      if (error) throw error;
      setEditingPostId(null);
      refetchPosts();
      toast.success("Publicação atualizada");
    } catch {
      toast.error("Falha ao atualizar publicação");
    } finally {
      setSavingEdit(false);
    }
  };

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!groupId,
  });
  const { data: sponsoredPosts = [] } = useSponsoredPosts(group?.category);

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["group-detail-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId!)
        .order("joined_at");
      if (error) throw error;

      const userIds = (data || []).map((m: any) => m.user_id);
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) }));
    },
    enabled: !!groupId,
  });

  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ["group-posts", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_posts")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((p: any) => ({ ...p, profile: profileMap.get(p.user_id) }));
    },
    enabled: !!groupId,
  });

  // Fetch friends who are NOT already in the group
  const { data: invitableFriends } = useQuery({
    queryKey: ["invitable-friends", groupId, user?.id],
    queryFn: async () => {
      if (!user || !groupId) return [];
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (!friendships?.length) return [];

      const friendIds = friendships.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get current group member user_ids
      const { data: currentMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      const memberIds = new Set((currentMembers || []).map((m: any) => m.user_id));

      // Filter out already-members
      const availableIds = friendIds.filter((id: string) => !memberIds.has(id));
      if (!availableIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", availableIds);
      return profiles || [];
    },
    enabled: !!user && !!groupId && showInvite,
  });

  const approvedMembers = members?.filter((m: any) => m.status === "approved") || [];
  const pendingMembers = members?.filter((m: any) => m.status === "pending") || [];
  const currentMember = approvedMembers.find((m: any) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";
  const isMod = currentMember?.role === "moderator" || isAdmin;
  const isSoleAdmin = isAdmin && approvedMembers.filter((m: any) => m.role === "admin").length === 1;

  const handleGenerateInviteLink = async () => {
    if (!groupId || !user) return;
    setGeneratingLink(true);
    try {
      // Check for existing active invite
      const { data: existing } = await supabase
        .from("group_invites" as any)
        .select("code")
        .eq("group_id", groupId)
        .eq("is_active", true)
        .limit(1);

      if (existing && (existing as any[]).length > 0) {
        const code = (existing as any[])[0].code;
        setInviteLink(`${window.location.origin}/groups/invite/${code}`);
      } else {
        const { data, error } = await supabase
          .from("group_invites" as any)
          .insert({ group_id: groupId, created_by: user.id } as any)
          .select("code")
          .single();
        if (error) throw error;
        setInviteLink(`${window.location.origin}/groups/invite/${(data as any).code}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invite link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success("Link de convite copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!groupId) return;
    setInviting(friendId);
    try {
      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: friendId, role: "member", status: "approved" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["invitable-friends", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-detail-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Amigo adicionado ao grupo!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao convidar");
    } finally {
      setInviting(null);
    }
  };

  const handlePost = async () => {
    if (!user || (!postContent.trim() && postImages.length === 0) || !groupId) return;
    setPosting(true);
    try {
      // Upload images
      let uploadedUrls: string[] = [];
      if (postImages.length > 0) {
        for (const file of postImages) {
          const ext = file.name.split(".").pop();
          const path = `${groupId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("group-images")
            .upload(path, file);
          if (uploadErr) throw uploadErr;
          const { data: { publicUrl } } = supabase.storage
            .from("group-images")
            .getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from("group_posts")
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: postContent.trim() || " ",
          image_url: uploadedUrls[0] || null,
          image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
        });
      if (error) throw error;
      setPostContent("");
      setPostImages([]);
      setPostImagePreviews([]);
      refetchPosts();
      toast.success("Publicado no grupo!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao publicar");
    } finally {
      setPosting(false);
    }
  };

  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + postImages.length > 10) {
      toast.error("Máximo de 10 imagens por publicação");
      return;
    }
    const newFiles = [...postImages, ...files].slice(0, 10);
    setPostImages(newFiles);
    setPostImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removePostImage = (index: number) => {
    const newFiles = postImages.filter((_, i) => i !== index);
    setPostImages(newFiles);
    setPostImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    if (!groupId || !isAdmin) return;
    const setUploading = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${groupId}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("group-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("group-images")
        .getPublicUrl(path);

      const updateField = type === "avatar" ? "avatar_url" : "cover_photo_url";
      const { error: updateError } = await supabase
        .from("groups")
        .update({ [updateField]: publicUrl } as never)
        .eq("id", groupId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`${type === "avatar" ? "Avatar" : "Foto de capa"} atualizada!`);
    } catch (err: any) {
      toast.error(err.message || `Falha ao enviar ${type === "avatar" ? "o avatar" : "a foto de capa"}`);
    } finally {
      setUploading(false);
    }
  };

  const openSettings = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description || "");
    setEditPrivacy(group.privacy as "public" | "private");
    setEditCategory((group as any).category || "General");
    setEditRules((group as any).rules || "");
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!groupId || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: editName.trim().slice(0, 100),
          description: editDescription.trim().slice(0, 500) || null,
          privacy: editPrivacy,
          category: editCategory,
          rules: editRules.trim() || null,
        } as any)
        .eq("id", groupId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      setShowSettings(false);
      toast.success("Configurações do grupo atualizadas!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao atualizar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !groupId) return;
    try {
      await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      toast.success("Saiu do grupo");
      navigate("/groups");
    } catch {
      toast.error("Falha ao sair do grupo");
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      await supabase.from("group_members").update({ status: "approved" }).eq("id", memberId);
      refetchMembers();
      toast.success("Membro aprovado!");
    } catch {
      toast.error("Falha ao aprovar");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await supabase.from("group_members").delete().eq("id", memberId);
      refetchMembers();
      toast.success("Membro removido");
    } catch {
      toast.error("Falha ao remover");
    }
  };

  const handleSetRole = async (memberId: string, role: string) => {
    try {
      await supabase.from("group_members").update({ role }).eq("id", memberId);
      refetchMembers();
      toast.success(`Função atualizada para ${role === "admin" ? "administrador" : role === "moderator" ? "moderador" : "membro"}`);
    } catch {
      toast.error("Falha ao atualizar função");
    }
  };

  const handleMuteMember = async (memberId: string, muted: boolean) => {
    try {
      await supabase.from("group_members").update({ status: muted ? "muted" : "approved" }).eq("id", memberId);
      refetchMembers();
      toast.success(muted ? "Membro silenciado" : "Membro ativo");
    } catch {
      toast.error("Falha ao atualizar");
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget || !groupId || !user) return;
    try {
      // Promote the target to admin
      await supabase.from("group_members").update({ role: "admin" }).eq("id", transferTarget.id);
      // Update groups.created_by to the new owner
      await supabase.from("groups").update({ created_by: transferTarget.user_id } as any).eq("id", groupId);
      // Demote self to member
      const selfMember = approvedMembers.find((m: any) => m.user_id === user.id);
      if (selfMember) {
        await supabase.from("group_members").update({ role: "member" }).eq("id", selfMember.id);
      }
      setTransferTarget(null);
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success(`Propriedade transferida para ${transferTarget.profile?.display_name || "membro"}`);
    } catch {
      toast.error("Falha ao transferir propriedade");
    }
  };
  const handlePinPost = async (postId: string, pinned: boolean) => {
    if (!user || !groupId) return;
    try {
      const { error } = await supabase
        .from("group_posts")
        .update(pinned
          ? { pinned: true, pinned_at: new Date().toISOString(), pinned_by: user.id }
          : { pinned: false, pinned_at: null, pinned_by: null }
        )
        .eq("id", postId);
      if (error) throw error;
      refetchPosts();
      toast.success(pinned ? "Publicação fixada" : "Publicação desafixada");
    } catch {
      toast.error("Falha ao atualizar fixação");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Find the post to get its image URLs before deleting
      const post = posts?.find((p: any) => p.id === postId);
      const imageUrls: string[] = post?.image_urls || [];

      // Delete images from storage bucket
      if (imageUrls.length > 0) {
        const filePaths = imageUrls
          .map((url: string) => {
            const match = url.match(/group-images\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from("group-images").remove(filePaths);
        }
      }

      await supabase.from("group_posts").delete().eq("id", postId);
      refetchPosts();
      toast.success("Publicação excluída");
    } catch {
      toast.error("Falha ao excluir");
    }
  };

  if (!group) return <div className="min-h-screen bg-background" />;

  return (
    <AppPageShell as="div">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/groups")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar para Grupos
        </Button>

        {/* Group Header */}
        <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
          {/* Cover Photo */}
          <div
            className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 relative"
            style={group.cover_photo_url ? { backgroundImage: `url(${group.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
          />
          <div className="p-5 -mt-10">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-xl bg-primary/20 border-4 border-card flex items-center justify-center overflow-hidden relative"
              >
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-10 h-10 text-primary" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-xl font-bold text-foreground">{group.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {group.privacy === "private" ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  <span>Grupo {group.privacy === "private" ? "Privado" : "Público"}</span>
                  <span>·</span>
                  <span>{approvedMembers.length} {approvedMembers.length === 1 ? "membro" : "membros"}</span>
                </div>
              </div>
            </div>
            {((group as any).category && (group as any).category !== "General") && (
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Tag className="w-3 h-3" />
                {(group as any).category}
              </span>
            )}
            {group.description && (
              <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
            )}
            {(group as any).rules && (
              <details className="mt-2 text-sm">
                <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Regras do Grupo
                </summary>
                <p className="mt-1.5 text-muted-foreground whitespace-pre-line text-xs bg-secondary/50 rounded-lg p-3">
                  {(group as any).rules}
                </p>
              </details>
            )}

            <div className="flex items-center gap-2 mt-4">
              {currentMember && group.conversation_id && (
                <Button size="sm" onClick={() => navigate(`/messages?conversation=${group.conversation_id}`)}>
                  <MessageCircle className="w-4 h-4" />
                  Conversa do Grupo
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setShowMembers(!showMembers)}>
                <Users className="w-4 h-4" />
                Membros {pendingMembers.length > 0 && isMod && `(${pendingMembers.length} pendentes)`}
              </Button>
              {currentMember && (
                <Button variant="secondary" size="sm" onClick={() => setShowInvite(!showInvite)}>
                  <UserPlus className="w-4 h-4" />
                  Convidar
                </Button>
              )}
              {currentMember && (
                <Button
                  variant={notifPrefs.muted ? "ghost" : "secondary"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowNotifSettings(!showNotifSettings)}
                  title={notifPrefs.muted ? "Notificações silenciadas" : "Configurações de notificações"}
                >
                  {notifPrefs.muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </Button>
              )}
              {currentMember && (
                <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Notification Settings Panel */}
        {showNotifSettings && currentMember && (
          <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Configurações de Notificações
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNotifSettings(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Mute All */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Silenciar todas as notificações</p>
                    <p className="text-xs text-muted-foreground">Silenciar todos os alertas deste grupo</p>
                  </div>
                </div>
                <button
                  onClick={toggleMute}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    notifPrefs.muted ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifPrefs.muted ? "left-5" : "left-1"
                  }`} />
                </button>
              </label>

              {!notifPrefs.muted && (
                <>
                  {/* New Posts */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">Novas publicações</p>
                      <p className="text-xs text-muted-foreground">Receber notificações quando os membros publicarem</p>
                    </div>
                    <button
                      onClick={() => updateNotifPrefs({ notify_posts: !notifPrefs.notify_posts })}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notifPrefs.notify_posts ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        notifPrefs.notify_posts ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </label>

                  {/* Comments */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">Comentários</p>
                      <p className="text-xs text-muted-foreground">Receber notificações sobre comentários em suas publicações</p>
                    </div>
                    <button
                      onClick={() => updateNotifPrefs({ notify_comments: !notifPrefs.notify_comments })}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notifPrefs.notify_comments ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        notifPrefs.notify_comments ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </label>

                  {/* Events */}
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">Eventos</p>
                      <p className="text-xs text-muted-foreground">Receber notificações sobre novos eventos e lembretes</p>
                    </div>
                    <button
                      onClick={() => updateNotifPrefs({ notify_events: !notifPrefs.notify_events })}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notifPrefs.notify_events ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        notifPrefs.notify_events ? "left-5" : "left-1"
                      }`} />
                    </button>
                  </label>
                </>
              )}
            </div>
          </div>
        )}


        {/* Invite Friends Panel */}
        {showInvite && currentMember && (
          <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Convidar Amigos
              </h2>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Shareable Invite Link */}
            {isMod && (
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5" />
                  Link de Convite Compartilhável
                </p>
                {inviteLink ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border-none outline-none truncate"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      {copiedLink ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateInviteLink}
                    disabled={generatingLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {generatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                    {generatingLink ? "Gerando..." : "Gerar Link de Convite"}
                  </button>
                )}
              </div>
            )}

            <p className="text-sm font-medium text-foreground mb-2">Convidar Amigos</p>
            {!invitableFriends?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum amigo disponível para convidar. Eles já podem ser membros.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invitableFriends.map((friend: any) => (
                  <div key={friend.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <img
                      src={friend.avatar_url || defaultAvatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {friend.display_name || "Desconhecido"}
                    </span>
                    <button
                      onClick={() => handleInviteFriend(friend.user_id)}
                      disabled={inviting === friend.user_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {inviting === friend.user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      {inviting === friend.user_id ? "Adicionando..." : "Adicionar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Panel */}
        {showMembers && (
          <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4 animate-fade-in">
            <h2 className="font-bold text-foreground mb-3">Membros</h2>

            <div className="space-y-2">
              {approvedMembers.map((m: any) => (
                <div key={m.id} className={`flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors ${m.user_id === user?.id ? "ring-1 ring-primary/20 bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img
                        src={m.profile?.avatar_url || defaultAvatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        onClick={() => navigate(`/profile/${m.user_id}`)}
                      />
                      {m.role === "admin" && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Crown className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {m.role === "moderator" && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground cursor-pointer hover:underline" onClick={() => navigate(`/profile/${m.user_id}`)}>
                          {m.profile?.display_name || "Desconhecido"}
                        </span>
                        {m.user_id === user?.id && <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Você</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {m.role === "admin" && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>}
                        {m.role === "moderator" && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Mod</span>}
                        {m.role === "member" && <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">Membro</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {currentMember && (
          <div ref={eventsRef}>
            <GroupEvents groupId={groupId!} isAdminOrMod={isMod} />
          </div>
        )}

        {/* Post Composer */}
        {currentMember && currentMember.status !== "muted" && (
          <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Escreva algo para o grupo..."
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30"
              rows={3}
            />
            {/* Image previews */}
            {postImagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {postImagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePostImage(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => postImageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                Foto
              </button>
              <input
                ref={postImageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePostImageSelect}
              />
              <button
                onClick={handlePost}
                disabled={(!postContent.trim() && postImages.length === 0) || posting}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {posting ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        )}

        {/* Banner Ad */}
        <HorizontalBannerAd category={group?.category} variant="slim" className="mt-4" />

        {/* Posts Feed */}
        <div className="space-y-4 mt-4">
          {[...(posts || [])].sort((a: any, b: any) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
          }).map((post: any, index: number) => (
            <div key={post.id}>
            <div className={`bg-card rounded-xl shadow-sm border p-4 ${post.pinned ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
              {post.pinned && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2 -mt-1">
                  <Pin className="w-3 h-3" /> Publicação fixada
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={post.profile?.avatar_url || defaultAvatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover cursor-pointer"
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground cursor-pointer hover:underline" onClick={() => navigate(`/profile/${post.user_id}`)}>
                      {post.profile?.display_name || "Desconhecido"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                      {post.updated_at !== post.created_at && " · editada"}
                    </p>
                  </div>
                </div>
                {(post.user_id === user?.id || isMod) && (
                  <div className="relative group/menu">
                    <button className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] opacity-0 invisible group-focus-within/menu:opacity-100 group-focus-within/menu:visible transition-all z-10">
                      {post.user_id === user?.id && (
                        <button
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditingPostContent(post.content || "");
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar publicação
                        </button>
                      )}
                      {isMod && (
                        <button
                          onClick={() => handlePinPost(post.id, !post.pinned)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <Pin className="w-3.5 h-3.5" /> {post.pinned ? "Desafixar publicação" : "Fixar publicação"}
                        </button>
                        )}
                        {post.user_id === user?.id && (
                          <button
                            onClick={() => { setBoostPostId(post.id); setBoostPostContent(post.content || ""); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                          >
                            <Rocket className="w-3.5 h-3.5" /> Impulsionar publicação
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir publicação
                        </button>
                    </div>
                  </div>
                )}
              </div>
              {editingPostId === post.id ? (
                <div className="mt-3">
                  <textarea
                    value={editingPostContent}
                    onChange={(e) => setEditingPostContent(e.target.value)}
                    className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none min-h-[80px]"
                    maxLength={5000}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button
                      onClick={() => setEditingPostId(null)}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleEditPost(post.id)}
                      disabled={!editingPostContent.trim() || savingEdit}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {savingEdit ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              ) : (
                post.content?.trim() && (
                  <p className="text-foreground text-[15px] mt-3 whitespace-pre-wrap">{post.content}</p>
                )
              )}
              {/* Post Images */}
              {(() => {
                const images: string[] = post.image_urls?.length > 0
                  ? post.image_urls
                  : post.image_url
                    ? [post.image_url]
                    : [];
                if (images.length === 0) return null;
                return (
                  <div className={`mt-3 grid gap-1 rounded-lg overflow-hidden ${
                    images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2"
                  }`}>
                    {images.slice(0, 4).map((url: string, i: number) => (
                      <div
                        key={i}
                        className={`relative ${images.length === 3 && i === 0 ? "col-span-2" : ""} ${images.length === 1 ? "max-h-96" : "aspect-square"} overflow-hidden cursor-pointer`}
                        onClick={() => {
                          setLightboxImages(images);
                          setLightboxIndex(i);
                          setLightboxPost(post);
                          setLightboxOpen(true);
                        }}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 3 && images.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">+{images.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <GroupPostInteractions postId={post.id} groupId={groupId!} postAuthorId={post.user_id} postAuthorName={post.profile?.display_name || "Desconhecido"} postContent={post.content || ""} />
            </div>
            {sponsoredPosts.length > 0 && (index + 1) % 4 === 0 && sponsoredPosts[Math.floor(index / 4) % sponsoredPosts.length] && (
              <div className="mt-4">
                <SponsoredPostCard post={sponsoredPosts[Math.floor(index / 4) % sponsoredPosts.length]} />
              </div>
            )}
            </div>
          ))}

          {(!posts || posts.length === 0) && currentMember && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma publicação ainda. Seja o primeiro a compartilhar algo!
            </div>
          )}

          {!currentMember && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Participe deste grupo para ver publicações e começar a interagir.
            </div>
          )}
        </div>
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        postId={lightboxPost?.id}
        postType="group_post"
        authorName={lightboxPost?.profile?.display_name || "Usuário"}
        authorAvatar={lightboxPost?.profile?.avatar_url}
        authorId={lightboxPost?.user_id}
        createdAt={lightboxPost?.created_at}
      />

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSoleAdmin ? "Você é o único administrador" : "Sair do grupo?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSoleAdmin ? (
                <>Você deve transferir a propriedade ou promover outro membro a administrador antes de sair do grupo <span className="font-semibold">{group?.name}</span>. Abra o painel de Membros e use o botão <Crown className="w-3.5 h-3.5 inline text-primary" /> para transferir a propriedade.</>
              ) : (
                <>Tem certeza de que deseja sair do grupo <span className="font-semibold">{group?.name}</span>? Você perderá o acesso às publicações e ao chat do grupo.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isSoleAdmin ? (
              <AlertDialogCancel>Entendi</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeave}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sair do Grupo
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir propriedade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja transferir a propriedade do grupo <span className="font-semibold">{group?.name}</span> para <span className="font-semibold">{transferTarget?.profile?.display_name || "este membro"}</span>? Você passará a ser um membro comum.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferOwnership}>
              Transferir Propriedade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {boostPostId && (
        <BoostPostModal
          postId={boostPostId}
          postContent={boostPostContent}
          onClose={() => { setBoostPostId(null); setBoostPostContent(""); }}
        />
      )}
    </AppPageShell>
  );
};

export default GroupDetail;
