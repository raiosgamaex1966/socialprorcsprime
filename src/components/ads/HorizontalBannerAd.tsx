import { useEffect, useRef, useCallback } from "react";
import { ExternalLink, Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordImpression } from "@/lib/adFrequencyCap";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";
import { useState } from "react";

interface HorizontalBannerAdProps {
  category?: string | null;
  /** Visual variant */
  variant?: "slim" | "standard";
  className?: string;
}

const HorizontalBannerAd = ({ category, variant = "slim", className = "" }: HorizontalBannerAdProps) => {
  const { data: ads = [] } = useSponsoredPosts(category);
  const [dismissed, setDismissed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);

  // Pick a random ad from the available pool
  const ad = ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null;

  const trackImpression = useCallback(async () => {
    if (!ad || impressionTracked.current) return;
    impressionTracked.current = true;
    recordImpression(ad.id);
    await supabase
      .from("sponsored_posts")
      .update({ impressions: (ad.impressions || 0) + 1 })
      .eq("id", ad.id);
  }, [ad]);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el || !ad) return;
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
  }, [trackImpression, ad]);

  const trackClick = async () => {
    if (!ad) return;
    await supabase
      .from("sponsored_posts")
      .update({ clicks: (ad.clicks || 0) + 1 })
      .eq("id", ad.id);
  };

  if (!ad || dismissed) return null;

  if (variant === "slim") {
    return (
      <div
        ref={bannerRef}
        className={`relative flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/15 rounded-xl ${className}`}
      >
        <Megaphone className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm text-foreground truncate flex-1">{ad.content}</p>
        {ad.link_url && (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-full hover:bg-secondary text-muted-foreground"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="absolute top-1 right-8 text-[9px] text-muted-foreground uppercase tracking-wide">Ad</span>
      </div>
    );
  }

  // Standard variant — larger banner with image
  return (
    <div
      ref={bannerRef}
      className={`relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-accent/5 ${className}`}
    >
      <div className="flex items-stretch">
        {ad.image_url && (
          <div className="w-28 shrink-0">
            <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-3 flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">Sponsored</span>
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-snug">{ad.content}</p>
          {ad.link_url && (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackClick}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-0.5"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-card/80 hover:bg-card text-muted-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default HorizontalBannerAd;
