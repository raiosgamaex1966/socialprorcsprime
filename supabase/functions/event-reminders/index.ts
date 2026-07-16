import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    let totalNotifications = 0;

    // 1. Process custom per-user reminders
    const { data: dueReminders, error: remErr } = await supabase
      .from("event_reminder_preferences")
      .select("id, event_id, user_id, remind_minutes_before")
      .eq("sent", false)
      .lte("remind_at", now.toISOString());

    if (remErr) throw remErr;

    if (dueReminders && dueReminders.length > 0) {
      // Get event details for these reminders
      const eventIds = [...new Set(dueReminders.map((r: any) => r.event_id))];
      const { data: events } = await supabase
        .from("group_events")
        .select("id, title, event_date, group_id, created_by")
        .in("id", eventIds);

      const eventMap = new Map((events || []).map((e: any) => [e.id, e]));

      const notifications: any[] = [];
      const sentIds: string[] = [];

      for (const reminder of dueReminders) {
        const event = eventMap.get(reminder.event_id);
        if (!event) continue;

        const eventTime = new Date(event.event_date);
        const timeStr = eventTime.toLocaleTimeString("pt-BR", {
          hour: "numeric",
          minute: "2-digit",
        });

        const label = reminder.remind_minutes_before >= 1440
          ? `${Math.round(reminder.remind_minutes_before / 1440)} dia` + (Math.round(reminder.remind_minutes_before / 1440) !== 1 ? "s" : "")
          : reminder.remind_minutes_before >= 60
          ? `${Math.round(reminder.remind_minutes_before / 60)} hora` + (Math.round(reminder.remind_minutes_before / 60) !== 1 ? "s" : "")
          : `${reminder.remind_minutes_before} min`;

        notifications.push({
          user_id: reminder.user_id,
          actor_id: event.created_by,
          type: "event",
          message: `Lembrete (${label}): "${event.title}" às ${timeStr}`,
           reference_id: event.id,
        });
        sentIds.push(reminder.id);
      }

      if (notifications.length > 0) {
        const { error: notifErr } = await supabase
          .from("notifications")
          .insert(notifications);
        if (!notifErr) {
          totalNotifications += notifications.length;
          // Mark reminders as sent
          await supabase
            .from("event_reminder_preferences")
            .update({ sent: true })
            .in("id", sentIds);
        }
      }
    }

    // 2. Default 1-hour reminders for RSVP'd users without custom preferences
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const { data: upcomingEvents, error: eventsError } = await supabase
      .from("group_events")
      .select("id, title, event_date, group_id, created_by")
      .eq("reminder_sent", false)
      .gte("event_date", now.toISOString())
      .lte("event_date", oneHourFromNow.toISOString());

    if (eventsError) throw eventsError;

    if (upcomingEvents && upcomingEvents.length > 0) {
      for (const event of upcomingEvents) {
        const { data: rsvps } = await supabase
          .from("group_event_rsvps")
          .select("user_id")
          .eq("event_id", event.id)
          .in("status", ["going", "interested"]);

        if (rsvps && rsvps.length > 0) {
          // Exclude users who already have custom reminders for this event
          const { data: customUsers } = await supabase
            .from("event_reminder_preferences")
            .select("user_id")
            .eq("event_id", event.id);

          const customUserIds = new Set((customUsers || []).map((c: any) => c.user_id));

          const eventTime = new Date(event.event_date);
          const timeStr = eventTime.toLocaleTimeString("pt-BR", {
            hour: "numeric",
            minute: "2-digit",
          });

          const notifications = rsvps
            .filter((r: any) => !customUserIds.has(r.user_id))
            .map((r: any) => ({
              user_id: r.user_id,
              actor_id: event.created_by,
              type: "event",
              message: `Lembrete: "${event.title}" começa às ${timeStr}`,
              reference_id: event.id,
            }));

          if (notifications.length > 0) {
            const { error: notifError } = await supabase
              .from("notifications")
              .insert(notifications);
            if (!notifError) totalNotifications += notifications.length;
          }
        }

        await supabase
          .from("group_events")
          .update({ reminder_sent: true })
          .eq("id", event.id);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${totalNotifications} reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
