import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell, ThumbsUp, MessageCircle, UserPlus, Check, Loader2, ArrowUp, Undo2,
  Clock, CalendarDays, ChevronDown, ChevronRight, Filter, Trash2, Users, Flag,
  Star, TrendingDown, HandCoins, CheckCircle2, XCircle, BellOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useNotificationSound from "@/hooks/useNotificationSound";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.jpg";
import SwipeableNotificationItem from "@/components/SwipeableNotificationItem";
import GroupHoverCard from "@/components/GroupHoverCard";
import AppPageShell from "@/components/AppPageShell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 15;

const FILTER_OPTIONS = [
  { value: "all", label: "Todas", icon: Bell },
  { value: "like", label: "Curtidas", icon: ThumbsUp },
  { value: "comment", label: "Comentários", icon: MessageCircle },
  { value: "groups", label: "Grupos", icon: Users },
  { value: "pages", label: "Páginas", icon: Flag },
  { value: "friend_request", label: "Solicitações", icon: UserPlus },
  { value: "memory", label: "Lembranças", icon: Clock },
  { value: "event", label: "Eventos", icon: CalendarDays },
] as const;

const GROUP_NOTIFICATION_TYPES = ["group_post_like", "group_post_comment", "event", "event_digest"];
const PAGE_NOTIFICATION_TYPES = ["page_follow", "page_post_like", "page_post_comment"];

type FilterType = typeof FILTER_OPTIONS[number]["value"];

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playNotification } = useNotificationSound();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", filter],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filter === "groups") {
        query = query.in("type", GROUP_NOTIFICATION_TYPES);
      } else if (filter === "pages") {
        query = query.in("type", PAGE_NOTIFICATION_TYPES);
      } else if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      const actorIds = [...new Set((rows as any[]).map((n: any) => n.actor_id))];
      const { data: profiles } = actorIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", actorIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const groupNotifTypes = ["group_post_like", "group_post_comment"];
      const groupPostRefIds = (rows as any[])
        .filter((n: any) => groupNotifTypes.includes(n.type) && n.reference_id)
        .map((n: any) => n.reference_id);
      const eventRefIds = (rows as any[])
        .filter((n: any) => n.type === "event" && n.reference_id)
        .map((n: any) => n.reference_id);

      let groupPostGroupMap = new Map<string, any>();
      if (groupPostRefIds.length > 0) {
        const { data: gPosts } = await supabase
          .from("group_posts")
          .select("id, group_id")
          .in("id", groupPostRefIds);
        const groupIds = [...new Set((gPosts || []).map((p: any) => p.group_id))];
        if (groupIds.length > 0) {
          const { data: groups } = await supabase
            .from("groups")
            .select("id, name, avatar_url")
            .in("id", groupIds);
          const gMap = new Map((groups || []).map((g: any) => [g.id, g]));
          (gPosts || []).forEach((p: any) => {
            groupPostGroupMap.set(p.id, gMap.get(p.group_id) || null);
          });
        }
      }

      let eventGroupMap = new Map<string, any>();
      if (eventRefIds.length > 0) {
        const { data: events } = await supabase
          .from("group_events")
          .select("id, group_id")
          .in("id", eventRefIds);
        const eventGroupIds = [...new Set((events || []).filter((e: any) => e.group_id).map((e: any) => e.group_id))];
        if (eventGroupIds.length > 0) {
          const { data: groups } = await supabase
            .from("groups")
            .select("id, name, avatar_url")
            .in("id", eventGroupIds);
          const gMap = new Map((groups || []).map((g: any) => [g.id, g]));
          (events || []).forEach((e: any) => {
            if (e.group_id) eventGroupMap.set(e.id, gMap.get(e.group_id) || null);
          });
        }
      }

      return (rows as any[]).map((n: any) => {
        let group = null;
        if (groupNotifTypes.includes(n.type) && n.reference_id) {
          group = groupPostGroupMap.get(n.reference_id) || null;
        } else if (n.type === "event" && n.reference_id) {
          group = eventGroupMap.get(n.reference_id) || null;
        }
        return { ...n, actor: profileMap.get(n.actor_id) || null, group };
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
    enabled: !!user,
  });

  const notifications = data?.pages.flat() ?? [];

  const { data: unreadGroupCount = 0 } = useQuery({
    queryKey: ["unread-group-notif-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false)
        .in("type", GROUP_NOTIFICATION_TYPES);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-page-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          playNotification("notification");
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const markAllRead = async () => {
    if (!user || !notifications.length) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    const previousData = queryClient.getQueryData(["notifications", filter]);
    queryClient.setQueryData(["notifications", filter], (old: any) => {
      if (!old?.pages) return old;
      return { ...old, pages: [[]] };
    });
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) {
      queryClient.setQueryData(["notifications", filter], previousData);
      toast({ description: "Falha ao limpar notificações", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
      toast({ description: "Todas as notificações foram limpas" });
    }
    setShowClearConfirm(false);
  };

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const dismissNotification = async (id: string) => {
    const previousData = queryClient.getQueryData(["notifications", filter]);
    queryClient.setQueryData(["notifications", filter], (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any[]) => page.filter((n: any) => n.id !== id)),
      };
    });

    let undone = false;
    const timeoutId = setTimeout(async () => {
      if (undone) return;
      await supabase.from("notifications").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
    }, 5000);

    toast({
      description: "Notificação descartada",
      action: (
        <button
          onClick={() => {
            undone = true;
            clearTimeout(timeoutId);
            queryClient.setQueryData(["notifications", filter], previousData);
          }}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Undo2 className="w-3 h-3" /> Desfazer
        </button>
      ),
    });
  };

  const handleNotificationClick = (n: any) => {
    if (!n.read) markOneRead(n.id);
    switch (n.type) {
      case "like":
      case "comment":
        if (n.reference_id) navigate(`/?post=${n.reference_id}`);
        break;
      case "friend_request":
        navigate("/friends");
        break;
      case "memory":
        navigate("/memories");
        break;
      case "event":
        if (n.reference_id) navigate(`/groups/${n.reference_id}?tab=events`);
        break;
      case "page_follow":
        if (n.reference_id) {
          supabase.from("pages").select("slug").eq("id", n.reference_id).single().then(({ data }) => {
            if (data?.slug) navigate(`/pages/${data.slug}`);
            else navigate("/pages");
          });
        } else navigate("/pages");
        return;
      case "page_post_like":
      case "page_post_comment":
        if (n.reference_id) {
          supabase.from("page_posts").select("page_id").eq("id", n.reference_id).single().then(({ data: postData }) => {
            if (postData?.page_id) {
              supabase.from("pages").select("slug").eq("id", postData.page_id).single().then(({ data: pageData }) => {
                if (pageData?.slug) navigate(`/pages/${pageData.slug}`);
                else navigate("/pages");
              });
            } else navigate("/pages");
          });
        } else navigate("/pages");
        return;
      default:
        if (n.actor_id) navigate(`/profile/${n.actor_id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <ThumbsUp className="w-3 h-3 text-primary" />;
      case "comment": return <MessageCircle className="w-3 h-3 text-emerald-500" />;
      case "friend_request": return <UserPlus className="w-3 h-3 text-primary" />;
      case "memory": return <Clock className="w-3 h-3 text-amber-500" />;
      case "page_follow": return <Flag className="w-3 h-3 text-primary" />;
      case "page_post_like": return <ThumbsUp className="w-3 h-3 text-primary" />;
      case "page_post_comment": return <MessageCircle className="w-3 h-3 text-emerald-500" />;
      case "group_post_like": return <ThumbsUp className="w-3 h-3 text-primary" />;
      case "group_post_comment": return <MessageCircle className="w-3 h-3 text-emerald-500" />;
      case "event": return <CalendarDays className="w-3 h-3 text-primary" />;
      case "review": return <Star className="w-3 h-3 text-amber-400" />;
      case "price_drop": return <TrendingDown className="w-3 h-3 text-emerald-500" />;
      case "offer": return <HandCoins className="w-3 h-3 text-primary" />;
      case "offer_accepted": return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case "offer_rejected": return <XCircle className="w-3 h-3 text-destructive" />;
      default: return <Bell className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "like": return "Curtida";
      case "comment": return "Comentário";
      case "group_post_like": return "Curtida em Grupo";
      case "group_post_comment": return "Comentário em Grupo";
      case "friend_request": return "Solicitação de Amizade";
      case "memory": return "Lembrança";
      case "event": return "Evento";
      case "page_follow": return "Seguida na Página";
      case "page_post_like": return "Reação na Página";
      case "page_post_comment": return "Comentário na Página";
      case "review": return "Avaliação";
      case "price_drop": return "Redução de Preço";
      case "offer": return "Oferta";
      case "offer_accepted": return "Aceita";
      case "offer_rejected": return "Rejeitada";
      default: return "Notificação";
    }
  };

  const getIconBg = () => {
    return "bg-muted text-muted-foreground";
  };

  // Group notifications by time sections
  const groupByTime = (items: any[]) => {
    const now = new Date();
    const today: any[] = [];
    const thisWeek: any[] = [];
    const earlier: any[] = [];

    items.forEach((n: any) => {
      const created = new Date(n.created_at);
      const diffMs = now.getTime() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 1) today.push(n);
      else if (diffDays < 7) thisWeek.push(n);
      else earlier.push(n);
    });

    return { today, thisWeek, earlier };
  };

  const renderNotificationItem = (n: any, idx: number) => (
    <SwipeableNotificationItem key={n.id} onDismiss={() => dismissNotification(n.id)}>
      <button
        ref={idx === notifications.length - 1 ? lastElementRef : undefined}
        onClick={() => handleNotificationClick(n)}
        className={`flex items-start gap-3.5 px-4 py-3.5 w-full text-left transition-all duration-200 hover:bg-[#E9ECEC] dark:hover:bg-muted/60 ${
          !n.read
            ? "bg-primary/[0.06] dark:bg-primary/[0.08]"
            : "bg-card"
        }`}
      >
        <div className="relative flex-shrink-0">
          <img
            src={n.actor?.avatar_url || defaultAvatar}
            alt={n.actor?.display_name || "User"}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-background shadow-sm"
          />
          <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${getIconBg()} flex items-center justify-center border-[1.5px] border-card shadow-sm`}>
            {getIcon(n.type)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          {n.group && (
            <div className="mb-1" onClick={(e) => e.stopPropagation()}>
              <GroupHoverCard groupId={n.group.id} groupName={n.group.name} groupAvatarUrl={n.group.avatar_url}>
                <span className="inline-flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-primary hover:underline">
                  <Users className="w-3 h-3" />
                  {n.group.name}
                </span>
              </GroupHoverCard>
            </div>
          )}
          <p className="text-[13px] text-foreground leading-relaxed">
            <span className="font-semibold">{n.actor?.display_name || "Alguém"}</span>{" "}
            {n.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs ${!n.read ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {getTypeLabel(n.type)}
            </span>
          </div>
        </div>
        {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-4 ring-2 ring-primary/20 animate-pulse" />}
      </button>
    </SwipeableNotificationItem>
  );

  const renderTimeSections = (items: any[]) => {
    const { today, thisWeek, earlier } = groupByTime(items);
    let globalIdx = 0;
    return (
      <>
        {today.length > 0 && (
          <div>
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Hoje</span>
            </div>
            {today.map((n: any) => renderNotificationItem(n, globalIdx++))}
          </div>
        )}
        {thisWeek.length > 0 && (
          <div>
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Esta semana</span>
            </div>
            {thisWeek.map((n: any) => renderNotificationItem(n, globalIdx++))}
          </div>
        )}
        {earlier.length > 0 && (
          <div>
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Anteriores</span>
            </div>
            {earlier.map((n: any) => renderNotificationItem(n, globalIdx++))}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <AppPageShell>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Notificações</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-primary font-medium">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:bg-primary/10 gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Marcar todas como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  {FILTER_OPTIONS.find(o => o.value === filter)?.label || "Todas"}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`flex items-center gap-2 cursor-pointer ${filter === value ? "bg-primary/10 text-primary font-semibold" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {value === "groups" && unreadGroupCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground ml-auto">
                        {unreadGroupCount}
                      </span>
                    )}
                    {filter === value && <Check className="w-3.5 h-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-between animate-fade-in">
            <p className="text-sm text-foreground font-medium">Excluir todas as notificações? Isso não pode ser desfeito.</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowClearConfirm(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={clearAllNotifications}>Excluir todas</Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando notificações…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notifications.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <BellOff className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {filter === "all" ? "Nenhuma notificação ainda" : `Sem notificações de ${FILTER_OPTIONS.find(o => o.value === filter)?.label.toLowerCase()}`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {filter === "all"
                ? "Quando alguém interagir com suas publicações ou enviar uma solicitação de amizade, você verá aqui."
                : "Tente selecionar um filtro diferente para ver mais notificações."}
            </p>
            {filter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter("all")}
                className="mt-5 text-primary"
              >
                Ver todas as notificações
              </Button>
            )}
          </div>
        )}

        {/* Notification list */}
        {!isLoading && notifications.length > 0 && (
          <div className="bg-card rounded-2xl border-0 overflow-hidden shadow-sm">
            {filter !== "groups"
              ? renderTimeSections(notifications)
              : (() => {
                  const grouped: Record<string, any[]> = {};
                  const sectionOrder = ["group_post_like", "group_post_comment", "event", "event_digest"];
                  const sectionLabels: Record<string, string> = {
                    group_post_like: "Curtidas em Grupo",
                    group_post_comment: "Comentários em Grupo",
                    event: "Eventos",
                    event_digest: "Resumo Semanal",
                  };
                  const sectionIcons: Record<string, React.ReactNode> = {
                    group_post_like: <ThumbsUp className="w-3.5 h-3.5 text-primary" />,
                    group_post_comment: <MessageCircle className="w-3.5 h-3.5 text-primary" />,
                    event: <CalendarDays className="w-3.5 h-3.5 text-primary" />,
                    event_digest: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
                  };

                  notifications.forEach((n: any) => {
                    const key = n.type || "other";
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(n);
                  });

                  let globalIdx = 0;
                  return sectionOrder.map((type) => {
                    const items = grouped[type];
                    if (!items || items.length === 0) return null;
                    const sectionUnread = items.filter((n: any) => !n.read).length;
                    return (
                      <div key={type}>
                        <button
                          onClick={() => setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }))}
                          className="flex items-center gap-2 px-4 py-3 bg-muted/40 w-full text-left hover:bg-muted/60 transition-colors border-b border-border"
                        >
                          {collapsedSections[type]
                            ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                          {sectionIcons[type]}
                          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            {sectionLabels[type]} ({items.length})
                          </span>
                          {sectionUnread > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              {sectionUnread}
                            </span>
                          )}
                        </button>
                        {!collapsedSections[type] && items.map((n: any) => {
                          const currentIdx = globalIdx++;
                          return renderNotificationItem(n, currentIdx);
                        })}
                      </div>
                    );
                  });
                })()
            }
          </div>
        )}

        {/* Infinite scroll loader */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </AppPageShell>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-40 w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </>
  );
};

export default Notifications;
