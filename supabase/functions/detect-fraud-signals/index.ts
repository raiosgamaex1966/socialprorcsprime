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

    // Get all active listings
    const { data: listings } = await supabase
      .from("listings")
      .select("id, user_id, price, category, title, description, created_at")
      .eq("status", "active");

    if (!listings?.length) {
      return new Response(JSON.stringify({ flagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate average prices per category
    const categoryPrices: Record<string, number[]> = {};
    for (const l of listings) {
      if (!categoryPrices[l.category]) categoryPrices[l.category] = [];
      categoryPrices[l.category].push(Number(l.price));
    }
    const categoryAvg: Record<string, number> = {};
    for (const [cat, prices] of Object.entries(categoryPrices)) {
      categoryAvg[cat] = prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    // Get listing counts per user
    const userListingCounts: Record<string, number> = {};
    for (const l of listings) {
      userListingCounts[l.user_id] = (userListingCounts[l.user_id] || 0) + 1;
    }

    // Get account ages
    const userIds = [...new Set(listings.map((l: any) => l.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .in("user_id", userIds);
    const profileMap: Record<string, any> = {};
    for (const p of profiles || []) {
      profileMap[p.user_id] = p;
    }

    const signals: any[] = [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const listing of listings) {
      const price = Number(listing.price);
      const avg = categoryAvg[listing.category] || 0;
      const profile = profileMap[listing.user_id];
      const accountAge = profile ? Date.now() - new Date(profile.created_at).getTime() : Infinity;
      const accountAgeDays = accountAge / (24 * 60 * 60 * 1000);
      const userCount = userListingCounts[listing.user_id] || 0;

      // Signal 1: Price far below category average (>70% below)
      if (avg > 0 && price < avg * 0.3 && price > 0) {
        signals.push({
          listing_id: listing.id,
          signal_type: "price_below_average",
          severity: "high",
          description: `O preço (R$ ${price}) está ${Math.round((1 - price / avg) * 100)}% abaixo da média da categoria (R$ ${Math.round(avg)})`,
          metadata: { price, category_avg: Math.round(avg), category: listing.category },
        });
      }

      // Signal 2: New account with many listings (< 7 days, > 10 listings)
      if (accountAgeDays < 7 && userCount > 10) {
        signals.push({
          listing_id: listing.id,
          signal_type: "new_account_many_listings",
          severity: "high",
          description: `Conta nova (${Math.round(accountAgeDays)} dias de idade) com ${userCount} anúncios ativos`,
          metadata: { account_age_days: Math.round(accountAgeDays), listing_count: userCount },
        });
      }

      // Signal 3: New account with moderately many listings (< 14 days, > 5 listings)
      if (accountAgeDays < 14 && userCount > 5 && !(accountAgeDays < 7 && userCount > 10)) {
        signals.push({
          listing_id: listing.id,
          signal_type: "new_account_moderate_listings",
          severity: "medium",
          description: `Conta recente (${Math.round(accountAgeDays)} dias de idade) com ${userCount} anúncios ativos`,
          metadata: { account_age_days: Math.round(accountAgeDays), listing_count: userCount },
        });
      }

      // Signal 4: Suspiciously low price (under $1 for non-free categories)
      if (price > 0 && price < 1 && avg > 10) {
        signals.push({
          listing_id: listing.id,
          signal_type: "suspiciously_low_price",
          severity: "high",
          description: `O preço (R$ ${price}) é suspeitosamente baixo para a categoria ${listing.category}`,
          metadata: { price, category: listing.category, category_avg: Math.round(avg) },
        });
      }

      // Signal 5: No description on high-value items
      if (price > 500 && (!listing.description || listing.description.trim().length < 10)) {
        signals.push({
          listing_id: listing.id,
          signal_type: "missing_description_high_value",
          severity: "low",
          description: `Anúncio de alto valor (R$ ${price}) com descrição mínima ou sem descrição`,
          metadata: { price },
        });
      }
    }

    // Upsert signals (don't duplicate)
    let flaggedCount = 0;
    for (const signal of signals) {
      const { error } = await supabase
        .from("listing_fraud_signals")
        .upsert(signal, { onConflict: "listing_id,signal_type" });
      if (!error) flaggedCount++;
    }

    return new Response(
      JSON.stringify({ flagged: flaggedCount, total_listings: listings.length, signals_detected: signals.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
