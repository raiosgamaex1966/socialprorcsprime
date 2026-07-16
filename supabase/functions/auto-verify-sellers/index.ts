import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Criteria for auto-verification:
    // 1. At least 5 active listings
    // 2. At least 3 seller reviews with avg >= 4.0
    // 3. Account older than 30 days
    // 4. No pending reports against their listings

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get all profiles older than 30 days
    const { data: eligibleProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .lte("created_at", thirtyDaysAgo);

    if (!eligibleProfiles?.length) {
      return new Response(JSON.stringify({ verified: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userIds = eligibleProfiles.map((p: any) => p.user_id);

    // Get already verified
    const { data: alreadyVerified } = await supabase
      .from("verified_sellers")
      .select("user_id");
    const verifiedSet = new Set((alreadyVerified || []).map((v: any) => v.user_id));

    const candidates = userIds.filter((id: string) => !verifiedSet.has(id));
    let verifiedCount = 0;

    for (const userId of candidates) {
      // Check listing count
      const { count: listingCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      if ((listingCount || 0) < 5) continue;

      // Check reviews
      const { data: reviews } = await supabase
        .from("seller_reviews")
        .select("rating")
        .eq("seller_id", userId);

      if (!reviews || reviews.length < 3) continue;
      const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
      if (avgRating < 4.0) continue;

      // Check no pending reports
      const { data: userListings } = await supabase
        .from("listings")
        .select("id")
        .eq("user_id", userId);
      
      const listingIds = (userListings || []).map((l: any) => l.id);
      if (listingIds.length > 0) {
        const { count: reportCount } = await supabase
          .from("listing_reports")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
          .eq("status", "pending");

        if ((reportCount || 0) > 0) continue;
      }

      // Auto-verify
      await supabase.from("verified_sellers").insert({
        user_id: userId,
        verification_type: "auto",
        criteria_met: {
          listings: listingCount,
          reviews: reviews.length,
          avg_rating: avgRating,
          account_age_days: 30,
        },
      });

      verifiedCount++;
    }

    return new Response(
      JSON.stringify({ verified: verifiedCount, candidates: candidates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
