import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, CheckCircle2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Status = "installed" | "installable" | "manual";

const DISMISS_KEY = "pwa-banner-dismissed";

const PWAStatusBanner = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check dismissal (permanent, only applies to non-installed states)
    if (localStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as any).standalone === true;
    if (standalone) {
      setStatus("installed");
      return;
    }

    setStatus("manual");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setStatus("installable");
    };
    const onInstalled = () => {
      setStatus("installed");
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!status) return null;
  // Always show installed banner; hide others if dismissed
  if (status !== "installed" && dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const isInstalled = status === "installed";
  const isInstallable = status === "installable";

  const Icon = isInstalled ? CheckCircle2 : Download;
  const message = isInstalled
    ? "Aplicativo instalado — você está usando a versão instalada."
    : isInstallable
      ? "Este aplicativo pode ser instalado no seu dispositivo."
      : "Instale este aplicativo para uma experiência mais rápida e em tela cheia.";

  const cta = isInstalled ? "Ver detalhes" : "Instalar app";

  return (
    <div
      role="status"
      className={`relative w-full px-3 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 sm:gap-3 ${
        isInstalled
          ? "bg-primary/10 text-foreground"
          : "bg-primary text-primary-foreground"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{message}</span>
      <Link
        to="/install"
        className={`shrink-0 inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors ${
          isInstalled
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        }`}
      >
        {cta}
      </Link>
      {!isInstalled && (
        <button
          onClick={handleDismiss}
          className="shrink-0 ml-1 opacity-80 hover:opacity-100"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default PWAStatusBanner;
