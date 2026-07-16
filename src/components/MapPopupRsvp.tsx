import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RsvpStatus = "going" | "interested" | "not_going";

const options: { status: RsvpStatus; label: string; icon: typeof Check; active: string }[] = [
  { status: "going", label: "Going", icon: Check, active: "bg-green-500/20 text-green-400 border-green-500/50" },
  { status: "interested", label: "Interested", icon: Star, active: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
  { status: "not_going", label: "Can't Go", icon: X, active: "bg-red-500/20 text-red-400 border-red-500/50" },
];

const MapPopupRsvp = ({ eventId }: { eventId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

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

  const handleRsvp = async (status: RsvpStatus) => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (myRsvp?.status === status) {
        await supabase.from("group_event_rsvps" as any).delete().eq("id", myRsvp.id);
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
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex gap-1 mt-2">
      {options.map(({ status, label, icon: Icon, active }) => {
        const isActive = myRsvp?.status === status;
        return (
          <button
            key={status}
            onClick={() => handleRsvp(status)}
            disabled={saving}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
              isActive ? active : "border-border text-muted-foreground hover:bg-secondary"
            } ${saving ? "opacity-50" : ""}`}
          >
            <Icon className="w-2.5 h-2.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default MapPopupRsvp;
