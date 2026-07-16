import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Device = "ios" | "android" | "desktop" | "other";

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
  return "other";
}

function getMessage(device: Device, installed: boolean, canPrompt: boolean): string {
  if (installed) return "Você já está usando o aplicativo instalado — aproveite!";
  if (canPrompt) return "Toque para instalar o aplicativo no seu dispositivo em apenas um passo.";
  switch (device) {
    case "ios":
      return "No iPhone ou iPad? Abra no Safari, toque em Compartilhar e selecione 'Adicionar à Tela de Início'.";
    case "android":
      return "No Android? Abra o menu do Chrome e toque em 'Instalar aplicativo' para uma experiência mais rápida.";
    case "desktop":
      return "No computador? Clique no ícone de instalação na barra de endereços para adicioná-lo como um aplicativo.";
    default:
      return "Instale o aplicativo para uma experiência em tela cheia e mais rápida em qualquer dispositivo.";
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  variant?: "header" | "menu";
}

const InstallAppCTA = ({ variant = "header" }: Props) => {
  const navigate = useNavigate();
  const [device] = useState<Device>(() => detectDevice());
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const message = useMemo(
    () => getMessage(device, installed, !!deferredPrompt),
    [device, installed, deferredPrompt]
  );

  if (installed) return null;

  const handleClick = () => navigate("/install");

  if (variant === "menu") {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-left"
      >
        <Download className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Instalar app</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{message}</p>
        </div>
      </button>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors text-xs font-medium"
            aria-label="Instalar app"
          >
            <Download className="w-4 h-4" />
            <span>Instalar app</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InstallAppCTA;
