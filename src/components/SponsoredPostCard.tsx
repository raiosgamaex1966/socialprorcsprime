import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Megaphone, ExternalLink } from "lucide-react";
import { recordImpression } from "@/lib/adFrequencyCap";

interface SponsoredPostCardProps {
  post: any;
}

const SponsoredPostCard = ({ post }: SponsoredPostCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", post.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", post.user_id)
        .maybeSingle();
      return data;
    },
  });

  const trackImpression = useCallback(async () => {
    if (impressionTracked.current) return;
    impressionTracked.current = true;
    recordImpression(post.id);
    await supabase
      .from("sponsored_posts")
      .update({ impressions: (post.impressions || 0) + 1 })
      .eq("id", post.id);
  }, [post.id, post.impressions]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackImpression();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trackImpression]);

  const trackClick = async () => {
    await supabase
      .from("sponsored_posts")
      .update({ clicks: (post.clicks || 0) + 1 })
      .eq("id", post.id);
  };

  return (
    <div ref={cardRef} className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {(profile?.display_name || "?")[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {profile?.display_name || "Advertiser"}
          </p>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary">
            <Megaphone className="w-2.5 h-2.5" /> Sponsored
          </Badge>
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
      </div>
      {post.image_url && (
        <div className="border-t border-border">
          <img src={post.image_url} alt="" className="w-full max-h-[400px] object-cover" />
        </div>
      )}
      {post.link_url && (
        <div className="px-4 py-3 border-t border-border">
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <ExternalLink className="w-4 h-4" /> Learn more
          </a>
        </div>
      )}
    </div>
  );
};

export default SponsoredPostCard;
