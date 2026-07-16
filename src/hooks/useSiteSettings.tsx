import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to load and save site settings from the site_settings table.
 * Settings are stored as key-value pairs with JSONB values.
 */
export function useSiteSettings(settingsGroup: string) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings for this group
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", settingsGroup)
        .maybeSingle();

      if (data?.setting_value) {
        setSettings(data.setting_value);
      }
      setLoading(false);
    };
    load();
  }, [settingsGroup]);

  // Save settings (upsert)
  const saveSettings = useCallback(
    async (newSettings: Record<string, any>) => {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error } = await (supabase as any)
        .from("site_settings")
        .upsert(
          {
            setting_key: settingsGroup,
            setting_value: newSettings,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          },
          { onConflict: "setting_key" }
        );

      if (error) {
        toast.error("Failed to save settings: " + error.message);
      } else {
        setSettings(newSettings);
        toast.success("Settings saved successfully");
      }
      setSaving(false);
      return !error;
    },
    [settingsGroup]
  );

  return { settings, loading, saving, saveSettings };
}
