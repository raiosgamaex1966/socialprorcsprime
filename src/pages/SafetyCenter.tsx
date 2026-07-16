import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, UserX, Flag, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppPageShell from "@/components/AppPageShell";

const SafetyCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"blocked" | "reports">("blocked");

  // Blocked users with profiles
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const blockedIds = data.map((b: any) => b.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", blockedIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((b: any) => ({ ...b, profile: profileMap[b.blocked_id] }));
    },
    enabled: !!user,
  });

  // My reports
  const { data: myReports = [] } = useQuery({
    queryKey: ["my-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("listing_reports")
        .select("*")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const listingIds = data.map((r: any) => r.listing_id);
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title")
        .in("id", listingIds);
      const listingMap = Object.fromEntries((listings || []).map((l: any) => [l.id, l]));
      return data.map((r: any) => ({ ...r, listing: listingMap[r.listing_id] }));
    },
    enabled: !!user,
  });

  const handleUnblock = async (blockId: string) => {
    await supabase.from("blocked_users").delete().eq("id", blockId);
    toast.success("Usuário desbloqueado");
    queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "dismissed": return <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const tabs = [
    { key: "blocked" as const, label: "Usuários Bloqueados", icon: UserX, count: blockedUsers.length },
    { key: "reports" as const, label: "Minhas Denúncias", icon: Flag, count: myReports.length },
  ];

  return (
    <AppPageShell>
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Central de Segurança</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-secondary/50 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Blocked Users */}
        {activeTab === "blocked" && (
          <div className="space-y-2">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                 <p className="text-sm text-muted-foreground">Você não bloqueou ninguém</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Usuários bloqueados não podem ver seus classificados ou entrar em contato com você
                </p>
              </div>
            ) : (
              blockedUsers.map((block: any) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={block.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(block.profile?.display_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {block.profile?.display_name || "Usuário Desconhecido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bloqueado {formatDistanceToNow(new Date(block.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(block.id)}
                  >
                    Desbloquear
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Reports */}
        {activeTab === "reports" && (
          <div className="space-y-2">
            {myReports.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                 <p className="text-sm text-muted-foreground">Nenhuma denúncia enviada</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Denuncie classificados suspeitos para ajudar a manter o marketplace seguro
                </p>
              </div>
            ) : (
              myReports.map((report: any) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-card shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {report.listing?.title || "Classificado Excluído"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Denunciado {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(report.status)}
                      <Badge
                        variant={report.status === "resolved" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {report.status === "resolved" ? "resolvido" : report.status === "dismissed" ? "descartado" : "pendente"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{report.reason}</Badge>
                  </div>
                  {report.description && (
                    <p className="text-xs text-muted-foreground">{report.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
    </AppPageShell>
  );
};

export default SafetyCenter;
