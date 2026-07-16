import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteBranding {
  faviconUrl?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerSearchBgColor?: string;
  headerShadowColor?: string;
  bodyBgColor?: string;
  btnTextColor?: string;
  btnBgColor?: string;
  btnHoverTextColor?: string;
  btnHoverBgColor?: string;
  btnDisabledBgColor?: string;
}

/**
 * Hook to load site branding (design settings) for use across the app.
 * Reads from site_settings table with key "admin_design".
 */
export function useSiteBranding() {
  const [branding, setBranding] = useState<SiteBranding>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "admin_design")
        .maybeSingle();

      if (data?.setting_value) {
        setBranding(data.setting_value as SiteBranding);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Update favicon dynamically
  useEffect(() => {
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding.faviconUrl]);

  return { branding, loading };
}
