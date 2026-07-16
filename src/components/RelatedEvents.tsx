import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";
import EventListItem from "./EventListItem";

interface RelatedEventsProps {
  currentEventId: string;
  groupId: string | null;
  pageId: string | null;
  sourceName: string | null;
}

const RelatedEvents = ({ currentEventId, groupId, pageId, sourceName }: RelatedEventsProps) => {
  const sourceId = groupId || pageId;

  const { data: events } = useQuery({
    queryKey: ["related-events", sourceId, currentEventId],
    queryFn: async () => {
      let query = supabase
        .from("group_events")
        .select("id, title, event_date, location, category")
        .neq("id", currentEventId)
        .order("event_date", { ascending: true })
        .limit(4);

      if (groupId) query = query.eq("group_id", groupId);
      else if (pageId) query = query.eq("page_id", pageId);
      else return [];

      const { data } = await query;
      return data || [];
    },
    enabled: !!sourceId,
  });

  if (!events || events.length === 0) return null;

  return (
    <div className="rounded-lg bg-card shadow-sm p-5 sm:p-6 mt-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        More events from {sourceName || "this source"}
      </h2>
      <div className="space-y-1">
        {events.map((ev) => (
          <EventListItem
            key={ev.id}
            id={ev.id}
            title={ev.title}
            eventDate={ev.event_date}
            location={ev.location}
            category={ev.category}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedEvents;
