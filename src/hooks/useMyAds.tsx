import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useMyAds = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["my-ads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sponsored_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("sponsored_posts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? "Ad activated" : "Ad paused");
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      queryClient.invalidateQueries({ queryKey: ["sponsored-feed-posts"] });
    },
    onError: () => toast.error("Failed to update ad status"),
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sponsored_posts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ad deleted");
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      queryClient.invalidateQueries({ queryKey: ["sponsored-feed-posts"] });
    },
    onError: () => toast.error("Failed to delete ad"),
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; content?: string; link_url?: string | null; target_category?: string | null; target_location?: string | null; frequency_cap?: number }) => {
      const { error } = await supabase
        .from("sponsored_posts")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ad updated");
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      queryClient.invalidateQueries({ queryKey: ["sponsored-feed-posts"] });
    },
    onError: () => toast.error("Failed to update ad"),
  });

  return { ...query, toggleActive, deleteAd, updateAd };
};
