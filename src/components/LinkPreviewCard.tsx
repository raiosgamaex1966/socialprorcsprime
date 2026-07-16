import { useState, useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LinkPreviewData {
  title: string;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
  siteName: string;
  url: string;
}

interface LinkPreviewCardProps {
  url: string;
  removable?: boolean;
  onRemove?: () => void;
}

// Simple in-memory cache
const previewCache = new Map<string, LinkPreviewData | null>();
const blockedPreviewPatterns = [
  "just a moment",
  "checking your browser",
  "enable javascript and cookies to continue",
  "attention required",
  "verify you are human",
  "captcha",
  "cloudflare",
];

function isBlockedPreviewText(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return blockedPreviewPatterns.some((pattern) => normalized.includes(pattern));
}

function isValidPreviewData(preview: LinkPreviewData | null | undefined): preview is LinkPreviewData {
  if (!preview?.url) return false;
  return ![
    preview.title,
    preview.description,
    preview.siteName,
    preview.domain,
  ].some((value) => isBlockedPreviewText(value));
}

function buildFallbackPreview(url: string): LinkPreviewData {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    return {
      title: domain,
      description: url,
      image: null,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      domain,
      siteName: domain,
      url,
    };
  } catch {
    return { title: url, description: null, image: null, favicon: null, domain: '', siteName: '', url };
  }
}

export function useLinkPreview(url: string | null) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) { setPreview(null); return; }

    if (previewCache.has(url)) {
      const cachedPreview = previewCache.get(url) || null;
      if (cachedPreview) {
        setPreview(cachedPreview);
        return;
      }
    }

    let cancelled = false;
    setLoading(true);

    supabase.functions.invoke("fetch-link-preview", { body: { url } })
      .then(({ data, error }) => {
        if (cancelled) return;
        const nextPreview = data as LinkPreviewData | null;
        if (error || data?.error || !isValidPreviewData(nextPreview)) {
          // Use fallback preview instead of null
          const fallback = buildFallbackPreview(url);
          previewCache.set(url, fallback);
          setPreview(fallback);
        } else {
          previewCache.set(url, nextPreview);
          setPreview(nextPreview);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = buildFallbackPreview(url);
          previewCache.set(url, fallback);
          setPreview(fallback);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  return { preview, loading };
}

/** Extract first URL from text */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return match?.[0] || null;
}

const LinkPreviewCard = ({ url, removable, onRemove }: LinkPreviewCardProps) => {
  const { preview, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden animate-pulse">
        <div className="h-[160px] bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="relative group">
      {removable && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-border/50 bg-secondary/30 overflow-hidden hover:bg-secondary/50 transition-colors cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        {preview.image && (
          <div className="w-full h-[200px] bg-muted overflow-hidden">
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider truncate">
              {preview.siteName || preview.domain}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    </div>
  );
};

export default LinkPreviewCard;