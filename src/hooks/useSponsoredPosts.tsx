import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filterCappedAds } from "@/lib/adFrequencyCap";

export const useSponsoredPosts = (category?: string | null) => {
  return useQuery({
    queryKey: ["sponsored-feed-posts", category ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("sponsored_posts")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", new Date().toISOString())
        .gte("end_date", new Date().toISOString());

      if (category) {
        query = query.or(`target_category.eq.${category},target_category.is.null`);
      }

      const { data } = await query;
      return filterCappedAds((data || []) as any[]);
    },
  });
};
