import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Video, Phone, Eye, Keyboard, Info, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

const AdminVideoAudioSettings = () => {
  // Chat settings
  const [chatEnabled, setChatEnabled] = useState(true);
  const [messageSeenAlert, setMessageSeenAlert] = useState(true);
  const [userTypingSystem, setUserTypingSystem] = useState(true);

  // Video/Audio toggles
  const [videoCallsEnabled, setVideoCallsEnabled] = useState(false);
  const [audioCallsEnabled, setAudioCallsEnabled] = useState(false);

  // Provider selection
  const [activeProvider, setActiveProvider] = useState<"none" | "agora" | "twilio">("none");

  // Agora config
  const [agoraAppId, setAgoraAppId] = useState("");
  const [agoraAppCertificate, setAgoraAppCertificate] = useState("");
  const [agoraCustomerId, setAgoraCustomerId] = useState("");
  const [agoraCustomerSecret, setAgoraCustomerSecret] = useState("");

  // Twilio config
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioApiKeySid, setTwilioApiKeySid] = useState("");
  const [twilioApiKeySecret, setTwilioApiKeySecret] = useState("");

  const handleSave = () => {
    toast.success("Configurações de vídeo e áudio salvas com sucesso");
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Configuração de Chat e Videochamada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure mensagens em tempo real, chamadas de vídeo e de áudio para sua plataforma.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configurações de Chat</CardTitle>
          </div>
          <CardDescription>Configure o sistema de mensagens em tempo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Sistema de Chat</Label>
              <p className="text-xs text-muted-foreground">
                Habilite o sistema de chat para conversar com amigos na plataforma.
              </p>
            </div>
            <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Alerta de Mensagem Visualizada</Label>
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Verifica se a mensagem foi visualizada no chat. Recomendado para servidores potentes.
              </p>
            </div>
            <Switch checked={messageSeenAlert} onCheckedChange={setMessageSeenAlert} disabled={!chatEnabled} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Sistema de Digitação do Usuário</Label>
                <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Verifica se o usuário está digitando no chat. Recomendado para servidores potentes.
              </p>
            </div>
            <Switch checked={userTypingSystem} onCheckedChange={setUserTypingSystem} disabled={!chatEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Video & Audio Call Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configurações de Chamadas de Vídeo e Áudio</CardTitle>
          </div>
          <CardDescription>Ative ou desative os recursos de chamadas de vídeo e áudio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Chamadas de Vídeo</Label>
                <Video className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Ative o recurso de chat de vídeo para que os usuários façam chamadas de vídeo em seu site.
              </p>
            </div>
            <Switch checked={videoCallsEnabled} onCheckedChange={setVideoCallsEnabled} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Chamadas de Áudio</Label>
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Ative o recurso de chat de áudio para que os usuários façam chamadas de áudio em seu site.
              </p>
            </div>
            <Switch checked={audioCallsEnabled} onCheckedChange={setAudioCallsEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Agora API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração da API do Agora</CardTitle>
                <CardDescription className="mt-1">Chamadas de vídeo fornecidas pelo Agora.io</CardDescription>
              </div>
            </div>
            <Badge variant={activeProvider === "agora" ? "default" : "secondary"} className="text-xs">
              {activeProvider === "agora" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Chamadas de Vídeo do Agora</Label>
              <p className="text-xs text-muted-foreground">
                Ative o Agora para iniciar o serviço de chat de vídeo. Habilitar o Agora desativará o Twilio. O Agora suporta apenas chamadas de vídeo.
              </p>
            </div>
            <Switch
              checked={activeProvider === "agora"}
              onCheckedChange={(checked) => setActiveProvider(checked ? "agora" : "none")}
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Para começar a usar este recurso, você precisará criar uma conta no{" "}
              <a href="https://www.agora.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Agora.io <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="agora-app-id">App ID</Label>
              <Input
                id="agora-app-id"
                value={agoraAppId}
                onChange={(e) => setAgoraAppId(e.target.value)}
                placeholder="Insira o App ID do Agora"
                disabled={activeProvider !== "agora"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agora-app-cert">Certificado do App (App Certificate)</Label>
              <Input
                id="agora-app-cert"
                type="password"
                value={agoraAppCertificate}
                onChange={(e) => setAgoraAppCertificate(e.target.value)}
                placeholder="Insira o certificado do app"
                disabled={activeProvider !== "agora"}
              />
              <p className="text-[11px] text-muted-foreground">
                A chave secreta não é exibida por motivos de segurança, mas você ainda pode sobrescrever a atual.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agora-customer-id">ID do Cliente (Customer ID)</Label>
              <Input
                id="agora-customer-id"
                value={agoraCustomerId}
                onChange={(e) => setAgoraCustomerId(e.target.value)}
                placeholder="Insira o Customer ID"
                disabled={activeProvider !== "agora"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agora-customer-secret">Segredo do Cliente (Customer Secret)</Label>
              <Input
                id="agora-customer-secret"
                type="password"
                value={agoraCustomerSecret}
                onChange={(e) => setAgoraCustomerSecret(e.target.value)}
                placeholder="Insira o Customer Secret"
                disabled={activeProvider !== "agora"}
              />
              <p className="text-[11px] text-muted-foreground">
                A chave secreta não é exibida por motivos de segurança, mas você ainda pode sobrescrever a atual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twilio API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração da API do Twilio</CardTitle>
                <CardDescription className="mt-1">Chamadas de vídeo e áudio fornecidas pelo Twilio</CardDescription>
              </div>
            </div>
            <Badge variant={activeProvider === "twilio" ? "default" : "secondary"} className="text-xs">
              {activeProvider === "twilio" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Chamadas de Vídeo / Áudio do Twilio</Label>
              <p className="text-xs text-muted-foreground">
                Ative o Twilio para iniciar o serviço de chat de vídeo. Habilitar o Twilio desativará o Agora. O Twilio suporta chamadas de vídeo e áudio.
              </p>
            </div>
            <Switch
              checked={activeProvider === "twilio"}
              onCheckedChange={(checked) => setActiveProvider(checked ? "twilio" : "none")}
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Para começar a usar este recurso, você precisará criar uma conta no{" "}
              <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Twilio <ExternalLink className="w-3 h-3" />
              </a>{" "}
              e contratar o produto "Programmable Video".
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="twilio-account-sid">SID da Conta de Produção (Live Account SID)</Label>
              <Input
                id="twilio-account-sid"
                value={twilioAccountSid}
                onChange={(e) => setTwilioAccountSid(e.target.value)}
                placeholder="Insira o SID da Conta"
                disabled={activeProvider !== "twilio"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-api-key-sid">SID da Chave de API (API Key SID)</Label>
              <Input
                id="twilio-api-key-sid"
                value={twilioApiKeySid}
                onChange={(e) => setTwilioApiKeySid(e.target.value)}
                placeholder="Insira o SID da Chave de API"
                disabled={activeProvider !== "twilio"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-api-key-secret">Segredo da Chave de API (API Key Secret)</Label>
              <Input
                id="twilio-api-key-secret"
                type="password"
                value={twilioApiKeySecret}
                onChange={(e) => setTwilioApiKeySecret(e.target.value)}
                placeholder="Insira o Segredo da Chave de API"
                disabled={activeProvider !== "twilio"}
              />
              <p className="text-[11px] text-muted-foreground">
                A chave secreta não é exibida por motivos de segurança, mas você ainda pode sobrescrever a atual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default AdminVideoAudioSettings;
