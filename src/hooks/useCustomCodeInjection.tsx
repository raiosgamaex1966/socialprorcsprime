import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads admin-configured custom CSS/JS from site_settings and injects it
 * into the live document. Disabled toggles are respected. Runs once on
 * mount and updates if the underlying settings row changes.
 */
export function useCustomCodeInjection() {
  useEffect(() => {
    let cancelled = false;
    const tags: HTMLElement[] = [];

    const inject = (settings: Record<string, any>) => {
      // Clean up anything we previously injected
      tags.splice(0).forEach((t) => t.remove());

      if (settings.cssEnabled !== false) {
        if (settings.headCss) {
          const el = document.createElement("style");
          el.dataset.injected = "custom-head-css";
          el.textContent = String(settings.headCss);
          document.head.appendChild(el);
          tags.push(el);
        }
        if (settings.bodyCss) {
          const el = document.createElement("style");
          el.dataset.injected = "custom-body-css";
          el.textContent = String(settings.bodyCss);
          document.body.appendChild(el);
          tags.push(el);
        }
      }
      if (settings.jsEnabled !== false) {
        if (settings.headJs) {
          const el = document.createElement("script");
          el.dataset.injected = "custom-head-js";
          el.textContent = String(settings.headJs);
          document.head.appendChild(el);
          tags.push(el);
        }
        if (settings.bodyJs) {
          const el = document.createElement("script");
          el.dataset.injected = "custom-body-js";
          el.textContent = String(settings.bodyJs);
          document.body.appendChild(el);
          tags.push(el);
        }
      }
    };

    (async () => {
      const { data } = await (supabase as any)
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "custom_code")
        .maybeSingle();
      if (cancelled) return;
      if (data?.setting_value) inject(data.setting_value);
    })();

    return () => {
      cancelled = true;
      tags.forEach((t) => t.remove());
    };
  }, []);
}
