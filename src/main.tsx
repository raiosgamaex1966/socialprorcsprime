import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA service worker registration — guarded against Lovable preview iframes.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isInIframe || isPreviewHost) {
  // Unregister any existing SWs so preview never serves stale cached builds.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
} else if ("serviceWorker" in navigator) {
  // Production-only registration via vite-plugin-pwa virtual module.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* no-op */
    });
}

declare global {
  interface Window {
    __splashProgress?: { set: (v: number) => void; done: () => void };
  }
}

const splashProgress = window.__splashProgress;

// React about to mount
splashProgress?.set(85);

createRoot(document.getElementById("root")!).render(<App />);

// Confirm first React paint via double rAF (commit + paint)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    splashProgress?.set(92);
  });
});

// Wait for initial auth session fetch before completing
import("@/integrations/supabase/client")
  .then(({ supabase }) => supabase.auth.getSession().finally(() => splashProgress?.set(100)))
  .catch(() => splashProgress?.set(100));

function releaseScrollLock() {
  document.documentElement.classList.remove("splash-active");
  document.body.classList.remove("splash-active");
}

function dismissSplash() {
  const splash = document.getElementById("app-splash");
  if (!splash) {
    releaseScrollLock();
    return;
  }
  // Move focus into the app so SR users land on real content first before setting aria-hidden
  const root = document.getElementById("root");
  if (root && (!document.activeElement || !root.contains(document.activeElement))) {
    const focusable = root.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea, [role="link"], [role="button"], main, h1'
    );
    (focusable ?? root).focus({ preventScroll: true } as FocusOptions);
  }
  // If splash itself or its descendants still has focus, blur it
  if (document.activeElement && (splash.contains(document.activeElement) || document.activeElement === splash)) {
    (document.activeElement as HTMLElement).blur();
  }
  // Hide from assistive tech immediately
  splash.setAttribute("aria-hidden", "true");
  splash.setAttribute("aria-busy", "false");
  splash.setAttribute("data-leaving", "true");
  const cleanup = () => {
    splash.remove();
    releaseScrollLock();
  };
  splash.addEventListener("transitionend", cleanup, { once: true });
  window.setTimeout(cleanup, 800);
}

// Dismiss when progress hits 100%, with a hard 6s fallback
const startedAt = Date.now();
const dismissCheck = window.setInterval(() => {
  const el = document.getElementById("app-splash-percent");
  const reached = el?.textContent?.trim() === "100%";
  const timedOut = Date.now() - startedAt > 6000;
  if (reached || timedOut) {
    window.clearInterval(dismissCheck);
    window.setTimeout(dismissSplash, reached ? 250 : 0);
  }
}, 80);
