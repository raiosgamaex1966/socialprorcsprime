import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find posts that are scheduled and whose time has arrived
    const { data: postsToPublish, error: fetchError } = await supabase
      .from("page_posts")
      .select("id, page_id, content, created_by")
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (fetchError) throw fetchError;

    if (!postsToPublish || postsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled posts to publish", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Publish them by setting scheduled_at to null
    const ids = postsToPublish.map((p) => p.id);
    const { error: updateError } = await supabase
      .from("page_posts")
      .update({ scheduled_at: null })
      .in("id", ids);

    if (updateError) throw updateError;

    // Send notifications to page followers for each published post
    for (const post of postsToPublish) {
      const { data: page } = await supabase
        .from("pages")
        .select("name")
        .eq("id", post.page_id)
        .single();

      if (!page) continue;

      const { data: followers } = await supabase
        .from("page_followers")
        .select("user_id")
        .eq("page_id", post.page_id)
        .neq("user_id", post.created_by);

      if (followers && followers.length > 0) {
        const notifications = followers.map((f) => ({
          user_id: f.user_id,
          actor_id: post.created_by,
          type: "page_post",
          message: `publicou uma nova publicação em "${page.name}"`,
          reference_id: post.id,
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({ message: "Scheduled posts published", count: postsToPublish.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
