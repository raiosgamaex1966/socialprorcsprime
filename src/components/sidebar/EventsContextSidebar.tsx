import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, Users } from "lucide-react";
import SidebarSection from "./SidebarSection";
import EventListItem from "../EventListItem";

const EventsContextSidebar = () => {
  const { user } = useAuth();

  const { data: myRsvps = [] } = useQuery({
    queryKey: ["sidebar-my-rsvps", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: rsvps } = await supabase
        .from("group_event_rsvps")
        .select("event_id, status")
        .eq("user_id", user.id)
        .in("status", ["going", "interested"]);
      if (!rsvps?.length) return [];
      const eventIds = rsvps.map((r) => r.event_id);
      const { data: events } = await supabase
        .from("group_events")
        .select("id, title, event_date, location, category")
        .in("id", eventIds)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);
      return (events || []).map((e) => ({
        ...e,
        rsvpStatus: rsvps.find((r) => r.event_id === e.id)?.status,
      }));
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: popularEvents = [] } = useQuery({
    queryKey: ["sidebar-popular-events"],
    queryFn: async () => {
      const { data: rsvpCounts } = await supabase
        .from("group_event_rsvps")
        .select("event_id");
      const counts: Record<string, number> = {};
      rsvpCounts?.forEach((r) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);
      if (!topIds.length) return [];
      const { data: events } = await supabase
        .from("group_events")
        .select("id, title, event_date, location, category")
        .in("id", topIds)
        .gte("event_date", new Date().toISOString());
      return (events || []).map((e) => ({ ...e, rsvpCount: counts[e.id] || 0 }));
    },
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      {myRsvps.length > 0 && (
        <SidebarSection title="Seus Próximos Eventos" icon={CalendarDays}>
          <div className="space-y-0.5">
            {myRsvps.map((event: any) => (
              <EventListItem
                key={event.id}
                id={event.id}
                title={event.title}
                eventDate={event.event_date}
                location={event.location}
                category={event.category}
                subtitle={
                  <span className={`text-[10px] font-medium ${event.rsvpStatus === "going" ? "text-green-500" : "text-yellow-500"}`}>
                    {event.rsvpStatus === "going" ? "✓ Confirmado" : "★ Interessado"}
                  </span>
                }
              />
            ))}
          </div>
        </SidebarSection>
      )}

      {popularEvents.length > 0 && (
        <SidebarSection title="Eventos Populares" icon={Users}>
          <div className="space-y-0.5">
            {popularEvents.map((event: any) => (
              <EventListItem
                key={event.id}
                id={event.id}
                title={event.title}
                eventDate={event.event_date}
                location={event.location}
                category={event.category}
                trailing={
                  <span className="text-[10px] text-primary font-semibold whitespace-nowrap">
                    {event.rsvpCount} {event.rsvpCount === 1 ? "confirmado" : "confirmados"}
                  </span>
                }
              />
            ))}
          </div>
        </SidebarSection>
      )}
    </div>
  );
};

export default EventsContextSidebar;
