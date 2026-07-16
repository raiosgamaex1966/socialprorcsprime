import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks whether the app has been set up (i.e., a super admin exists).
 * Returns { isSetupComplete, loading }.
 */
export function useSetupCheck() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await (supabase as any).rpc("check_setup_complete");

        if (error) {
          console.error("Setup check error:", error);
          setIsSetupComplete(false);
        } else {
          setIsSetupComplete(data === true);
        }
      } catch (e) {
        console.error("Setup check failed:", e);
        setIsSetupComplete(false);
      }
      setLoading(false);
    };
    check();
  }, []);

  return { isSetupComplete, loading };
}
