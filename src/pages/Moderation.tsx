import socialproLogoDark from "@/assets/socialpro-logo-dark-2.png";
import socialproLogoLight from "@/assets/socialpro-logo-light-2.png";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useSiteBranding } from "@/hooks/useSiteBranding";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CmsEditor from "@/components/CmsEditor";
import AdminAdvertisements from "@/components/admin/AdminAdvertisements";
import AdminCustomCode from "@/components/admin/AdminCustomCode";
import AdminDesign from "@/components/admin/AdminDesign";
import AdminEmailSmsSetup from "@/components/admin/AdminEmailSmsSetup";
import AdminEmails from "@/components/admin/AdminEmails";
import AdminEventsManagement from "@/components/admin/AdminEventsManagement";
import AdminFileUploadSettings from "@/components/admin/AdminFileUploadSettings";
import AdminGenders from "@/components/admin/AdminGenders";
import AdminGroupsManagement from "@/components/admin/AdminGroupsManagement";
import AdminListingsManagement from "@/components/admin/AdminListingsManagement";
import AdminOnlineUsers from "@/components/admin/AdminOnlineUsers";
import AdminPagesManagement from "@/components/admin/AdminPagesManagement";
import AdminPostsManagement from "@/components/admin/AdminPostsManagement";
import AdminPushNotifications from "@/components/admin/AdminPushNotifications";
import AdminSendEmail from "@/components/admin/AdminSendEmail";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminUserAdvertisements from "@/components/admin/AdminUserAdvertisements";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminVerificationRequests from "@/components/admin/AdminVerificationRequests";
import AdminVerifiedSellers from "@/components/admin/AdminVerifiedSellers";
import AdminVideoAudioSettings from "@/components/admin/AdminVideoAudioSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  FileText,
  Flag,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Palette,
  Phone,
  Send,
  Settings,
  Shield,
  ShieldAlert, ShieldCheck,
  Trash2,
  Upload,
  Users,
  Video,
  Wifi,
  Wrench,
  X,
  XCircle
} from "lucide-react";
import { toast } from "sonner";


interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  listing?: { id: string; title: string; price: number; status: string; user_id: string };
  reporter?: { display_name: string | null };
}

interface FraudSignal {
  id: string;
  listing_id: string;
  signal_type: string;
  severity: string;
  description: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  metadata: any;
  listing?: { id: string; title: string; price: number; status: string; user_id: string };
}

type AdminSection = "overview" | "reports" | "fraud" | "cms" | "users" | "posts" | "listings" | "sellers" | "groups" | "pages" | "events" | "advertisements" | "user-ads" | "design" | "custom-code" | "emails" | "send-email" | "push-notifications" | "genders" | "verification" | "online-users" | "video-audio" | "file-upload" | "email-sms" | "settings";

const navItems: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "users", label: "Usuários", icon: Users },
  { id: "posts", label: "Publicações", icon: MessageSquare },
  { id: "groups", label: "Grupos", icon: Users },
  { id: "pages", label: "Páginas", icon: Globe2 },
  { id: "events", label: "Eventos", icon: CalendarDays },
  { id: "listings", label: "Anúncios", icon: Package },
  { id: "reports", label: "Denúncias", icon: Flag },
  { id: "fraud", label: "Sinais de Fraude", icon: Cpu },
  { id: "sellers", label: "Vendedores Verificados", icon: BadgeCheck },
  { id: "verification", label: "Solicitações de Verificação", icon: ShieldCheck },
  { id: "cms", label: "Páginas CMS", icon: FileText },
  { id: "advertisements", label: "Anúncios do Site", icon: Megaphone },
  { id: "user-ads", label: "Anúncios de Usuários", icon: Megaphone },
  { id: "design", label: "Design do Site", icon: Palette },
  { id: "custom-code", label: "Código Personalizado (JS/CSS)", icon: Code2 },
  { id: "emails", label: "Gerenciar E-mails", icon: Mail },
  { id: "send-email", label: "Enviar E-mail", icon: Send },
  { id: "push-notifications", label: "Notificações Push", icon: Bell },
  { id: "genders", label: "Gerenciar Gêneros", icon: Users },
  { id: "online-users", label: "Usuários Online", icon: Wifi },
  { id: "video-audio", label: "Vídeo e Áudio", icon: Video },
  { id: "file-upload", label: "Upload de Arquivos", icon: Upload },
  { id: "email-sms", label: "E-mail e SMS", icon: Phone },
  { id: "settings", label: "Configurações", icon: Settings },
];

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: AdminSection[];
}

const navGroups: NavGroup[] = [
  { label: "Visão Geral", icon: LayoutDashboard, items: ["overview"] },
  { label: "Gerenciamento de Conteúdo", icon: FolderOpen, items: ["users", "posts", "groups", "pages", "events", "listings"] },
  { label: "Moderação e Segurança", icon: Shield, items: ["reports", "fraud", "sellers", "verification"] },
  { label: "Conteúdo e Anúncios", icon: Megaphone, items: ["cms", "advertisements", "user-ads"] },
  { label: "Aparência", icon: Palette, items: ["design", "custom-code"] },
  { label: "Comunicação", icon: Mail, items: ["emails", "send-email", "push-notifications", "email-sms"] },
  { label: "Configurações do Sistema", icon: Wrench, items: ["genders", "online-users", "video-audio", "file-upload", "settings"] },
];

const Moderation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const { branding } = useSiteBranding();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fraudLoading, setFraudLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");
  const [fraudFilter, setFraudFilter] = useState<"unresolved" | "resolved" | "all">("unresolved");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<FraudSignal | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [platformStats, setPlatformStats] = useState({ users: 0, groups: 0, pages: 0, events: 0, listings: 0, posts: 0 });

  // Check admin role
  useEffect(() => {
    if (!user) return;
    const checkRole = async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
    };
    checkRole();
  }, [user]);

  // Fetch reports
  useEffect(() => {
    if (!isAdmin) return;
    const fetchReports = async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("listing_reports")
        .select("*, listing:listings(id, title, price, status, user_id)")
        .order("created_at", { ascending: false });

      if (filter === "pending") query = query.eq("status", "pending");
      else if (filter === "reviewed") query = query.neq("status", "pending");

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching listing reports:", error);
        setReports([]);
      } else {
        setReports((data || []) as Report[]);
      }
      setLoading(false);
    };
    fetchReports();
  }, [isAdmin, filter]);

  // Fetch fraud signals
  useEffect(() => {
    if (!isAdmin) return;
    const fetchFraudSignals = async () => {
      setFraudLoading(true);
      let query = (supabase as any)
        .from("listing_fraud_signals")
        .select("*, listing:listings(id, title, price, status, user_id)")
        .order("created_at", { ascending: false });

      if (fraudFilter === "unresolved") query = query.eq("resolved", false);
      else if (fraudFilter === "resolved") query = query.eq("resolved", true);

      const { data, error } = await query;
      if (error) {
        const { data: fallback } = await (supabase as any)
          .from("listing_fraud_signals")
          .select("*")
          .order("created_at", { ascending: false });
        setFraudSignals((fallback || []) as FraudSignal[]);
      } else {
        setFraudSignals((data || []) as FraudSignal[]);
      }
      setFraudLoading(false);
    };
    fetchFraudSignals();
  }, [isAdmin, fraudFilter]);

  // Fetch platform stats
  useEffect(() => {
    if (!isAdmin) return;
    const fetchStats = async () => {
      const [users, groups, pages, events, listings, posts] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase.from("pages").select("id", { count: "exact", head: true }),
        supabase.from("group_events").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
      ]);
      setPlatformStats({
        users: users.count || 0,
        groups: groups.count || 0,
        pages: pages.count || 0,
        events: events.count || 0,
        listings: listings.count || 0,
        posts: posts.count || 0,
      });
    };
    fetchStats();
  }, [isAdmin]);

  const handleAction = async (action: "dismiss" | "warn" | "remove") => {
    if (!selectedReport) return;
    setProcessing(true);
    const newStatus = action === "dismiss" ? "dismissed" : action === "warn" ? "warned" : "removed";
    await (supabase as any).from("listing_reports").update({ status: newStatus }).eq("id", selectedReport.id);
    if (action === "remove" && selectedReport.listing_id) {
      await (supabase as any).from("listings").update({ status: "removed" }).eq("id", selectedReport.listing_id);
    }
    const statusLabel = newStatus === "dismissed" ? "desconsiderada" : newStatus === "warned" ? "notificada" : "removida";
    toast.success(`Denúncia ${statusLabel} com sucesso`);
    setReports((prev) => prev.map((r) => (r.id === selectedReport.id ? { ...r, status: newStatus } : r)));
    setSelectedReport(null);
    setActionNote("");
    setProcessing(false);
  };

  const handleResolveSignal = async (resolve: boolean) => {
    if (!selectedSignal) return;
    setProcessing(true);
    await (supabase as any)
      .from("listing_fraud_signals")
      .update({ resolved: resolve, resolved_at: resolve ? new Date().toISOString() : null })
      .eq("id", selectedSignal.id);
    toast.success(resolve ? "Sinal resolvido" : "Sinal reaberto");
    setFraudSignals((prev) =>
      prev.map((s) => (s.id === selectedSignal.id ? { ...s, resolved: resolve, resolved_at: resolve ? new Date().toISOString() : null } : s))
    );
    setSelectedSignal(null);
    setProcessing(false);
  };

  const handleRemoveFromSignal = async () => {
    if (!selectedSignal) return;
    setProcessing(true);
    await (supabase as any).from("listings").update({ status: "removed" }).eq("id", selectedSignal.listing_id);
    await (supabase as any)
      .from("listing_fraud_signals")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", selectedSignal.id);
    toast.success("Anúncio removido e sinal resolvido");
    setFraudSignals((prev) => prev.map((s) => (s.id === selectedSignal.id ? { ...s, resolved: true } : s)));
    setSelectedSignal(null);
    setProcessing(false);
  };

  // Splash screen (index.html) covers initial loading — no duplicate preloader here.
  if (isAdmin === null) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar o painel de moderação.</p>
        <Button onClick={() => navigate("/")} variant="outline">Voltar ao Início</Button>
      </div>
    );
  }

  const pendingReports = reports.filter((r) => r.status === "pending").length;
  const unresolvedSignals = fraudSignals.filter((s) => !s.resolved).length;
  const totalActions = pendingReports + unresolvedSignals;

  const reportStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="destructive">Pendente</Badge>;
      case "dismissed": return <Badge variant="secondary">Desconsiderada</Badge>;
      case "warned": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Notificado</Badge>;
      case "removed": return <Badge className="bg-red-600/15 text-red-600 border-red-600/30">Removido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "high": return <Badge variant="destructive">Alta</Badge>;
      case "medium": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Média</Badge>;
      case "low": return <Badge variant="secondary">Baixa</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getBadgeCount = (section: AdminSection) => {
    if (section === "reports") return pendingReports;
    if (section === "fraud") return unresolvedSignals;
    if (section === "overview") return totalActions;
    return 0;
  };

  const sectionTitle = navItems.find((n) => n.id === activeSection)?.label || "Visão Geral";

  return (
    <>
      <div className="fixed inset-0 flex bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Left Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
        >
          {/* Sidebar header */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-border shrink-0">
            <img src={isDark ? (branding.darkLogoUrl || socialproLogoLight) : (branding.logoUrl || socialproLogoDark)} alt="Social Pro" className="h-7" />
            <span className="font-bold text-foreground text-lg">Painel Admin</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Nav items */}
          <ScrollArea className="flex-1 py-3">
            <nav className="px-3 space-y-1">
              {navGroups.map((group) => {
                const groupBadgeCount = group.items.reduce((sum, id) => sum + getBadgeCount(id), 0);
                const isGroupActive = group.items.includes(activeSection);

                // Single-item groups (Dashboard) render directly
                if (group.items.length === 1) {
                  const itemId = group.items[0];
                  const item = navItems.find((n) => n.id === itemId)!;
                  const count = getBadgeCount(itemId);
                  const isActive = activeSection === itemId;
                  return (
                    <button
                      key={itemId}
                      onClick={() => { setActiveSection(itemId); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {count > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">{count}</Badge>}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                }

                return (
                  <Collapsible key={group.label} defaultOpen={isGroupActive}>
                    <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary group">
                      <group.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1 text-left">{group.label}</span>
                      {groupBadgeCount > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">{groupBadgeCount}</Badge>}
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5">
                      {group.items.map((itemId) => {
                        const item = navItems.find((n) => n.id === itemId)!;
                        const count = getBadgeCount(itemId);
                        const isActive = activeSection === itemId;
                        return (
                          <button
                            key={itemId}
                            onClick={() => { setActiveSection(itemId); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {count > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">{count}</Badge>}
                            {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border shrink-0">
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/")}>
              ← Voltar ao App
            </Button>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Fixed header */}
          <header className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-border bg-card shrink-0">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{sectionTitle}</h1>
            {totalActions > 0 && (
              <Badge variant="destructive" className="text-xs">{totalActions} {totalActions > 1 ? "ações necessárias" : "ação necessária"}</Badge>
            )}
          </header>

          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="p-4 lg:p-6 max-w-5xl">

              {/* Overview Section */}
              {activeSection === "overview" && (
                <div className="space-y-6">
                  {/* Platform Stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Visão Geral da Plataforma</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: "Usuários", value: platformStats.users, icon: Users, section: "users" as AdminSection },
                        { label: "Grupos", value: platformStats.groups, icon: Users, section: "groups" as AdminSection },
                        { label: "Páginas", value: platformStats.pages, icon: Globe2, section: "pages" as AdminSection },
                        { label: "Eventos", value: platformStats.events, icon: CalendarDays, section: "events" as AdminSection },
                        { label: "Anúncios", value: platformStats.listings, icon: Package, section: "listings" as AdminSection },
                        { label: "Publicações", value: platformStats.posts, icon: MessageSquare, section: undefined },
                      ].map((stat) => (
                        <Card
                          key={stat.label}
                          className={stat.section ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}
                          onClick={() => stat.section && setActiveSection(stat.section)}
                        >
                          <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                            <stat.icon className="w-5 h-5 text-primary mb-1" />
                            <p className="text-xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Moderation Stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Moderação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="cursor-pointer" onClick={() => setActiveSection("reports")}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{pendingReports}</p>
                            <p className="text-xs text-muted-foreground">Denúncias Pendentes</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="cursor-pointer" onClick={() => setActiveSection("fraud")}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{unresolvedSignals}</p>
                            <p className="text-xs text-muted-foreground">Sinais de Fraude Abertos</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{reports.filter((r) => r.status !== "pending").length}</p>
                            <p className="text-xs text-muted-foreground">Denúncias Analisadas</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{fraudSignals.filter((s) => s.resolved).length}</p>
                            <p className="text-xs text-muted-foreground">Sinais Resolvidos</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Logo do Site", desc: "Altere o logo no Design do Site", icon: Palette, section: "design" as AdminSection },
                        { label: "Design do Site", desc: "Personalize cores e marca", icon: Palette, section: "design" as AdminSection },
                        { label: "Configurações", desc: "Configure as opções da plataforma", icon: Settings, section: "settings" as AdminSection },
                        { label: "Código Personalizado", desc: "Adicione JS/CSS personalizado", icon: Code2, section: "custom-code" as AdminSection },
                        { label: "Usuários", desc: "Gerencie usuários e funções", icon: Users, section: "users" as AdminSection },
                        { label: "Páginas CMS", desc: "Gerencie as páginas de conteúdo", icon: Globe2, section: "cms" as AdminSection },
                        { label: "Verificação", desc: "Review verification requests", icon: ShieldCheck, section: "verification" as AdminSection },
                        { label: "E-mail & SMS", desc: "Configure e-mail e SMS", icon: Mail, section: "email-sms" as AdminSection },
                        { label: "Notificações Push", desc: "Configure notificações push", icon: Bell, section: "push-notifications" as AdminSection },
                        { label: "Anúncios", desc: "Gerencie os anúncios do site", icon: Megaphone, section: "advertisements" as AdminSection },
                        { label: "Upload de Arquivos", desc: "Configure upload de arquivos", icon: Package, section: "file-upload" as AdminSection },
                        { label: "Vídeo & Áudio", desc: "Configure opções de mídia", icon: Video, section: "video-audio" as AdminSection },
                      ].map((action) => (
                        <Card
                          key={action.label}
                          className="cursor-pointer hover:border-primary/30 transition-colors"
                          onClick={() => setActiveSection(action.section)}
                        >
                          <CardContent className="p-4 flex flex-col gap-2">
                            <action.icon className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{action.label}</p>
                              <p className="text-xs text-muted-foreground">{action.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reports.length === 0 && fraudSignals.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium">Tudo limpo! Nenhuma atividade recente.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[...reports.slice(0, 3).map((r) => ({
                            id: r.id, type: "report" as const, title: r.listing?.title || "Unknown",
                            detail: r.reason, date: r.created_at, status: r.status,
                          })),
                          ...fraudSignals.slice(0, 3).map((s) => ({
                            id: s.id, type: "fraud" as const, title: s.listing?.title || "Unknown",
                            detail: s.signal_type.replace(/_/g, " "), date: s.created_at, status: s.resolved ? "resolved" : "open",
                          }))]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                {item.type === "report"
                                  ? <Flag className="w-4 h-4 text-destructive shrink-0" />
                                  : <Cpu className="w-4 h-4 text-amber-600 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{item.detail}</p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Reports Section */}
              {activeSection === "reports" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="cursor-pointer" onClick={() => setFilter("pending")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <AlertTriangle className={`w-8 h-8 ${filter === "pending" ? "text-destructive" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{reports.filter((r) => r.status === "pending").length}</p>
                          <p className="text-xs text-muted-foreground">Revisão Pendente</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer" onClick={() => setFilter("reviewed")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle className={`w-8 h-8 ${filter === "reviewed" ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{reports.filter((r) => r.status !== "pending").length}</p>
                          <p className="text-xs text-muted-foreground">Analisadas</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer" onClick={() => setFilter("all")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Eye className={`w-8 h-8 ${filter === "all" ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{reports.length}</p>
                          <p className="text-xs text-muted-foreground">Total de Denúncias</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {filter === "pending" ? "Denúncias Pendentes" : filter === "reviewed" ? "Denúncias Analisadas" : "Todas as Denúncias"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="font-medium">Nenhuma denúncia para analisar</p>
                          <p className="text-sm">Tudo em dia! Volte mais tarde.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Anúncio</TableHead>
                              <TableHead>Motivo</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports.map((report) => (
                              <TableRow key={report.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">
                                  {report.listing?.title || report.listing_id.slice(0, 8) + "…"}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{report.reason}</span>
                                  {report.description && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{report.description}</p>
                                  )}
                                </TableCell>
                                <TableCell>{reportStatusBadge(report.status)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(report.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant={report.status === "pending" ? "default" : "outline"}
                                    onClick={() => setSelectedReport(report)}
                                  >
                                    {report.status === "pending" ? "Analisar" : "Visualizar"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Fraud Signals Section */}
              {activeSection === "fraud" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="cursor-pointer" onClick={() => setFraudFilter("unresolved")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <ShieldAlert className={`w-8 h-8 ${fraudFilter === "unresolved" ? "text-destructive" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{fraudSignals.filter((s) => !s.resolved).length}</p>
                          <p className="text-xs text-muted-foreground">Não resolvidos</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer" onClick={() => setFraudFilter("resolved")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle className={`w-8 h-8 ${fraudFilter === "resolved" ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{fraudSignals.filter((s) => s.resolved).length}</p>
                          <p className="text-xs text-muted-foreground">Resolvidos</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer" onClick={() => setFraudFilter("all")}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Bot className={`w-8 h-8 ${fraudFilter === "all" ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{fraudSignals.length}</p>
                          <p className="text-xs text-muted-foreground">Total de Sinais</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {fraudFilter === "unresolved" ? "Sinais de Fraude Não Resolvidos" : fraudFilter === "resolved" ? "Sinais Resolvidos" : "Todos os Sinais de Fraude"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {fraudLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : fraudSignals.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="font-medium">Nenhum sinal de fraude detectado</p>
                          <p className="text-sm">A detecção automática está funcionando. Nada marcado ainda.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Anúncio</TableHead>
                              <TableHead>Tipo de Sinal</TableHead>
                              <TableHead>Gravidade</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fraudSignals.map((signal) => (
                              <TableRow key={signal.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">
                                  {signal.listing?.title || signal.listing_id.slice(0, 8) + "…"}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm capitalize">{signal.signal_type.replace(/_/g, " ")}</span>
                                </TableCell>
                                <TableCell>{severityBadge(signal.severity)}</TableCell>
                                <TableCell>
                                  {signal.resolved
                                    ? <Badge variant="secondary">Resolvido</Badge>
                                    : <Badge variant="destructive">Aberto</Badge>}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(signal.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant={!signal.resolved ? "default" : "outline"}
                                    onClick={() => setSelectedSignal(signal)}
                                  >
                                    {!signal.resolved ? "Analisar" : "Visualizar"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Users Section */}
              {activeSection === "users" && <AdminUserManagement />}

              {/* Posts Section */}
              {activeSection === "posts" && <AdminPostsManagement />}

              {/* Listings Section */}
              {activeSection === "listings" && <AdminListingsManagement />}

              {/* Verified Sellers Section */}
              {activeSection === "sellers" && <AdminVerifiedSellers />}

              {/* Groups Section */}
              {activeSection === "groups" && <AdminGroupsManagement />}

              {/* Pages Section */}
              {activeSection === "pages" && <AdminPagesManagement />}

              {/* Events Section */}
              {activeSection === "events" && <AdminEventsManagement />}

              {/* CMS Pages Section */}
              {activeSection === "cms" && <CmsEditor />}

              {/* Advertisements Section */}
              {activeSection === "advertisements" && <AdminAdvertisements />}

              {/* User Advertisements Section */}
              {activeSection === "user-ads" && <AdminUserAdvertisements />}

              {/* Design Section */}
              {activeSection === "design" && <AdminDesign />}

              {/* Custom Code Section */}
              {activeSection === "custom-code" && <AdminCustomCode />}

              {/* Emails Section */}
              {activeSection === "emails" && <AdminEmails />}

              {/* Send Email Section */}
              {activeSection === "send-email" && <AdminSendEmail />}

              {/* Push Notifications Section */}
              {activeSection === "push-notifications" && <AdminPushNotifications />}

              {/* Genders Section */}
              {activeSection === "genders" && <AdminGenders />}

              {/* Verification Requests Section */}
              {activeSection === "verification" && <AdminVerificationRequests />}

              {/* Online Users Section */}
              {activeSection === "online-users" && <AdminOnlineUsers />}

              {/* Video & Audio Settings Section */}
              {activeSection === "video-audio" && <AdminVideoAudioSettings />}

              {/* File Upload Configuration Section */}
              {activeSection === "file-upload" && <AdminFileUploadSettings />}

              {/* Email & SMS Setup Section */}
              {activeSection === "email-sms" && <AdminEmailSmsSetup />}

              {/* Settings Section */}
              {activeSection === "settings" && <AdminSettings onNavigateToDesign={() => setActiveSection("design")} />}

            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Report Action dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisar Denúncia</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">Anúncio</p>
                    <p className="text-sm text-muted-foreground">{selectedReport.listing?.title || "Desconhecido"}</p>
                  </div>
                  {reportStatusBadge(selectedReport.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Motivo</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.reason}</p>
                </div>
                {selectedReport.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground">Detalhes</p>
                    <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.listing && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">Preço: <span className="text-foreground font-medium">${selectedReport.listing.price}</span></span>
                    <span className="text-muted-foreground">Status: <span className="text-foreground font-medium">{selectedReport.listing.status}</span></span>
                  </div>
                )}
              </div>

              {selectedReport.status === "pending" && (
                <>
                  <Textarea
                    placeholder="Nota interna (opcional)"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleAction("dismiss")} disabled={processing}>
                      <XCircle className="w-4 h-4 mr-1" /> Desconsiderar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction("warn")} disabled={processing}
                      className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 mr-1" /> Notificar Vendedor
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleAction("remove")} disabled={processing}>
                      <Trash2 className="w-4 h-4 mr-1" /> Remover Anúncio
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fraud Signal dialog */}
      <Dialog open={!!selectedSignal} onOpenChange={(o) => !o && setSelectedSignal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" /> Detalhes do Sinal de Fraude
            </DialogTitle>
          </DialogHeader>
          {selectedSignal && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">Anúncio</p>
                    <p className="text-sm text-muted-foreground">{selectedSignal.listing?.title || "Desconhecido"}</p>
                  </div>
                  <div className="flex gap-2">
                    {severityBadge(selectedSignal.severity)}
                    {selectedSignal.resolved
                      ? <Badge variant="secondary">Resolvido</Badge>
                      : <Badge variant="destructive">Aberto</Badge>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Tipo de Sinal</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedSignal.signal_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Descrição</p>
                  <p className="text-sm text-muted-foreground">{selectedSignal.description}</p>
                </div>
                {selectedSignal.listing && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">Preço: <span className="text-foreground font-medium">${selectedSignal.listing.price}</span></span>
                    <span className="text-muted-foreground">Status: <span className="text-foreground font-medium">{selectedSignal.listing.status}</span></span>
                  </div>
                )}
                {selectedSignal.metadata && (
                  <div>
                    <p className="text-sm font-medium text-foreground">Metadados</p>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-32 text-muted-foreground">
                      {JSON.stringify(selectedSignal.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {!selectedSignal.resolved && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleResolveSignal(true)} disabled={processing}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Marcar como Resolvido
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleRemoveFromSignal} disabled={processing}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remover Anúncio
                  </Button>
                </div>
              )}
              {selectedSignal.resolved && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleResolveSignal(false)} disabled={processing}>
                    Reabrir Sinal
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Moderation;
