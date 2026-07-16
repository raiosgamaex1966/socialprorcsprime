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
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all RSVPs for events happening in the next 7 days
    const { data: upcomingEvents, error: eventsErr } = await supabase
      .from("group_events")
      .select("id, title, event_date, location, group_id, page_id, created_by")
      .gte("event_date", now.toISOString())
      .lte("event_date", weekEnd.toISOString())
      .order("event_date", { ascending: true });

    if (eventsErr) throw eventsErr;
    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming events this week" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventIds = upcomingEvents.map((e: any) => e.id);

    // Get all RSVPs (going or interested) for these events
    const { data: rsvps, error: rsvpErr } = await supabase
      .from("group_event_rsvps")
      .select("user_id, event_id, status")
      .in("event_id", eventIds)
      .in("status", ["going", "interested"]);

    if (rsvpErr) throw rsvpErr;
    if (!rsvps || rsvps.length === 0) {
      return new Response(
        JSON.stringify({ message: "No RSVPs for upcoming events" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group events by user
    const userEvents = new Map<string, any[]>();
    const eventMap = new Map(upcomingEvents.map((e: any) => [e.id, e]));

    for (const rsvp of rsvps) {
      const event = eventMap.get(rsvp.event_id);
      if (!event) continue;

      if (!userEvents.has(rsvp.user_id)) {
        userEvents.set(rsvp.user_id, []);
      }
      userEvents.get(rsvp.user_id)!.push({
        ...event,
        rsvp_status: rsvp.status,
      });
    }

    // Check which users have opted out of the digest
    const userIds = Array.from(userEvents.keys());
    const { data: optOuts } = await supabase
      .from("user_notification_settings")
      .select("user_id")
      .in("user_id", userIds)
      .eq("weekly_event_digest", false);

    const optedOutUsers = new Set((optOuts || []).map((r: any) => r.user_id));

    // Create one digest notification per user (skip opted-out users)
    const notifications: any[] = [];

    for (const [userId, events] of userEvents) {
      if (optedOutUsers.has(userId)) continue;
      // Sort events by date
      events.sort(
        (a: any, b: any) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      const eventCount = events.length;
      const goingCount = events.filter((e: any) => e.rsvp_status === "going").length;
      const interestedCount = eventCount - goingCount;

      // Build a summary message
      const eventTitles = events
        .slice(0, 3)
        .map((e: any) => {
          const day = new Date(e.event_date).toLocaleDateString("pt-BR", {
            weekday: "short",
          });
          return `${day}: ${e.title}`;
        })
        .join(", ");

      const extra = eventCount > 3 ? ` e mais ${eventCount - 3}` : "";
      const statusParts: string[] = [];
      if (goingCount > 0) statusParts.push(`${goingCount} confirmado` + (goingCount !== 1 ? "s" : ""));
      if (interestedCount > 0) statusParts.push(`${interestedCount} interessado` + (interestedCount !== 1 ? "s" : ""));

      const message = `📅 Sua semana à frente: ${eventCount} evento${eventCount !== 1 ? "s" : ""} (${statusParts.join(", ")}). ${eventTitles}${extra}`;

      // Use the first event's creator as actor_id (required field)
      const actorId = events[0].created_by;

      notifications.push({
        user_id: userId,
        actor_id: actorId,
        type: "event_digest",
        message,
        reference_id: null,
      });
    }

    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({
        message: `Sent weekly digest to ${notifications.length} user(s)`,
        users: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
