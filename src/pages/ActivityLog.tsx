import AppPageShell from "@/components/AppPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, Check, ChevronDown, ClipboardList, FileText, Filter, Heart, MessageSquare, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type ActivityType = "all" | "posts" | "comments" | "likes" | "events" | "marketplace" | "groups";

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: typeof FileText;
  color: string;
  meta?: string;
}

const filterOptions: { value: ActivityType; label: string; icon: typeof FileText }[] = [
  { value: "all", label: "Tudo", icon: FileText },
  { value: "posts", label: "Publicações", icon: FileText },
  { value: "comments", label: "Comentários", icon: MessageSquare },
  { value: "likes", label: "Curtidas", icon: Heart },
  { value: "events", label: "Eventos", icon: Calendar },
  { value: "marketplace", label: "Classificados", icon: ShoppingBag },
  { value: "groups", label: "Grupos", icon: Users },
];

const ActivityLog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<ActivityType>("all");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-log", user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      const results: Activity[] = [];

      // Fetch posts
      if (filter === "all" || filter === "posts") {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        posts?.forEach((p) =>
          results.push({
            id: `post-${p.id}`,
            type: "post",
            description: `Criou uma publicação: "${p.content.slice(0, 80)}${p.content.length > 80 ? "…" : ""}"`,
            timestamp: p.created_at,
            icon: FileText,
            color: "text-primary",
          })
        );
      }

      // Fetch comments
      if (filter === "all" || filter === "comments") {
        const { data: comments } = await supabase
          .from("comments")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        comments?.forEach((c) =>
          results.push({
            id: `comment-${c.id}`,
            type: "comment",
            description: `Comentou: "${c.content.slice(0, 80)}${c.content.length > 80 ? "…" : ""}"`,
            timestamp: c.created_at,
            icon: MessageSquare,
            color: "text-blue-500",
          })
        );
      }

      // Fetch post likes
      if (filter === "all" || filter === "likes") {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("id, reaction_type, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        likes?.forEach((l) =>
          results.push({
            id: `like-${l.id}`,
            type: "like",
            description: `Reagiu a uma publicação com: ${l.reaction_type === 'like' ? 'curtir' : l.reaction_type}`,
            timestamp: l.created_at,
            icon: Heart,
            color: "text-red-500",
          })
        );
      }

      // Fetch event RSVPs
      if (filter === "all" || filter === "events") {
        const { data: rsvps } = await supabase
          .from("group_event_rsvps")
          .select("id, status, created_at, event_id, group_events(title)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        rsvps?.forEach((r) => {
          const eventTitle = (r.group_events as any)?.title || "um evento";
          const rsvpStatus = r.status === "going" ? "vou" : r.status === "maybe" ? "tenho interesse" : r.status === "declined" ? "não vou" : r.status;
          results.push({
            id: `rsvp-${r.id}`,
            type: "event",
            description: `Respondeu "${rsvpStatus}" para ${eventTitle}`,
            timestamp: r.created_at,
            icon: Calendar,
            color: "text-green-500",
            meta: rsvpStatus,
          });
        });
      }

      // Fetch listings
      if (filter === "all" || filter === "marketplace") {
        const { data: listings } = await supabase
          .from("listings")
          .select("id, title, price, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        listings?.forEach((l) =>
          results.push({
            id: `listing-${l.id}`,
            type: "marketplace",
            description: `Anunciou "${l.title}" por $${l.price}`,
            timestamp: l.created_at,
            icon: ShoppingBag,
            color: "text-orange-500",
          })
        );
      }

      // Fetch group posts
      if (filter === "all" || filter === "groups") {
        const { data: groupPosts } = await supabase
          .from("group_posts")
          .select("id, content, created_at, groups(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        groupPosts?.forEach((gp) => {
          const groupName = (gp.groups as any)?.name || "um grupo";
          results.push({
            id: `gpost-${gp.id}`,
            type: "group",
            description: `Publicou em ${groupName}: "${gp.content.slice(0, 60)}${gp.content.length > 60 ? "…" : ""}"`,
            timestamp: gp.created_at,
            icon: Users,
            color: "text-violet-500",
          });
        });
      }

      // Sort all by timestamp descending
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return results;
    },
    enabled: !!user,
  });

  const groupByDate = (items: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    items.forEach((item) => {
      const dateKey = format(new Date(item.timestamp), "yyyy-MM-dd");
      const label = format(new Date(item.timestamp), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(activities);

  return (
    <AppPageShell as="div">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Registro de Atividades</h1>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-xs font-medium text-foreground hover:bg-muted transition-colors">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {filterOptions.find(o => o.value === filter)?.label || "Tudo"}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {filterOptions.map(({ value, label, icon: Icon }) => (
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

      {/* Activity feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-lg font-medium">Nenhuma atividade encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "all"
                ? "Sua atividade aparecerá aqui conforme você usa o socialpro"
                : `Nenhuma atividade de ${filterOptions.find(o => o.value === filter)?.label.toLowerCase() || filter} ainda`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-14 bg-background py-1 z-10">
                {dateLabel}
              </h3>
              <div className="space-y-1">
                {items.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 ${activity.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {activity.meta && (
                        <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                          {activity.meta}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppPageShell>
  );
};

export default ActivityLog;
