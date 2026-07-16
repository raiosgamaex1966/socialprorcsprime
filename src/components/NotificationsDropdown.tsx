import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, ThumbsUp, MessageCircle, UserPlus, Check, CalendarDays, Clock, ChevronDown, Filter, Users, Star, TrendingDown, HandCoins, CheckCircle2, XCircle, Flag, Coins, Gift } from "lucide-react";
import { getNotificationDeepLink } from "@/lib/deepLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.jpg";
import useNotificationSound from "@/hooks/useNotificationSound";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const GROUP_NOTIFICATION_TYPES = ["group_post_like", "group_post_comment", "event", "event_digest"];
const PAGE_NOTIFICATION_TYPES = ["page_follow", "page_post_like", "page_post_comment"];

const CREDIT_NOTIFICATION_TYPES = ["credit_gift", "admin_credit_gift", "credit_spent"];

const FILTER_OPTIONS = [
  { value: "all", label: "Todas", icon: Bell },
  { value: "like", label: "Curtidas", icon: ThumbsUp },
  { value: "comment", label: "Comentários", icon: MessageCircle },
  { value: "groups", label: "Grupos", icon: Users },
  { value: "pages", label: "Páginas", icon: Flag },
  { value: "credits", label: "Créditos", icon: Coins },
  { value: "group_post_like", label: "Curtidas em Grupo", icon: ThumbsUp },
  { value: "group_post_comment", label: "Comentários em Grupo", icon: MessageCircle },
  { value: "friend_request", label: "Solicitações", icon: UserPlus },
  { value: "memory", label: "Lembranças", icon: Clock },
  { value: "event", label: "Eventos", icon: CalendarDays },
] as const;

type FilterType = typeof FILTER_OPTIONS[number]["value"];

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const { playNotification } = useNotificationSound();
  const navigate = useNavigate();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const actorIds = [...new Set((data as any[]).map((n: any) => n.actor_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", actorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((n: any) => ({ ...n, actor: profileMap.get(n.actor_id) || null }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
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

  const filteredNotifications = filter === "all"
    ? notifications
    : filter === "groups"
    ? notifications?.filter((n: any) => GROUP_NOTIFICATION_TYPES.includes(n.type))
    : filter === "pages"
    ? notifications?.filter((n: any) => PAGE_NOTIFICATION_TYPES.includes(n.type))
    : filter === "credits"
    ? notifications?.filter((n: any) => CREDIT_NOTIFICATION_TYPES.includes(n.type))
    : notifications?.filter((n: any) => n.type === filter);

  const unreadCount = notifications?.filter((n: any) => !n.read).length ?? 0;

  const markAllRead = async () => {
    if (!user || !notifications?.length) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
    const path = getNotificationDeepLink(n);
    navigate(path);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <ThumbsUp className="w-4 h-4 text-primary" />;
      case "comment": return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "friend_request": return <UserPlus className="w-4 h-4 text-primary" />;
      case "event": return <CalendarDays className="w-4 h-4 text-accent-foreground" />;
      case "review": return <Star className="w-4 h-4 text-amber-400" />;
      case "price_drop": return <TrendingDown className="w-4 h-4 text-green-500" />;
      case "offer": return <HandCoins className="w-4 h-4 text-primary" />;
      case "offer_accepted": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "offer_rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      case "credit_gift": return <Gift className="w-4 h-4 text-amber-500" />;
      case "admin_credit_gift": return <Gift className="w-4 h-4 text-primary" />;
      case "credit_spent": return <Coins className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors relative"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-[360px] bg-card rounded-lg shadow-xl border border-border z-50 max-h-[480px] flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-border flex-shrink-0">
              <h3 className="text-xl font-bold text-foreground">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-primary text-sm hover:underline flex items-center gap-1">
                    <Check className="w-4 h-4" /> Marcar todas como lidas
                  </button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-xs font-medium text-foreground hover:bg-muted transition-colors">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      {FILTER_OPTIONS.find(o => o.value === filter)?.label || "Todas"}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 z-[60]">
                    {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`flex items-center gap-2 cursor-pointer ${filter === value ? "bg-primary/10 text-primary font-semibold" : ""}`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                        {filter === value && <Check className="w-3.5 h-3.5 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {filteredNotifications?.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-3 hover:bg-secondary transition-colors cursor-pointer ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={n.actor?.avatar_url || defaultAvatar}
                      alt={n.actor?.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card flex items-center justify-center border border-border">
                      {getIcon(n.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground">
                      <span className="font-semibold">{n.actor?.display_name || "Alguém"}</span>{" "}
                      {n.message}
                    </p>
                    <p className="text-[12px] text-primary mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0 mt-2" />}
                </div>
              ))}
              {(!filteredNotifications || filteredNotifications.length === 0) && (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  {filter === "all" ? "Nenhuma notificação ainda" : `Nenhuma notificação de ${FILTER_OPTIONS.find(o => o.value === filter)?.label.toLowerCase()}`}
                </p>
              )}
            </div>
            <div className="p-2 border-t border-border flex-shrink-0">
              <button
                onClick={() => { setOpen(false); navigate("/notifications"); }}
                className="w-full text-center text-sm font-medium text-primary hover:bg-secondary rounded-md py-2 transition-colors"
              >
                Ver todas as notificações
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsDropdown;
