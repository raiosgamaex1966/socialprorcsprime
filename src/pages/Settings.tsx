import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useDarkMode } from "@/hooks/useDarkMode";
import useNotificationSound from "@/hooks/useNotificationSound";
import useWebNotifications from "@/hooks/useWebNotifications";
import { ArrowLeft, Bell, Globe, HelpCircle, Palette, Shield, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AppPageShell from "@/components/AppPageShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sections = [
  { id: "account", label: "Conta", icon: User },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "privacy", label: "Privacidade e Segurança", icon: Shield },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "language", label: "Idioma e Região", icon: Globe },
  { id: "help", label: "Ajuda e Suporte", icon: HelpCircle },
] as const;

type SectionId = (typeof sections)[number]["id"];

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useCurrentProfile();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { setEnabled: setSoundEnabled, isEnabled: isSoundEnabled } = useNotificationSound();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const { permission, requestPermission, isSupported } = useWebNotifications();
  const [activeSection, setActiveSection] = useState<SectionId>("account");

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Falha ao salvar o perfil");
    } else {
      toast.success("Perfil atualizado");
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Conta</CardTitle>
              <CardDescription>Gerencie suas informações e preferências da conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Seu e-mail não pode ser alterado aqui</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome de exibição"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fale um pouco sobre você"
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-destructive mb-2">Zona de Perigo</h4>
                <Button variant="destructive" onClick={signOut}>
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificação</CardTitle>
              <CardDescription>Controle como você recebe as notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sons de Notificação</Label>
                  <p className="text-sm text-muted-foreground">Reproduzir um som ao receber notificações</p>
                </div>
                <Switch
                  checked={soundOn}
                  onCheckedChange={(checked) => {
                    setSoundOn(checked);
                    setSoundEnabled(checked);
                  }}
                />
              </div>
              <Separator />
              {isSupported && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações na Área de Trabalho</Label>
                    <p className="text-sm text-muted-foreground">
                      {permission === "granted"
                        ? "As notificações na área de trabalho estão ativadas"
                        : permission === "denied"
                          ? "As notificações na área de trabalho estão bloqueadas pelo seu navegador"
                          : "Receba notificações mesmo quando a aba estiver em segundo plano"}
                    </p>
                  </div>
                  {permission === "granted" ? (
                    <span className="text-sm font-medium text-primary">Ativado</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={requestPermission} disabled={permission === "denied"}>
                      Ativar
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "privacy":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Privacidade e Segurança</CardTitle>
              <CardDescription>Gerencie suas configurações de privacidade e segurança da conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status Online</Label>
                  <p className="text-sm text-muted-foreground">Mostrar quando você estiver ativo no Social Pro</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmações de Leitura</Label>
                  <p className="text-sm text-muted-foreground">Permitir que as pessoas saibam quando você leu as mensagens delas</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Usuários Bloqueados</Label>
                <p className="text-sm text-muted-foreground">Gerencie os usuários que você bloqueou</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/safety")}>
                  Ver Central de Segurança
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "appearance":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a aparência do Social Pro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">Usar o tema escuro para uma experiência visual confortável</p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDark} />
              </div>
            </CardContent>
          </Card>
        );

      case "language":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Idioma e Região</CardTitle>
              <CardDescription>Defina seu idioma preferido e configurações regionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <p className="text-sm text-muted-foreground">Português (BR) — mais idiomas em breve</p>
              </div>
              <div className="space-y-2">
                <Label>Fuso Horário</Label>
                <p className="text-sm text-muted-foreground">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "help":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Ajuda e Suporte</CardTitle>
              <CardDescription>Obtenha ajuda para usar o Social Pro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/safety")}>
                <Shield className="w-4 h-4" />
                Central de Segurança
              </Button>
              <p className="text-sm text-muted-foreground">
                Para ajuda adicional, entre em contato com o suporte ou visite nossa central de ajuda.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AppPageShell as="div">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav - horizontal scroll on mobile, vertical on desktop */}
        <nav className="flex flex-wrap md:flex-col md:w-56 md:shrink-0 gap-1 pb-2 md:pb-0">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeSection === id
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-secondary"
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </AppPageShell>
  );
};

export default Settings;
