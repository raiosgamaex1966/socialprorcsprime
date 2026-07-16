import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { isToday, isTomorrow, format, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import SidebarTabSection from "@/components/SidebarTabSection";
import EventListItem from "@/components/EventListItem";

const ThisWeekEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["this-week-rsvp-events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: rsvps } = await supabase
        .from("group_event_rsvps" as any)
        .select("event_id, status")
        .eq("user_id", user.id)
        .in("status", ["going", "interested"]);

      if (!rsvps?.length) return [];

      const eventIds = (rsvps as any[]).map((r) => r.event_id);
      const rsvpMap = new Map((rsvps as any[]).map((r) => [r.event_id, r.status]));

      const now = startOfDay(new Date());
      const weekEnd = addDays(now, 7);

      const { data: events } = await supabase
        .from("group_events" as any)
        .select("id, title, event_date, location, category, group_id, page_id")
        .in("id", eventIds)
        .gte("event_date", now.toISOString())
        .lte("event_date", weekEnd.toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      if (!events?.length) return [];

      const groupIds = [...new Set((events as any[]).filter((e: any) => e.group_id).map((e: any) => e.group_id))];
      const pageIds = [...new Set((events as any[]).filter((e: any) => e.page_id).map((e: any) => e.page_id))];

      const [groupsRes, pagesRes] = await Promise.all([
        groupIds.length > 0 ? supabase.from("groups").select("id, name").in("id", groupIds) : { data: [] },
        pageIds.length > 0 ? supabase.from("pages").select("id, name, slug").in("id", pageIds) : { data: [] },
      ]);

      const groupMap = new Map((groupsRes.data || []).map((g: any) => [g.id, g]));
      const pageMap = new Map((pagesRes.data || []).map((p: any) => [p.id, p]));

      return (events as any[]).map((e: any) => ({
        ...e,
        rsvp_status: rsvpMap.get(e.id),
        source: e.group_id
          ? { type: "group", name: groupMap.get(e.group_id)?.name }
          : { type: "page", name: pageMap.get(e.page_id)?.name },
      }));
    },
    enabled: !!user,
  });

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    const label = format(d, "EEEE", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  if (isLoading) return null;

  return (
    <SidebarTabSection
      icon={CalendarDays}
      title="Esta Semana"
      actionLabel="Todos os Eventos"
      onAction={() => navigate("/events")}
      isEmpty={events.length === 0}
      emptyMessage="Nenhum evento agendado para esta semana"
    >
      {events.map((event: any) => (
        <EventListItem
          key={event.id}
          id={event.id}
          title={event.title}
          eventDate={event.event_date}
          location={event.location}
          category={event.category}
          subtitle={
            <p className="text-[10px] text-muted-foreground">
              {event.source?.type === "group" ? "👥" : "📄"} {event.source?.name}
              {" · "}
              <span className={event.rsvp_status === "going" ? "text-green-500 font-medium" : "text-yellow-500 font-medium"}>
                {event.rsvp_status === "going" ? "Confirmado" : "Interessado"}
              </span>
            </p>
          }
        />
      ))}
    </SidebarTabSection>
  );
};

export default ThisWeekEvents;
