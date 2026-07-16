import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Save, ChevronDown, Info } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface EmailTemplateField {
  id: string;
  label: string;
  description: string;
  variables: string[];
  defaultValue: string;
}

const emailTemplates: EmailTemplateField[] = [
  {
    id: "activate_account",
    label: "Ativar Conta",
    description: "Enviado quando um novo usuário se registra e precisa verificar seu endereço de e-mail.",
    variables: ["{{USERNAME}}", "{{SITE_URL}}", "{{EMAIL}}", "{{CODE}}", "{{SITE_NAME}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Welcome to {{SITE_NAME}}, {{USERNAME}}!</h2>
  <p>Thank you for registering. Please use the code below to activate your account:</p>
  <div style="background: #f0f2f5; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
    {{CODE}}
  </div>
  <p style="margin-top: 16px;">If you did not create this account, you can ignore this email.</p>
 </div>`,
  },
  {
    id: "invite_email",
    label: "E-mail de Convite",
    description: "Enviado quando um usuário convida alguém para participar da plataforma.",
    variables: ["{{USERNAME}}", "{{SITE_URL}}", "{{NAME}}", "{{URL}}", "{{SITE_NAME}}", "{{BACKGOUND_COLOR}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>You've been invited to {{SITE_NAME}}!</h2>
  <p>Hi {{NAME}}, {{USERNAME}} has invited you to join {{SITE_NAME}}.</p>
  <a href="{{URL}}" style="display: inline-block; padding: 12px 24px; background: {{BACKGOUND_COLOR}}; color: #fff; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
 </div>`,
  },
  {
    id: "login_with",
    label: "Entrar Com",
    description: "Enviado quando um usuário faz login usando um provedor social ou externo.",
    variables: ["{{FIRST_NAME}}", "{{SITE_NAME}}", "{{USERNAME}}", "{{EMAIL}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Welcome back, {{FIRST_NAME}}!</h2>
  <p>You just signed in to {{SITE_NAME}} using your external account.</p>
  <p>Username: {{USERNAME}}<br/>Email: {{EMAIL}}</p>
 </div>`,
  },
  {
    id: "notification",
    label: "Notificação",
    description: "E-mail de notificação geral enviado para vários alertas de atividade.",
    variables: ["{{SITE_NAME}}", "{{NOTIFY_URL}}", "{{NOTIFY_AVATAR}}", "{{NOTIFY_NAME}}", "{{TEXT_TYPE}}", "{{TEXT}}", "{{URL}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="{{NOTIFY_AVATAR}}" alt="{{NOTIFY_NAME}}" style="width: 48px; height: 48px; border-radius: 50%;" />
    <div>
      <strong>{{NOTIFY_NAME}}</strong> {{TEXT_TYPE}}
    </div>
  </div>
  <p>{{TEXT}}</p>
  <a href="{{URL}}" style="display: inline-block; padding: 10px 20px; background: #247b7b; color: #fff; text-decoration: none; border-radius: 6px;">View on {{SITE_NAME}}</a>
 </div>`,
  },
  {
    id: "payment_declined",
    label: "Pagamento Recusado",
    description: "Enviado quando o pagamento de um usuário é recusado.",
    variables: ["{{name}}", "{{amount}}", "{{site_name}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Payment Declined</h2>
  <p>Hi {{name}}, your payment of <strong>{{amount}}</strong> on {{site_name}} was declined.</p>
  <p>Please check your payment method and try again.</p>
 </div>`,
  },
  {
    id: "payment_approved",
    label: "Pagamento Aprovado",
    description: "Enviado quando o pagamento de um usuário é processado com sucesso.",
    variables: ["{{name}}", "{{amount}}", "{{site_name}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Payment Approved ✓</h2>
  <p>Hi {{name}}, your payment of <strong>{{amount}}</strong> on {{site_name}} has been approved.</p>
  <p>Thank you for your purchase!</p>
 </div>`,
  },
  {
    id: "recover",
    label: "Recuperar Senha",
    description: "Enviado quando um usuário solicita a redefinição de senha.",
    variables: ["{{USERNAME}}", "{{SITE_NAME}}", "{{LINK}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Reset Your Password</h2>
  <p>Hi {{USERNAME}}, we received a request to reset your password on {{SITE_NAME}}.</p>
  <a href="{{LINK}}" style="display: inline-block; padding: 12px 24px; background: #247b7b; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a>
  <p style="margin-top: 16px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
 </div>`,
  },
  {
    id: "unusual_login",
    label: "Login Incomum",
    description: "Enviado quando uma tentativa de login é detectada de uma localização ou dispositivo incomum.",
    variables: ["{{USERNAME}}", "{{SITE_NAME}}", "{{CODE}}", "{{DATE}}", "{{EMAIL}}", "{{COUNTRY_CODE}}", "{{IP_ADDRESS}}", "{{CITY}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>⚠️ Unusual Login Detected</h2>
  <p>Hi {{USERNAME}}, we detected a login attempt on your {{SITE_NAME}} account from an unusual location.</p>
 </div>`,
  },
  {
    id: "account_deleted",
    label: "Conta Excluída",
    description: "Enviado quando a conta de um usuário é excluída.",
    variables: ["{{USERNAME}}", "{{SITE_NAME}}"],
    defaultValue: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Account Deleted</h2>
  <p>Hi {{USERNAME}}, your account on {{SITE_NAME}} has been successfully deleted.</p>
 </div>`,
  },
];

const AdminEmails = () => {
  const { settings, loading, saving, saveSettings } = useSiteSettings("email_templates");
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    emailTemplates.forEach((t) => (init[t.id] = t.defaultValue));
    return init;
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings && Object.keys(settings).length) {
      setTemplates((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    await saveSettings(templates);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Editar E-mails do Sistema
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize os modelos HTML para todos os e-mails do sistema. Os modelos são salvos no banco de dados e consumidos pelas funções de e-mail transacional.
        </p>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Se você deseja adicionar textos traduzidos, pode usar <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{"{{LANG key}}"}</code> e substituir <em>key</em> pela chave dos Idiomas.
        </p>
      </div>

      {emailTemplates.map((template) => (
        <Collapsible
          key={template.id}
          open={openSections[template.id] ?? false}
          onOpenChange={() => toggleSection(template.id)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">{template.label}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-normal">HTML Permitido</Badge>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      openSections[template.id] ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground mr-1 self-center">Variáveis:</span>
                  {template.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {v}
                    </Badge>
                  ))}
                </div>

                <Textarea
                  value={templates[template.id]}
                  onChange={(e) =>
                    setTemplates((prev) => ({ ...prev, [template.id]: e.target.value }))
                  }
                  className="font-mono text-xs min-h-[180px] resize-y"
                  placeholder="Insira o modelo HTML..."
                />

                <p className="text-[10px] text-muted-foreground">
                  Certifique-se de adicionar {template.variables.join(" , ")} no local correto.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Modelos de E-mail"}
        </Button>
      </div>
    </div>
  );
};

export default AdminEmails;
