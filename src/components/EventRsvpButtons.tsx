import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X, Users, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EventRsvpButtonsProps {
  eventId: string;
  eventDate?: string;
}

type RsvpStatus = "going" | "interested" | "not_going";

const RSVP_OPTIONS: { status: RsvpStatus; label: string; icon: typeof Check; activeClass: string }[] = [
  { status: "going", label: "Confirmado", icon: Check, activeClass: "bg-green-500/20 text-green-400 border-green-500/50" },
  { status: "interested", label: "Tenho Interesse", icon: Star, activeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
  { status: "not_going", label: "Não Vou", icon: X, activeClass: "bg-red-500/20 text-red-400 border-red-500/50" },
];

const STATUS_LABELS: Record<RsvpStatus, string> = {
  going: "Confirmado",
  interested: "Interessado",
  not_going: "Não Vou",
};

const REMINDER_OPTIONS = [
  { minutes: 15, label: "15 min antes" },
  { minutes: 60, label: "1 hora antes" },
  { minutes: 180, label: "3 horas antes" },
  { minutes: 1440, label: "1 dia antes" },
];

const EventRsvpButtons = ({ eventId, eventDate }: EventRsvpButtonsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  const { data: myRsvp } = useQuery({
    queryKey: ["event-rsvp", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("group_event_rsvps" as any)
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user && !!eventId,
  });

  const { data: rsvpCounts } = useQuery({
    queryKey: ["event-rsvp-counts", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_event_rsvps" as any)
        .select("status")
        .eq("event_id", eventId);
      const counts = { going: 0, interested: 0, not_going: 0 };
      (data as any[] || []).forEach((r: any) => {
        if (r.status in counts) counts[r.status as RsvpStatus]++;
      });
      return counts;
    },
    enabled: !!eventId,
  });

  const { data: myReminders } = useQuery({
    queryKey: ["event-reminders-pref", eventId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("event_reminder_preferences" as any)
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      return (data || []) as any[];
    },
    enabled: !!user && !!eventId,
  });

  const { data: attendees } = useQuery({
    queryKey: ["event-attendees", eventId],
    queryFn: async () => {
      const { data: rsvps } = await supabase
        .from("group_event_rsvps" as any)
        .select("user_id, status")
        .eq("event_id", eventId);
      if (!rsvps || !(rsvps as any[]).length) return [];
      const userIds = [...new Set((rsvps as any[]).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (rsvps as any[]).map((r: any) => ({
        ...r,
        profile: profileMap.get(r.user_id),
      }));
    },
    enabled: showAttendees && !!eventId,
  });

  const handleRsvp = async (status: RsvpStatus) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (myRsvp?.status === status) {
        await supabase
          .from("group_event_rsvps" as any)
          .delete()
          .eq("id", myRsvp.id);
      } else if (myRsvp) {
        await supabase
          .from("group_event_rsvps" as any)
          .update({ status, updated_at: new Date().toISOString() } as any)
          .eq("id", myRsvp.id);
      } else {
        await supabase.from("group_event_rsvps" as any).insert({
          event_id: eventId,
          user_id: user.id,
          status,
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["event-rsvp", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-rsvp-counts", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
    } catch {
      toast.error("Falha ao atualizar resposta");
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (minutesBefore: number) => {
    if (!user || !eventDate || savingReminder) return;
    setSavingReminder(true);
    try {
      const existing = (myReminders || []).find((r: any) => r.remind_minutes_before === minutesBefore);
      if (existing) {
        await supabase
          .from("event_reminder_preferences" as any)
          .delete()
          .eq("id", (existing as any).id);
      } else {
        const eventDateObj = new Date(eventDate);
        const remindAt = new Date(eventDateObj.getTime() - minutesBefore * 60 * 1000);
        // Only allow setting reminders in the future
        if (remindAt <= new Date()) {
          toast.error("Este horário de lembrete já passou");
          return;
        }
        await supabase.from("event_reminder_preferences" as any).insert({
          event_id: eventId,
          user_id: user.id,
          remind_at: remindAt.toISOString(),
          remind_minutes_before: minutesBefore,
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["event-reminders-pref", eventId] });
      toast.success(existing ? "Lembrete removido" : "Lembrete definido!");
    } catch {
      toast.error("Falha ao atualizar lembrete");
    } finally {
      setSavingReminder(false);
    }
  };

  const activeReminderMinutes = new Set((myReminders || []).map((r: any) => r.remind_minutes_before));
  const hasReminders = activeReminderMinutes.size > 0;

  const totalCount = rsvpCounts
    ? rsvpCounts.going + rsvpCounts.interested + rsvpCounts.not_going
    : 0;

  const groupedAttendees = (attendees || []).reduce<Record<RsvpStatus, any[]>>(
    (acc, a: any) => {
      if (a.status in acc) acc[a.status as RsvpStatus].push(a);
      return acc;
    },
    { going: [], interested: [], not_going: [] }
  );

  const eventInFuture = eventDate ? new Date(eventDate) > new Date() : false;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {RSVP_OPTIONS.map(({ status, label, icon: Icon, activeClass }) => {
          const isActive = myRsvp?.status === status;
          const count = rsvpCounts?.[status] || 0;
          return (
            <button
              key={status}
              onClick={() => handleRsvp(status)}
              disabled={saving}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                isActive
                  ? activeClass
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
              {count > 0 && <span className="ml-0.5 opacity-75">({count})</span>}
            </button>
          );
        })}

        {eventInFuture && (
          <Popover open={showReminders} onOpenChange={setShowReminders}>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                  hasReminders
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                <BellRing className="w-3 h-3" />
                Lembrar
                {hasReminders && <span className="ml-0.5 opacity-75">({activeReminderMinutes.size})</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start">
              <p className="text-xs font-semibold text-foreground px-1 mb-2">Definir lembretes</p>
              <div className="space-y-0.5">
                {REMINDER_OPTIONS.map((opt) => {
                  const isSet = activeReminderMinutes.has(opt.minutes);
                  // Check if this reminder time is in the future
                  const remindTime = eventDate ? new Date(new Date(eventDate).getTime() - opt.minutes * 60 * 1000) : null;
                  const isPast = remindTime ? remindTime <= new Date() : true;
                  return (
                    <button
                      key={opt.minutes}
                      onClick={() => toggleReminder(opt.minutes)}
                      disabled={savingReminder || (isPast && !isSet)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                        isSet
                          ? "bg-primary/10 text-primary font-medium"
                          : isPast
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isSet ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {isSet && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {totalCount > 0 && (
          <Popover open={showAttendees} onOpenChange={setShowAttendees}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:bg-secondary transition-all">
                <Users className="w-3 h-3" />
                {totalCount} {totalCount === 1 ? "resposta" : "respostas"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-3 border-b border-border">
                <h4 className="text-sm font-semibold text-foreground">Respostas</h4>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-3">
                {(["going", "interested", "not_going"] as RsvpStatus[]).map((status) => {
                  const group = groupedAttendees[status];
                  if (!group.length) return null;
                  return (
                    <div key={status}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase px-1 mb-1">
                        {STATUS_LABELS[status]} ({group.length})
                      </p>
                      <div className="space-y-1">
                        {group.map((a: any) => (
                          <div key={a.user_id} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-secondary/50">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={a.profile?.avatar_url || ""} />
                              <AvatarFallback className="text-[10px]">
                                {(a.profile?.display_name || "?")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground truncate">
                              {a.profile?.display_name || "Desconhecido"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!attendees?.length && (
                  <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default EventRsvpButtons;
