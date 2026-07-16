import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Save, Smartphone, Globe, Apple, Info, ExternalLink } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface PlatformConfigProps {
  title: string;
  icon: React.ReactNode;
  appId: string;
  apiKey: string;
  onAppIdChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
}

const PlatformConfig = ({ title, icon, appId, apiKey, onAppIdChange, onApiKeyChange }: PlatformConfigProps) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle className="text-sm">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">OneSignal APP ID</Label>
        <Input
          value={appId}
          onChange={(e) => onAppIdChange(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="h-9 text-sm font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Chave de API REST (REST API Key)</Label>
        <Input
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Insira sua chave de API REST"
          className="h-9 text-sm font-mono"
          type="password"
        />
      </div>
    </CardContent>
  </Card>
);

const defaultState = {
  pushEnabled: true,
  androidPush: true,
  iosPush: true,
  androidNative: true,
  iosNative: true,
  webPush: true,
  androidGlobalAppId: "",
  androidGlobalApiKey: "",
  iosGlobalAppId: "",
  iosGlobalApiKey: "",
  webGlobalAppId: "",
  webGlobalApiKey: "",
  androidMessengerAppId: "",
  androidMessengerApiKey: "",
  iosMessengerAppId: "",
  iosMessengerApiKey: "",
};

const AdminPushNotifications = () => {
  const { settings, loading, saving, saveSettings } = useSiteSettings("push_notifications");
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (settings && Object.keys(settings).length) {
      setState({ ...defaultState, ...settings });
    }
  }, [settings]);

  const update = <K extends keyof typeof defaultState>(key: K, value: (typeof defaultState)[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    await saveSettings(state);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Configurações de Notificações Push
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as notificações push para navegadores web e aplicativos móveis usando o OneSignal.
        </p>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Este sistema permite que seu script envie notificações push para qualquer aplicativo que utilize a API.</p>
          <a
            href="https://onesignal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Registre-se no OneSignal para começar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ativação de Recursos</CardTitle>
          <CardDescription className="text-xs">Ative ou desative canais de notificações push.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <Label className="text-sm font-medium">Sistema de Notificações Push</Label>
              <p className="text-[10px] text-muted-foreground">
                Habilite este recurso para que os usuários sejam notificados em seus navegadores/aplicativos enquanto o app estiver fechado.
              </p>
            </div>
            <Switch checked={state.pushEnabled} onCheckedChange={(v) => update("pushEnabled", v)} />
          </div>

          <Separator />

          <div className={!state.pushEnabled ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Mensagens Push no Android</Label>
                  <p className="text-[10px] text-muted-foreground">Apenas Mensagens de Usuários</p>
                </div>
              </div>
              <Switch checked={state.androidPush} onCheckedChange={(v) => update("androidPush", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Apple className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Mensagens Push no iOS</Label>
                  <p className="text-[10px] text-muted-foreground">Apenas Mensagens de Usuários</p>
                </div>
              </div>
              <Switch checked={state.iosPush} onCheckedChange={(v) => update("iosPush", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Notificações Nativas do Site no Android</Label>
                  <p className="text-[10px] text-muted-foreground">Curtidas, Seguidores, Comentários, etc.</p>
                </div>
              </div>
              <Switch checked={state.androidNative} onCheckedChange={(v) => update("androidNative", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Apple className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Notificações Nativas do Site no iOS</Label>
                  <p className="text-[10px] text-muted-foreground">Curtidas, Seguidores, Comentários, etc.</p>
                </div>
              </div>
              <Switch checked={state.iosNative} onCheckedChange={(v) => update("iosNative", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Notificações Push na Web</Label>
                  <p className="text-[10px] text-muted-foreground">Chrome, Firefox, etc. Requer SSL</p>
                </div>
              </div>
              <Switch checked={state.webPush} onCheckedChange={(v) => update("webPush", v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <a
          href="https://documentation.onesignal.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Precisa de Ajuda? Leia a Documentação
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Separator />

      <div className={!state.pushEnabled ? "opacity-50 pointer-events-none space-y-6" : "space-y-6"}>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Configurações de Notificações Globais</h3>
          <p className="text-[10px] text-muted-foreground mb-4">Curtidas, Descurtidas, Comentários, Seguir, etc.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PlatformConfig
              title="Android"
              icon={<Smartphone className="w-4 h-4 text-primary" />}
              appId={state.androidGlobalAppId}
              apiKey={state.androidGlobalApiKey}
              onAppIdChange={(v) => update("androidGlobalAppId", v)}
              onApiKeyChange={(v) => update("androidGlobalApiKey", v)}
            />
            <PlatformConfig
              title="iOS"
              icon={<Apple className="w-4 h-4 text-primary" />}
              appId={state.iosGlobalAppId}
              apiKey={state.iosGlobalApiKey}
              onAppIdChange={(v) => update("iosGlobalAppId", v)}
              onApiKeyChange={(v) => update("iosGlobalApiKey", v)}
            />
            <PlatformConfig
              title="Web"
              icon={<Globe className="w-4 h-4 text-primary" />}
              appId={state.webGlobalAppId}
              apiKey={state.webGlobalApiKey}
              onAppIdChange={(v) => update("webGlobalAppId", v)}
              onApiKeyChange={(v) => update("webGlobalApiKey", v)}
            />
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Configurações de Notificações Push de Mensagens e Chat</h3>
          <p className="text-[10px] text-muted-foreground mb-4">Aplicativos OneSignal separados para notificações push de mensagens em tempo real.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlatformConfig
              title="Messenger & Chat no Android"
              icon={<Smartphone className="w-4 h-4 text-primary" />}
              appId={state.androidMessengerAppId}
              apiKey={state.androidMessengerApiKey}
              onAppIdChange={(v) => update("androidMessengerAppId", v)}
              onApiKeyChange={(v) => update("androidMessengerApiKey", v)}
            />
            <PlatformConfig
              title="Messenger & Chat no iOS"
              icon={<Apple className="w-4 h-4 text-primary" />}
              appId={state.iosMessengerAppId}
              apiKey={state.iosMessengerApiKey}
              onAppIdChange={(v) => update("iosMessengerAppId", v)}
              onApiKeyChange={(v) => update("iosMessengerApiKey", v)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Configurações de Push"}
        </Button>
      </div>
    </div>
  );
};

export default AdminPushNotifications;
