import { X, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import EventForm, { type EventFormValues } from "./EventForm";
import { format } from "date-fns";

interface EditEventModalProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    location: string | null;
    category: string;
    cover_image_url: string | null;
    recurrence_type: string;
    recurrence_end_date: string | null;
    group_id: string | null;
    page_id: string | null;
  };
  onClose: () => void;
}

const EditEventModal = ({ event, onClose }: EditEventModalProps) => {
  const queryClient = useQueryClient();
  const eventDate = new Date(event.event_date);

  const initialValues: Partial<EventFormValues> = {
    title: event.title,
    description: event.description || "",
    eventDate: format(eventDate, "yyyy-MM-dd"),
    eventTime: format(eventDate, "HH:mm"),
    location: event.location || "",
    category: event.category || "general",
    recurrenceType: event.recurrence_type || "none",
    recurrenceEndDate: event.recurrence_end_date
      ? format(new Date(event.recurrence_end_date), "yyyy-MM-dd")
      : "",
  };

  const handleSave = async (values: EventFormValues) => {
    const dateTime = values.eventTime
      ? new Date(`${values.eventDate}T${values.eventTime}`).toISOString()
      : new Date(`${values.eventDate}T00:00:00`).toISOString();

    const recurrenceEndDate = values.recurrenceEndDate
      ? new Date(`${values.recurrenceEndDate}T23:59:59`).toISOString()
      : null;

    let cover_image_url = event.cover_image_url;
    if (values.coverImage) {
      const ext = values.coverImage.name.split(".").pop();
      const bucket = event.group_id ? "group-images" : "page-images";
      const sourceId = event.group_id || event.page_id;
      const path = `events/${event.group_id ? "groups" : "pages"}/${sourceId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, values.coverImage);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        cover_image_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase
      .from("group_events")
      .update({
        title: values.title.trim(),
        description: values.description.trim() || null,
        event_date: dateTime,
        location: values.location.trim() || null,
        category: values.category || "general",
        cover_image_url,
        recurrence_type: values.recurrenceType,
        recurrence_end_date: recurrenceEndDate,
      })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message || "Failed to update event");
      return;
    }

    toast.success("Event updated!");
    queryClient.invalidateQueries({ queryKey: ["event-detail", event.id] });
    queryClient.invalidateQueries({ queryKey: ["all-events"] });
    if (event.group_id) {
      queryClient.invalidateQueries({ queryKey: ["group-events", event.group_id] });
    }
    if (event.page_id) {
      queryClient.invalidateQueries({ queryKey: ["page-events", event.page_id] });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-[500px] shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Edit Event</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4">
          <EventForm
            initialValues={initialValues}
            onSubmit={handleSave}
            submitLabel="Save Changes"
            savingLabel="Saving..."
            showRecurrence={false}
          />
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
