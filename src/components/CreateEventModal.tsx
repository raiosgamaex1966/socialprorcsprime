import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Users, Flag, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import EventForm, { type EventFormValues } from "./EventForm";
import { addWeeks, addMonths } from "date-fns";

interface CreateEventModalProps {
  onClose: () => void;
}

function generateRecurringDates(startDate: Date, recurrenceType: string, endDateStr: string): Date[] {
  const dates: Date[] = [];
  const endDate = endDateStr ? new Date(endDateStr) : addMonths(startDate, 3);
  let current = new Date(startDate);
  const addFn = recurrenceType === "monthly" ? (d: Date) => addMonths(d, 1)
    : recurrenceType === "biweekly" ? (d: Date) => addWeeks(d, 2)
    : (d: Date) => addWeeks(d, 1);
  current = addFn(current);
  while (current <= endDate) {
    dates.push(new Date(current));
    current = addFn(current);
    if (dates.length >= 52) break;
  }
  return dates;
}

const CreateEventModal = ({ onClose }: CreateEventModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState<{ type: "group" | "page"; id: string; name: string } | null>(null);

  // Fetch groups where user is admin/mod
  const { data: adminGroups = [] } = useQuery({
    queryKey: ["my-admin-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .in("role", ["admin", "moderator"]);
      if (!data?.length) return [];
      const groupIds = data.map((m: any) => m.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, avatar_url")
        .in("id", groupIds);
      return (groups || []) as any[];
    },
    enabled: !!user,
  });

  // Fetch pages where user is owner/admin
  const { data: adminPages = [] } = useQuery({
    queryKey: ["my-admin-pages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: ownedPages } = await supabase
        .from("pages")
        .select("id, name, avatar_url")
        .eq("created_by", user.id);
      const { data: adminEntries } = await supabase
        .from("page_admins")
        .select("page_id")
        .eq("user_id", user.id);
      const adminPageIds = (adminEntries || []).map((a: any) => a.page_id);
      let extraPages: any[] = [];
      if (adminPageIds.length) {
        const { data } = await supabase
          .from("pages")
          .select("id, name, avatar_url")
          .in("id", adminPageIds);
        extraPages = data || [];
      }
      const all = [...(ownedPages || []), ...extraPages];
      const unique = Array.from(new Map(all.map((p: any) => [p.id, p])).values());
      return unique as any[];
    },
    enabled: !!user,
  });

  const handleCreate = async (values: EventFormValues) => {
    if (!user || !selectedSource) return;
    const dateTime = values.eventTime
      ? new Date(`${values.eventDate}T${values.eventTime}`).toISOString()
      : new Date(`${values.eventDate}T00:00:00`).toISOString();

    const recurrenceEndDate = values.recurrenceEndDate
      ? new Date(`${values.recurrenceEndDate}T23:59:59`).toISOString()
      : null;

    let cover_image_url: string | null = null;
    if (values.coverImage) {
      const ext = values.coverImage.name.split(".").pop();
      const bucket = selectedSource.type === "group" ? "group-images" : "page-images";
      const path = `events/${selectedSource.type}s/${selectedSource.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, values.coverImage);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        cover_image_url = urlData.publicUrl;
      }
    }

    const insertData: any = {
      created_by: user.id,
      title: values.title.trim(),
      description: values.description.trim() || null,
      event_date: dateTime,
      location: values.location.trim() || null,
      recurrence_type: values.recurrenceType,
      recurrence_end_date: recurrenceEndDate,
      category: values.category || "general",
      cover_image_url,
    };

    if (selectedSource.type === "group") {
      insertData.group_id = selectedSource.id;
    } else {
      insertData.page_id = selectedSource.id;
    }

    const { data: parentEvent, error } = await supabase
      .from("group_events" as any)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error(error.message || "Falha ao criar evento");
      return;
    }

    // Generate recurring instances
    if (values.recurrenceType !== "none" && parentEvent) {
      const startDate = new Date(dateTime);
      const futureDates = generateRecurringDates(startDate, values.recurrenceType, values.recurrenceEndDate);
      if (futureDates.length > 0) {
        const instances = futureDates.map((d) => ({
          ...insertData,
          event_date: d.toISOString(),
          recurrence_type: values.recurrenceType,
          parent_event_id: (parentEvent as any).id,
          cover_image_url: null,
        }));
        await supabase.from("group_events" as any).insert(instances as any);
      }
    }

    toast.success("Evento criado!");
    queryClient.invalidateQueries({ queryKey: ["all-events"] });
    if (selectedSource.type === "group") {
      queryClient.invalidateQueries({ queryKey: ["group-events", selectedSource.id] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["page-events", selectedSource.id] });
    }
    onClose();
  };

  const hasSources = adminGroups.length > 0 || adminPages.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-[500px] shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Criar Evento</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          {!hasSources ? (
            <div className="text-center py-8">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Nenhum grupo ou página disponível</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você precisa ser administrador ou moderador de um grupo, ou proprietário de uma página, para criar eventos.
              </p>
            </div>
          ) : !selectedSource ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">Escolha onde criar este evento:</p>
              <div className="space-y-1.5">
                {adminGroups.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">Grupos</p>
                    {adminGroups.map((g: any) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedSource({ type: "group", id: g.id, name: g.name })}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        {g.avatar_url ? (
                          <img src={g.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground">{g.name}</span>
                      </button>
                    ))}
                  </>
                )}
                {adminPages.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">Páginas</p>
                    {adminPages.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedSource({ type: "page", id: p.id, name: p.name })}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Flag className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedSource(null)}
                  className="text-xs text-primary hover:underline"
                >
                  ← Alterar
                </button>
                <span className="text-xs text-muted-foreground">
                  Criando em {selectedSource.type === "group" ? "👥" : "📄"} <strong className="text-foreground">{selectedSource.name}</strong>
                </span>
              </div>
              <EventForm
                onSubmit={handleCreate}
                submitLabel="Criar Evento"
                savingLabel="Criando..."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
