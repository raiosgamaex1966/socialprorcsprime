import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, X, List, LayoutGrid } from "lucide-react";
import EventCalendarView from "./EventCalendarView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import EventForm, { type EventFormValues } from "./EventForm";
import EventCard from "./EventCard";
import { addWeeks, addMonths } from "date-fns";

interface GroupEventsProps {
  groupId: string;
  isAdminOrMod: boolean;
}

function generateRecurringDates(startDate: Date, recurrenceType: string, endDateStr: string): Date[] {
  const dates: Date[] = [];
  const endDate = endDateStr ? new Date(endDateStr) : addMonths(startDate, 3); // default 3 months
  let current = new Date(startDate);

  const addFn = recurrenceType === "monthly" ? (d: Date) => addMonths(d, 1)
    : recurrenceType === "biweekly" ? (d: Date) => addWeeks(d, 2)
    : (d: Date) => addWeeks(d, 1);

  // Skip the first date (that's the parent event)
  current = addFn(current);
  while (current <= endDate) {
    dates.push(new Date(current));
    current = addFn(current);
    if (dates.length >= 52) break; // safety cap
  }
  return dates;
}

const GroupEvents = ({ groupId, isAdminOrMod }: GroupEventsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const { data: events } = useQuery({
    queryKey: ["group-events", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_events" as any)
        .select("*")
        .eq("group_id", groupId)
        .order("event_date", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data as any[]).map((e: any) => e.created_by))];
      if (!userIds.length) return data as any[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((e: any) => ({ ...e, profile: profileMap.get(e.created_by) }));
    },
    enabled: !!groupId,
  });

  const handleCreate = async (values: EventFormValues) => {
    if (!user) return;
    const dateTime = values.eventTime
      ? new Date(`${values.eventDate}T${values.eventTime}`).toISOString()
      : new Date(`${values.eventDate}T00:00:00`).toISOString();

    const recurrenceEndDate = values.recurrenceEndDate
      ? new Date(`${values.recurrenceEndDate}T23:59:59`).toISOString()
      : null;

    // Upload cover image if provided
    let cover_image_url: string | null = null;
    if (values.coverImage) {
      const ext = values.coverImage.name.split(".").pop();
      const path = `events/${groupId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("group-images").upload(path, values.coverImage);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("group-images").getPublicUrl(path);
        cover_image_url = urlData.publicUrl;
      }
    }

    // Create parent event
    const { data: parentEvent, error } = await supabase.from("group_events" as any).insert({
      group_id: groupId,
      created_by: user.id,
      title: values.title.trim(),
      description: values.description.trim() || null,
      event_date: dateTime,
      location: values.location.trim() || null,
      recurrence_type: values.recurrenceType,
      recurrence_end_date: recurrenceEndDate,
      category: values.category || "general",
      cover_image_url,
    } as any).select().single();
    if (error) throw error;

    // Generate recurring instances
    if (values.recurrenceType !== "none" && parentEvent) {
      const startDate = new Date(dateTime);
      const futureDates = generateRecurringDates(startDate, values.recurrenceType, values.recurrenceEndDate);

      if (futureDates.length > 0) {
        const instances = futureDates.map((d) => ({
          group_id: groupId,
          created_by: user.id,
          title: values.title.trim(),
          description: values.description.trim() || null,
          event_date: d.toISOString(),
          location: values.location.trim() || null,
          recurrence_type: values.recurrenceType,
          parent_event_id: (parentEvent as any).id,
        }));
        await supabase.from("group_events" as any).insert(instances as any);
      }
    }

    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["group-events", groupId] });

    // Notify group members
    try {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("status", "approved");

      if (members && members.length > 0) {
        const recLabel = values.recurrenceType !== "none" ? ` (${values.recurrenceType})` : "";
        const notifications = members
          .filter((m) => m.user_id !== user.id)
          .map((m) => ({
            user_id: m.user_id,
            actor_id: user.id,
            type: "event",
            message: `New event: "${values.title.trim()}"${recLabel} — ${values.eventDate}`,
            reference_id: (parentEvent as any).id,
          }));
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    } catch {
      // Non-critical
    }

    toast.success("Event created!");
  };

  const handleEdit = async (eventId: string, values: EventFormValues) => {
    const dateTime = values.eventTime
      ? new Date(`${values.eventDate}T${values.eventTime}`).toISOString()
      : new Date(`${values.eventDate}T00:00:00`).toISOString();

    const updateData: any = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      event_date: dateTime,
      location: values.location.trim() || null,
      category: values.category || "general",
    };

    // Only update recurrence on parent events
    if (values.recurrenceType !== undefined) {
      updateData.recurrence_type = values.recurrenceType;
      updateData.recurrence_end_date = values.recurrenceEndDate
        ? new Date(`${values.recurrenceEndDate}T23:59:59`).toISOString()
        : null;
    }

    const { error } = await supabase
      .from("group_events" as any)
      .update(updateData as any)
      .eq("id", eventId);
    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ["group-events", groupId] });
    toast.success("Event updated!");
  };

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("group_events" as any)
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["group-events", groupId] });
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handleDeleteSeries = async (parentEventId: string) => {
    try {
      // Delete all children first, then the parent
      await supabase
        .from("group_events" as any)
        .delete()
        .eq("parent_event_id", parentEventId);
      const { error } = await supabase
        .from("group_events" as any)
        .delete()
        .eq("id", parentEventId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["group-events", groupId] });
      toast.success("All occurrences deleted");
    } catch {
      toast.error("Failed to delete event series");
    }
  };

  const upcomingEvents = (events || []).filter(
    (e: any) => new Date(e.event_date) >= new Date()
  );
  const pastEvents = (events || []).filter(
    (e: any) => new Date(e.event_date) < new Date()
  );

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Eventos
        </h2>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Visualização em lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              title="Visualização em calendário"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <EventCalendarView events={events || []} />
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Próximos</p>
              {upcomingEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isAdminOrMod={false}
                  onDelete={handleDelete}
                  onDeleteSeries={handleDeleteSeries}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Anteriores</p>
              {pastEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isAdminOrMod={false}
                  isPast
                  onDelete={handleDelete}
                  onDeleteSeries={handleDeleteSeries}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {!events?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum evento ainda.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default GroupEvents;
