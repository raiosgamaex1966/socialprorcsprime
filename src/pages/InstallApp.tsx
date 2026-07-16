import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AppWindow, Check, Chrome, Download, ExternalLink, Monitor, MoreVertical, Plus, Share, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IOSBrowser = "safari" | "chrome" | "firefox" | "edge" | "other";

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSUA = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch points
  const iPadOS = ua.includes("Macintosh") && (navigator as any).maxTouchPoints > 1;
  return iOSUA || iPadOS;
}

function detectIOSBrowser(): IOSBrowser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/CriOS\//i.test(ua)) return "chrome";
  if (/FxiOS\//i.test(ua)) return "firefox";
  if (/EdgiOS\//i.test(ua)) return "edge";
  // Safari is the only one that doesn't add a custom token; check for "Safari" w/o Cri/Fxi/Edgi
  if (/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) return "safari";
  return "other";
}

const InstallApp = () => {
  const siteName = "Social Pro";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const isIOS = useMemo(() => detectIOS(), []);
  const iosBrowser = useMemo<IOSBrowser>(() => (isIOS ? detectIOSBrowser() : "other"), [isIOS]);
  const defaultTab = isIOS ? "ios" : "android";
  const defaultIOSSubTab: IOSBrowser = iosBrowser === "safari" ? "safari" : iosBrowser === "other" ? "safari" : iosBrowser;

  useEffect(() => {
    document.title = `Instalar ${siteName} — Baixe o aplicativo`;
    const meta = document.querySelector('meta[name="description"]');
    const desc = `Instale o ${siteName} no seu dispositivo para ter uma experiência rápida, semelhante a um aplicativo, com acesso direto na tela inicial.`;
    if (meta) meta.setAttribute("content", desc);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [siteName]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  const benefits = [
    { icon: Smartphone, title: "Experiência de aplicativo", desc: "Tela cheia, sem barras de navegador" },
    { icon: Download, title: "Acesso rápido", desc: "Inicie direto da sua tela inicial" },
    { icon: AppWindow, title: "Carregamento rápido", desc: "Desempenho de inicialização otimizado" },
    { icon: Check, title: "Atualizações automáticas", desc: "Sempre na versão mais recente" },
  ];

  return (
    <main className="min-h-full">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="text-center space-y-3">
          <Badge variant="secondary" className="mb-2">Aplicativo Web Progressivo (PWA)</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Instalar {siteName}</h1>
          <p className="text-muted-foreground text-lg">
            Tenha a experiência completa do aplicativo em qualquer dispositivo — sem necessidade de loja de aplicativos.
          </p>
        </header>

        {isInstalled ? (
          <Card className="p-8 text-center space-y-3 border-primary/30 bg-primary/5">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">O {siteName} está instalado</h2>
            <p className="text-muted-foreground">Você já está usando o aplicativo instalado. Aproveite!</p>
          </Card>
        ) : deferredPrompt ? (
          <Card className="p-8 text-center space-y-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <Download className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h2 className="text-xl font-semibold mb-1">Pronto para instalar</h2>
              <p className="text-muted-foreground">Um toque para adicionar o {siteName} ao seu dispositivo.</p>
            </div>
            <Button size="lg" onClick={handleInstall} disabled={installing}>
              <Download className="w-4 h-4 mr-2" />
              {installing ? "Instalando..." : `Instalar ${siteName}`}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 bg-muted/30">
            <p className="text-sm text-muted-foreground text-center">
              A instalação automática não está disponível neste navegador. Siga as instruções abaixo para o seu dispositivo.
            </p>
          </Card>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">Por que instalar?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {benefits.map((b) => (
              <Card key={b.title} className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Instruções passo a passo</h2>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ios">iOS</TabsTrigger>
              <TabsTrigger value="android">Android</TabsTrigger>
              <TabsTrigger value="desktop">Computador</TabsTrigger>
              <TabsTrigger value="other">Outros</TabsTrigger>
            </TabsList>

            <TabsContent value="ios" className="mt-4 space-y-4">
              {isIOS && iosBrowser !== "safari" && iosBrowser !== "other" && (
                <Card className="p-4 flex gap-3 border-primary/30 bg-primary/5">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      Você está usando o {iosBrowser === "chrome" ? "Chrome" : iosBrowser === "firefox" ? "Firefox" : "Edge"} no iOS
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      A Apple só permite instalar aplicativos web na Tela de Início usando o <strong>Safari</strong>. Abra esta página no Safari para instalar o {siteName}.
                    </p>
                  </div>
                </Card>
              )}

              <Tabs defaultValue={defaultIOSSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="safari">Safari</TabsTrigger>
                  <TabsTrigger value="chrome">Chrome / outros</TabsTrigger>
                </TabsList>

                <TabsContent value="safari" className="mt-4">
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Smartphone className="w-4 h-4" /> Safari no iPhone ou iPad
                    </div>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">1</span>
                        <span>Abra o {siteName} no <strong>Safari</strong>.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">2</span>
                        <span>Toque no botão de <Share className="inline w-4 h-4 mx-1" /> <strong>Compartilhar</strong> (na parte inferior no iPhone, superior no iPad).</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">3</span>
                        <span>Role e toque em <Plus className="inline w-4 h-4 mx-1" /> <strong>Adicionar à Tela de Início</strong>.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">4</span>
                        <span>Confirme o nome e toque em <strong>Adicionar</strong> no canto superior direito.</span>
                      </li>
                    </ol>
                    <p className="text-xs text-muted-foreground">
                      Requer iOS 16.4+ para suporte completo a PWA. Versões anteriores ainda criam um atalho na Tela de Início.
                    </p>
                  </Card>
                </TabsContent>

                <TabsContent value="chrome" className="mt-4">
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Chrome className="w-4 h-4" /> Chrome, Firefox ou Edge no iOS
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Navegadores de terceiros no iOS <strong>não conseguem instalar aplicativos web diretamente</strong> — a Apple só permite isso através do Safari.
                    </p>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">1</span>
                        <span>Toque no botão de <MoreVertical className="inline w-4 h-4 mx-1" /> <strong>menu</strong>.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">2</span>
                        <span>Escolha <ExternalLink className="inline w-4 h-4 mx-1" /> <strong>Abrir no Safari</strong>.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">3</span>
                        <span>No Safari, toque em <Share className="inline w-4 h-4 mx-1" /> <strong>Compartilhar</strong>.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">4</span>
                        <span>Toque em <Plus className="inline w-4 h-4 mx-1" /> <strong>Adicionar à Tela de Início</strong>, depois em <strong>Adicionar</strong>.</span>
                      </li>
                    </ol>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="android" className="mt-4">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="w-4 h-4" /> Chrome no Android
                </div>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">1</span>
                    <span>Abra o {siteName} no <strong>Chrome</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">2</span>
                    <span>Toque no <strong>menu ⋮</strong> no canto superior direito.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">3</span>
                    <span>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">4</span>
                    <span>Confirme tocando em <strong>Instalar</strong>.</span>
                  </li>
                </ol>
              </Card>
            </TabsContent>

            <TabsContent value="desktop" className="mt-4">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Monitor className="w-4 h-4" /> Chrome, Edge ou Brave no Windows/Mac/Linux
                </div>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">1</span>
                    <span>Procure pelo <Download className="inline w-4 h-4 mx-1" /> <strong>ícone de instalação</strong> na barra de endereços.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">2</span>
                    <span>Ou abra o <strong>menu do navegador</strong> e escolha <strong>Instalar {siteName}</strong>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">3</span>
                    <span>Clique em <strong>Instalar</strong> para adicioná-lo como aplicativo para computador.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-medium">4</span>
                    <span>Inicie através do seu <strong>Menu Iniciar</strong>, <strong>Dock</strong> ou <strong>Aplicativos</strong>.</span>
                  </li>
                </ol>
              </Card>
            </TabsContent>

            <TabsContent value="other" className="mt-4">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Chrome className="w-4 h-4" /> Firefox e outros navegadores
                </div>
                <p className="text-sm text-muted-foreground">
                  O Firefox no Android suporta a instalação através do menu (menu ⋮ → <strong>Instalar</strong>). O Firefox para computador não suporta a instalação de PWA nativamente — recomendamos o uso do Chrome, Edge ou Brave.
                </p>
                <p className="text-sm text-muted-foreground">
                  Samsung Internet: toque no menu e escolha <strong>Adicionar página a → Tela inicial</strong>.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold mb-2">Precisa de ajuda?</h3>
          <p className="text-sm text-muted-foreground">
            Se a instalação não funcionar, certifique-se de que está usando um navegador compatível e que seu dispositivo tem espaço de armazenamento suficiente. O aplicativo também funciona no navegador — a instalação é opcional.
          </p>
        </Card>
      </div>
    </main>
  );
};

export default InstallApp;
