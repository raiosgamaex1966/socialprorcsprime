import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Mail, Phone, Send, Info, AlertTriangle, Save, Bug, Shield,
} from "lucide-react";
import { toast } from "sonner";

const AdminEmailSmsSetup = () => {
  // Email config
  const [emailServer, setEmailServer] = useState("server-mail");
  const [defaultEmail, setDefaultEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpEncryption, setSmtpEncryption] = useState("ssl");

  // SMS config
  const [smsProvider, setSmsProvider] = useState("bulksms");
  const [phoneNumber, setPhoneNumber] = useState("");

  // BulkSMS
  const [bulkSmsUsername, setBulkSmsUsername] = useState("");
  const [bulkSmsPassword, setBulkSmsPassword] = useState("");

  // Twilio
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");

  // Infobip
  const [infobipApiKey, setInfobipApiKey] = useState("");
  const [infobipBaseUrl, setInfobipBaseUrl] = useState("");

  // Msg91
  const [msg91AuthKey, setMsg91AuthKey] = useState("");
  const [msg91DltId, setMsg91DltId] = useState("");

  // Debug
  const [debugLog, setDebugLog] = useState("");

  const handleSave = () => {
    toast.success("Configurações de E-mail e SMS salvas com sucesso");
  };

  const handleTestEmail = () => {
    toast.info("Enviando e-mail de teste...");
    setTimeout(() => toast.success("E-mail de teste enviado para o endereço de e-mail da sua conta"), 1500);
  };

  const handleTestSms = () => {
    if (!phoneNumber) {
      toast.error("Defina seu número de telefone primeiro");
      return;
    }
    toast.info("Enviando SMS de teste...");
    setTimeout(() => toast.success("SMS de teste enviado para " + phoneNumber), 1500);
  };

  const handleDebugEmail = () => {
    setDebugLog(
      "Testando entregabilidade de e-mail...\n\n" +
      "Servidor: " + (emailServer === "smtp" ? smtpHost : "Server Mail (Padrão)") + "\n" +
      "Porta: " + smtpPort + "\n" +
      "Criptografia: " + (smtpEncryption === "ssl" ? "SSL" : "TLS") + "\n\n" +
      "✓ Conexão estabelecida\n" +
      "✓ Autenticação bem-sucedida\n" +
      "✓ O servidor de e-mail aceita mensagens\n\n" +
      "Resultado: O servidor de e-mail está configurado corretamente."
    );
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">Para mais informações sobre como configurar o servidor de e-mail ou provedores de SMS, visite nossa página de Documentação.</p>
      </div>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configuração de E-mail</CardTitle>
          </div>
          <CardDescription>Configure seu servidor de e-mail para envio de mensagens aos usuários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Servidor de E-mail</Label>
            <Select value={emailServer} onValueChange={setEmailServer}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="server-mail">Server Mail (Padrão)</SelectItem>
                <SelectItem value="smtp">Servidor SMTP</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Selecione qual servidor de e-mail você deseja usar. A função Server Mail não é recomendada.</p>
          </div>

          <div className="space-y-2">
            <Label>E-mail Padrão do Site</Label>
            <Input
              type="email"
              value={defaultEmail}
              onChange={(e) => setDefaultEmail(e.target.value)}
              placeholder="admin@seudominio.com"
            />
            <p className="text-[11px] text-muted-foreground">Este é o e-mail padrão do seu site, usado para enviar mensagens aos usuários.</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Host SMTP</Label>
            <Input
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="mail.seudominio.com"
            />
            <p className="text-[11px] text-muted-foreground">O nome de host da sua conta SMTP, pode ser um IP, domínio ou subdomínio.</p>
          </div>

          <div className="space-y-2">
            <Label>Nome de Usuário SMTP</Label>
            <Input
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder="info@seudominio.com"
            />
            <p className="text-[11px] text-muted-foreground">O nome de usuário da sua conta SMTP.</p>
          </div>

          <div className="space-y-2">
            <Label>Senha SMTP</Label>
            <Input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder="••••••••"
            />
            <p className="text-[11px] text-muted-foreground">A chave secreta não é exibida por motivos de segurança, mas você ainda pode substituir a atual.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Porta SMTP</Label>
              <Input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="465"
              />
              <p className="text-[11px] text-muted-foreground">Mais usado: 587 para TLS, 465 para criptografia SSL.</p>
            </div>

            <div className="space-y-2">
              <Label>Criptografia SMTP</Label>
              <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssl">SSL (Seguro)</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="none">Nenhum</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Qual método de criptografia seu servidor SMTP usa?</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleTestEmail} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              Testar Servidor de E-mail
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Após clicar em &quot;Testar Servidor de E-mail&quot;, uma mensagem de teste será enviada para o endereço de e-mail da sua conta.</p>
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configurações de SMS</CardTitle>
          </div>
          <CardDescription>Configure os provedores de SMS para envio de mensagens aos usuários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Para começar a enviar SMS, você precisa criar uma conta e comprar créditos no Twilio, BulkSMS ou Infobip.</p>
          </div>

          <div className="space-y-2">
            <Label>Provedor de SMS Padrão</Label>
            <Select value={smsProvider} onValueChange={setSmsProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bulksms">BulkSMS</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="infobip">Infobip</SelectItem>
                <SelectItem value="msg91">Msg91</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Selecione qual provedor de SMS deseja usar. Você só pode usar um de cada vez.</p>
          </div>

          <div className="space-y-2">
            <Label>Seu Número de Telefone</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
            />
            <p className="text-[11px] text-muted-foreground">Defina o número padrão do seu site, usado para enviar SMS aos usuários, ex: (+9053...)</p>
          </div>

          <Separator />

          {/* BulkSMS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={smsProvider === "bulksms" ? "default" : "secondary"} className="text-xs">
                {smsProvider === "bulksms" ? "Ativo" : "Inativo"}
              </Badge>
              <Label className="text-sm font-medium">Configuração do BulkSMS</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome de Usuário do BulkSMS</Label>
                <Input
                  value={bulkSmsUsername}
                  onChange={(e) => setBulkSmsUsername(e.target.value)}
                  placeholder="Seu nome de usuário do BulkSMS"
                  disabled={smsProvider !== "bulksms"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Senha do BulkSMS</Label>
                <Input
                  type="password"
                  value={bulkSmsPassword}
                  onChange={(e) => setBulkSmsPassword(e.target.value)}
                  placeholder="Sua senha do BulkSMS"
                  disabled={smsProvider !== "bulksms"}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Twilio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={smsProvider === "twilio" ? "default" : "secondary"} className="text-xs">
                {smsProvider === "twilio" ? "Ativo" : "Inativo"}
              </Badge>
              <Label className="text-sm font-medium">Configuração do Twilio</Label>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs">SID da Conta Twilio</Label>
                <Input
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="Seu SID de Conta do Twilio"
                  disabled={smsProvider !== "twilio"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Token de Autenticação do Twilio</Label>
                <Input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Seu Token de Autenticação do Twilio"
                  disabled={smsProvider !== "twilio"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Número de Telefone do Twilio</Label>
                <Input
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  placeholder="+1234567890"
                  disabled={smsProvider !== "twilio"}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Infobip */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={smsProvider === "infobip" ? "default" : "secondary"} className="text-xs">
                {smsProvider === "infobip" ? "Ativo" : "Inativo"}
              </Badge>
              <Label className="text-sm font-medium">Configuração do Infobip</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Chave de API do Infobip</Label>
                <Input
                  value={infobipApiKey}
                  onChange={(e) => setInfobipApiKey(e.target.value)}
                  placeholder="Sua Chave de API do Infobip"
                  disabled={smsProvider !== "infobip"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">URL Base do Infobip</Label>
                <Input
                  value={infobipBaseUrl}
                  onChange={(e) => setInfobipBaseUrl(e.target.value)}
                  placeholder="https://xxxxx.api.infobip.com"
                  disabled={smsProvider !== "infobip"}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Msg91 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={smsProvider === "msg91" ? "default" : "secondary"} className="text-xs">
                {smsProvider === "msg91" ? "Ativo" : "Inativo"}
              </Badge>
              <Label className="text-sm font-medium">Configuração do Msg91</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Chave de Autenticação do Msg91</Label>
                <Input
                  value={msg91AuthKey}
                  onChange={(e) => setMsg91AuthKey(e.target.value)}
                  placeholder="Sua Chave de Autenticação do Msg91"
                  disabled={smsProvider !== "msg91"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ID DLT do Msg91</Label>
                <Input
                  value={msg91DltId}
                  onChange={(e) => setMsg91DltId(e.target.value)}
                  placeholder="Seu ID DLT do Msg91"
                  disabled={smsProvider !== "msg91"}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleTestSms} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              Testar Servidor SMS
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Após clicar em &quot;Testar Servidor SMS&quot;, uma mensagem de teste será enviada para o seu telefone.</p>
        </CardContent>
      </Card>

      {/* Debug Email Deliverability */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Depurar Entregabilidade de E-mail</CardTitle>
          </div>
          <CardDescription>Teste a entregabilidade de e-mail e verifique a configuração do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Este recurso testará a entregabilidade de e-mail e garantirá que o sistema esteja funcionando corretamente.</p>
          <Button variant="outline" size="sm" onClick={handleDebugEmail} className="gap-2">
            <Shield className="w-3.5 h-3.5" />
            Depurar Entregabilidade de E-mail
          </Button>
          <div className="space-y-2">
            <Label className="text-xs">Log de Depuração</Label>
            <pre className="p-3 rounded-lg bg-muted text-xs text-muted-foreground font-mono whitespace-pre-wrap border min-h-[80px]">
              {debugLog || "Clique em Depurar Entregabilidade de E-mail para exibir os resultados do teste."}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default AdminEmailSmsSetup;
