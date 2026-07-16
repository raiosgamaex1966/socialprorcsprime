import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Find all users who have posts from this day in previous years
    const { data: memoryCandidates, error: queryError } = await supabase
      .from("posts")
      .select("user_id, created_at")
      .filter("created_at", "lt", `${today.getFullYear()}-01-01T00:00:00Z`);

    if (queryError) throw queryError;

    // Filter to posts matching today's month/day
    const usersWithMemories = new Set<string>();
    for (const post of memoryCandidates || []) {
      const postDate = new Date(post.created_at);
      if (postDate.getMonth() + 1 === month && postDate.getDate() === day) {
        usersWithMemories.add(post.user_id);
      }
    }

    if (usersWithMemories.size === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each user, check if we already sent a memories notification today
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    let notifiedCount = 0;

    for (const userId of usersWithMemories) {
      // Check for existing memories notification today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "memory")
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Insert notification (actor_id = user_id for self-generated notifications)
      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          actor_id: userId,
          type: "memory",
          message: "Você tem lembranças deste dia! Toque para relembrar.",
          read: false,
        });

      if (!insertError) notifiedCount++;
    }

    return new Response(JSON.stringify({ notified: notifiedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
