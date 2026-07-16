import { useEffect, useRef, useCallback, useState } from "react";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordImpression } from "@/lib/adFrequencyCap";
import { Button } from "@/components/ui/button";

interface InterstitialAdProps {
  ad: any;
  onClose: () => void;
}

const InterstitialAd = ({ ad, onClose }: InterstitialAdProps) => {
  const impressionTracked = useRef(false);
  const [countdown, setCountdown] = useState(5);

  // Track impression
  useEffect(() => {
    if (impressionTracked.current || !ad) return;
    impressionTracked.current = true;
    recordImpression(ad.id);
    supabase
      .from("sponsored_posts")
      .update({ impressions: (ad.impressions || 0) + 1 })
      .eq("id", ad.id);
  }, [ad]);

  // Countdown to allow close
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const trackClick = async () => {
    if (!ad) return;
    await supabase
      .from("sponsored_posts")
      .update({ clicks: (ad.clicks || 0) + 1 })
      .eq("id", ad.id);
  };

  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Close button */}
        <div className="absolute top-3 right-3 z-10">
          {countdown > 0 ? (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
              {countdown}
            </span>
          ) : (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Image */}
        {ad.image_url && (
          <img src={ad.image_url} alt="" className="w-full max-h-[280px] object-cover" />
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-wide font-semibold text-primary">Sponsored</span>
          </div>
          <p className="text-base text-foreground leading-relaxed">{ad.content}</p>
          {ad.link_url && (
            <Button asChild className="w-full" onClick={trackClick}>
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
                Learn more <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterstitialAd;
