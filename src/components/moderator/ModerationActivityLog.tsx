import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface LogEntry {
  id: string;
  moderator_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
  moderator_profile?: { display_name: string | null } | null;
}

const actionLabels: Record<string, string> = {
  report_approved: "Denúncia Aprovada",
  report_rejected: "Denúncia Rejeitada",
  report_escalated: "Denúncia Escalada",
  report_reviewed: "Denúncia Revisada",
  report_dismissed: "Denúncia Descartada",
  warning_issued: "Aviso Emitido",
  user_suspended: "Usuário Suspenso",
  user_banned: "Usuário Banido",
  ban_revoked: "Banimento/Aviso Revogado",
  content_removed: "Conteúdo Removido",
  bulk_action: "Ação em Massa",
};

const actionColors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  report_approved: "default",
  report_rejected: "secondary",
  report_escalated: "outline",
  warning_issued: "secondary",
  user_suspended: "destructive",
  user_banned: "destructive",
  ban_revoked: "default",
  content_removed: "destructive",
  bulk_action: "outline",
};

const ModerationActivityLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("moderation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") query = query.eq("action_type", actionFilter);

      const { data } = await query;
      const items = data || [];

      if (items.length > 0) {
        const modIds = [...new Set(items.map((l: any) => l.moderator_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", modIds as string[]);

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        items.forEach((l: any) => {
          l.moderator_profile = profileMap.get(l.moderator_id) || null;
        });
      }

      setLogs(items);
      setLoading(false);
    };
    fetchLogs();
  }, [actionFilter]);

  const formatDetails = (details: Record<string, any>): string => {
    if (!details || Object.keys(details).length === 0) return "—";
    const parts: string[] = [];
    if (details.count) parts.push(`${details.count} itens`);
    if (details.action) parts.push(details.action);
    if (details.type) parts.push(details.type);
    if (details.reason) parts.push(details.reason);
    if (details.review_note) parts.push(`Nota: ${details.review_note}`);
    if (details.duration_hours) parts.push(`${details.duration_hours}h`);
    return parts.join(" · ") || "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">Registro de Atividades de Moderação</h2>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Ações</SelectItem>
            {Object.entries(actionLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Moderador</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data e Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm font-medium">
                      {entry.moderator_profile?.display_name || "Desconhecido"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColors[entry.action_type] || "secondary"} className="text-xs">
                        {actionLabels[entry.action_type] || entry.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.target_type ? (
                        <span className="capitalize">
                          {entry.target_type === "post" ? "publicação" : entry.target_type === "comment" ? "comentário" : entry.target_type === "report" ? "denúncia" : entry.target_type === "user" ? "usuário" : entry.target_type}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {formatDetails(entry.details)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma atividade de moderação encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModerationActivityLog;
