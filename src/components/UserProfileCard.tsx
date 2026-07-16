import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageCircle, UserPlus, UserCheck, Eye, Clock, Users, FileText, Calendar, ShieldBan, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface UserProfileCardProps {
  userId: string;
  children: React.ReactNode;
}

const UserProfileCard = ({ userId, children }: UserProfileCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOnline } = useOnlinePresence();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-card", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio, cover_photo_url, created_at, last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: friendship } = useQuery({
    queryKey: ["friendship-card", user?.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, status, requester_id")
        .or(`and(requester_id.eq.${user!.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user!.id})`)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!userId && user.id !== userId,
    staleTime: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-card-stats", userId],
    queryFn: async () => {
      const [{ count: postCount }, { count: friendCount }] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("friendships").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      ]);
      return { posts: postCount ?? 0, friends: friendCount ?? 0 };
    },
    enabled: !!userId,
    staleTime: 120000,
  });

  const { data: mutualCount } = useQuery({
    queryKey: ["mutual-friends", user?.id, userId],
    queryFn: async () => {
      const { data: myFriends } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const myFriendIds = new Set(
        (myFriends || []).map((f: any) => f.requester_id === user!.id ? f.addressee_id : f.requester_id)
      );
      const { data: theirFriends } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      const theirFriendIds = new Set(
        (theirFriends || []).map((f: any) => f.requester_id === userId ? f.addressee_id : f.requester_id)
      );
      let count = 0;
      myFriendIds.forEach((id) => { if (theirFriendIds.has(id)) count++; });
      return count;
    },
    enabled: !!user && !!userId && user.id !== userId,
    staleTime: 120000,
  });

  const { data: isBlocked } = useQuery({
    queryKey: ["is-blocked", user?.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user!.id)
        .eq("blocked_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!userId && user.id !== userId,
    staleTime: 60000,
  });

  const isFriend = friendship?.status === "accepted";
  const isPending = friendship?.status === "pending";
  const online = isOnline(userId);
  const isOwnProfile = user?.id === userId;
  const displayName = profile?.display_name || (isOwnProfile ? "Você" : "Usuário");

  const handleMessage = () => navigate(`/messages?userId=${userId}`);
  const handleViewProfile = () => navigate(`/profile/${userId}`);

  const handleAddFriend = async () => {
    if (!user) return;
    try {
      await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: userId });
    } catch {}
  };

  const handleBlock = async () => {
    if (!user) return;
    setShowBlockDialog(false);
    try {
      await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
      // Also remove friendship if exists
      if (friendship?.id) {
        await supabase.from("friendships").delete().eq("id", friendship.id);
      }
      queryClient.invalidateQueries({ queryKey: ["is-blocked", user.id, userId] });
      queryClient.invalidateQueries({ queryKey: ["friendship-card", user.id, userId] });
      toast({ title: "Usuário bloqueado", description: `${displayName} foi bloqueado(a).` });
    } catch {
      toast({ title: "Erro", description: "Falha ao bloquear usuário.", variant: "destructive" });
    }
  };

  const handleUnblock = async () => {
    if (!user) return;
    try {
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      queryClient.invalidateQueries({ queryKey: ["is-blocked", user.id, userId] });
      toast({ title: "Usuário desbloqueado", description: `${displayName} foi desbloqueado(a).` });
    } catch {
      toast({ title: "Erro", description: "Falha ao desbloquear usuário.", variant: "destructive" });
    }
  };

  const lastSeenText = profile?.last_seen_at
    ? formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true, locale: ptBR })
    : null;

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : null;

  return (
    <>
      <HoverCard openDelay={300} closeDelay={150}>
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent className="w-80 p-0 overflow-hidden rounded-xl border-border/50 shadow-xl" sideOffset={8}>
          {/* Cover photo */}
          <div
            className="h-20 relative"
            style={
              profile?.cover_photo_url
                ? { backgroundImage: `url(${profile.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.05))" }
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-popover/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="px-4 pb-4 -mt-8 relative">
            <div className="flex items-end justify-between mb-2">
              <div className="relative">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-[3px] border-popover shadow-md"
                />
                {online && (
                  <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-popover ring-2 ring-green-500/20" />
                )}
              </div>
              {!isOwnProfile && (
                <button
                  onClick={handleViewProfile}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Eye className="w-3 h-3" /> Ver Perfil
                </button>
              )}
            </div>

            <p className="font-semibold text-sm text-popover-foreground leading-tight">{displayName}</p>
            {profile?.bio && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{profile.bio}</p>
            )}

            {/* Activity status */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {online ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Ativo(a) agora
                </span>
              ) : lastSeenText ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {lastSeenText}
                </span>
              ) : null}
              {!isOwnProfile && typeof mutualCount === "number" && mutualCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {mutualCount} em comum
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 py-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-popover-foreground">{stats?.posts ?? "—"}</span>
                <span className="text-muted-foreground">publicações</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-popover-foreground">{stats?.friends ?? "—"}</span>
                <span className="text-muted-foreground">amigos</span>
              </div>
              {joinDate && (
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{joinDate}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isOwnProfile && (
              <div className="flex items-center gap-2 mt-2">
                {isBlocked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnblock}
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Desbloquear
                  </Button>
                ) : (
                  <>
                    {isFriend ? (
                      <Button variant="secondary" size="sm" className="flex-1">
                        <UserCheck className="w-3.5 h-3.5" /> Amigos
                      </Button>
                    ) : isPending ? (
                      <Button variant="secondary" size="sm" className="flex-1 opacity-70" disabled>
                        <UserPlus className="w-3.5 h-3.5" /> Pendente
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleAddFriend} className="flex-1">
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar amigo
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={handleMessage} className="flex-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Mensagem
                    </Button>
                  </>
                )}
                {!isBlocked && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setShowBlockDialog(true)}
                    title="Bloquear usuário"
                  >
                    <ShieldBan className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}

            {isOwnProfile && (
              <div className="mt-2">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver Seu Perfil
                </button>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Block confirmation dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Eles não poderão ver suas publicações ou enviar mensagens para você. Se vocês forem amigos, eles serão removidos da sua lista de amigos. Você pode desbloqueá-los a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserProfileCard;
