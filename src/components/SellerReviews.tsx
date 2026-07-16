import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SellerReviewsProps {
  sellerId: string;
  listingId?: string;
}

const StarRating = ({
  value,
  onChange,
  readonly = false,
  size = "w-5 h-5",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: string;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(s)}
        className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
      >
        <Star
          className={`${size} ${s <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      </button>
    ))}
  </div>
);

const SellerReviews = ({ sellerId, listingId }: SellerReviewsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch reviewer profiles
      const reviewerIds = [...new Set(data.map((r: any) => r.reviewer_id))];
      if (reviewerIds.length === 0) return { reviews: [], profiles: {} };

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", reviewerIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = p;
      });

      return { reviews: data, profiles: profileMap };
    },
  });

  // Check if user can review (has a conversation with seller)
  const { data: canReview } = useQuery({
    queryKey: ["can-review-seller", sellerId, user?.id],
    queryFn: async () => {
      if (!user || user.id === sellerId) return false;
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("is_group", false)
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${sellerId}),and(participant_one.eq.${sellerId},participant_two.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== sellerId,
  });

  // Check if user already reviewed this seller for this listing
  const existingReview = reviews?.reviews.find(
    (r: any) => r.reviewer_id === user?.id && r.listing_id === listingId
  );

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("seller_reviews").insert({
      seller_id: sellerId,
      reviewer_id: user.id,
      listing_id: listingId || null,
      rating,
      review_text: reviewText.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("Você já avaliou este vendedor para este anúncio");
      else toast.error("Falha ao enviar avaliação");
    } else {
      toast.success("Avaliação enviada!");
      // Notify the seller
      await supabase.from("notifications").insert({
        user_id: sellerId,
        actor_id: user.id,
        type: "review",
        message: `deixou uma avaliação de ${rating} estrelas para você`,
        reference_id: listingId || null,
      });
      setRating(0);
      setReviewText("");
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", sellerId] });
    }
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from("seller_reviews").delete().eq("id", reviewId);
    if (error) toast.error("Falha ao excluir avaliação");
    else {
      toast.success("Avaliação excluída");
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", sellerId] });
    }
  };

  const avgRating =
    reviews && reviews.reviews.length > 0
      ? reviews.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.reviews.length
      : 0;

  return (
    <div className="rounded-lg bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Avaliações do Vendedor</h3>
        {reviews && reviews.reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={Math.round(avgRating)} readonly size="w-3.5 h-3.5" />
            <span className="text-xs text-muted-foreground">
              {avgRating.toFixed(1)} ({reviews.reviews.length})
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      {canReview && !existingReview && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/50 space-y-2">
          <p className="text-xs font-medium text-foreground">Deixe uma avaliação</p>
          <StarRating value={rating} onChange={setRating} />
          <Textarea
            placeholder="Compartilhe sua experiência (opcional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            maxLength={500}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full"
          >
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      )}

      {/* Reviews list */}
      {reviews && reviews.reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.reviews.map((review: any) => {
            const profile = reviews.profiles[review.reviewer_id];
            return (
              <div key={review.id} className="flex gap-2.5">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(profile?.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {profile?.display_name || "Usuário"}
                    </span>
                    <StarRating value={review.rating} readonly size="w-3 h-3" />
                  </div>
                  {review.review_text && (
                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                      {review.review_text}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {review.reviewer_id === user?.id && (
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-[10px] text-destructive hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhuma avaliação ainda</p>
      )}
    </div>
  );
};

export default SellerReviews;
