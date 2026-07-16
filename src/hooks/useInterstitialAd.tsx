import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";

const INTERSTITIAL_STORAGE_KEY = "interstitial_last_shown";
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between interstitials
const NAV_COUNT_TRIGGER = 5; // Show after every N navigations

export const useInterstitialAd = () => {
  const { data: ads = [] } = useSponsoredPosts();
  const { pathname } = useLocation();
  const navCount = useRef(0);
  const [activeAd, setActiveAd] = useState<any>(null);

  const canShow = useCallback(() => {
    const lastShown = localStorage.getItem(INTERSTITIAL_STORAGE_KEY);
    if (lastShown && Date.now() - parseInt(lastShown, 10) < MIN_INTERVAL_MS) return false;
    return ads.length > 0;
  }, [ads]);

  // Track navigations
  useEffect(() => {
    navCount.current += 1;
    if (navCount.current >= NAV_COUNT_TRIGGER && canShow()) {
      navCount.current = 0;
      const ad = ads[Math.floor(Math.random() * ads.length)];
      setActiveAd(ad);
      localStorage.setItem(INTERSTITIAL_STORAGE_KEY, String(Date.now()));
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => setActiveAd(null), []);

  return { activeAd, dismiss };
};
