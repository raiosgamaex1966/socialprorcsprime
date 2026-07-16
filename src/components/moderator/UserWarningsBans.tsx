import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert, Ban, AlertTriangle, Loader2, Plus, Undo2,
} from "lucide-react";
import { toast } from "sonner";

interface Warning {
  id: string;
  user_id: string;
  issued_by: string;
  type: string;
  reason: string;
  details: string | null;
  duration_hours: number | null;
  expires_at: string | null;
  is_active: boolean;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
  user_profile?: { display_name: string | null } | null;
  issuer_profile?: { display_name: string | null } | null;
}

const typeIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  suspension: ShieldAlert,
  ban: Ban,
};

const typeColors: Record<string, string> = {
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  suspension: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  ban: "bg-destructive/10 text-destructive border-destructive/30",
};

const logModAction = async (moderatorId: string, actionType: string, targetType: string, targetId: string, details: Record<string, any> = {}) => {
  await (supabase as any).from("moderation_log").insert({
    moderator_id: moderatorId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    details,
  });
};

const UserWarningsBans = () => {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; userId: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Create form
  const [targetEmail, setTargetEmail] = useState("");
  const [warningType, setWarningType] = useState("warning");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [durationHours, setDurationHours] = useState("");

  const fetchWarnings = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("user_warnings")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "active") query = query.eq("is_active", true);
    else if (filter === "revoked") query = query.eq("is_active", false);
    if (typeFilter !== "all") query = query.eq("type", typeFilter);

    const { data } = await query;
    const items = data || [];

    // Fetch profiles for user_id and issued_by
    if (items.length > 0) {
      const allIds = [...new Set([
        ...items.map((w: any) => w.user_id),
        ...items.map((w: any) => w.issued_by),
      ])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", allIds as string[]);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      items.forEach((w: any) => {
        w.user_profile = profileMap.get(w.user_id) || null;
        w.issuer_profile = profileMap.get(w.issued_by) || null;
      });
    }

    setWarnings(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchWarnings();
  }, [filter, typeFilter]);

  const handleCreate = async () => {
    if (!user || !reason.trim()) return;
    setProcessing(true);

    // Look up user by email or display name
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", `%${targetEmail}%`)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      toast.error("Usuário não encontrado. Tente pesquisar pelo nome de exibição.");
      setProcessing(false);
      return;
    }

    const targetUserId = profiles[0].user_id;
    const durHours = durationHours ? parseInt(durationHours) : null;
    const expiresAt = durHours ? new Date(Date.now() + durHours * 3600000).toISOString() : null;

    const { data: inserted, error } = await (supabase as any)
      .from("user_warnings")
      .insert({
        user_id: targetUserId,
        issued_by: user.id,
        type: warningType,
        reason: reason.trim(),
        details: details.trim() || null,
        duration_hours: durHours,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      toast.error("Falha ao aplicar ação");
      setProcessing(false);
      return;
    }

    const actionMap: Record<string, string> = {
      warning: "warning_issued",
      suspension: "user_suspended",
      ban: "user_banned",
    };
    await logModAction(user.id, actionMap[warningType] || "warning_issued", "user", targetUserId, {
      warning_id: inserted?.id,
      type: warningType,
      reason,
      duration_hours: durHours,
    });

    const actionLabelMap: Record<string, string> = {
      warning: "Aviso",
      suspension: "Suspensão",
      ban: "Banimento",
    };
    toast.success(`${actionLabelMap[warningType] || warningType} aplicado`);
    setShowCreate(false);
    resetForm();
    setProcessing(false);
    fetchWarnings();
  };

  const handleRevoke = async (warningId: string, userId: string) => {
    if (!user) return;
    setProcessing(true);
    await (supabase as any)
      .from("user_warnings")
      .update({
        is_active: false,
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", warningId);

    await logModAction(user.id, "ban_revoked", "user", userId, { warning_id: warningId });
    toast.success("Ação revogada");
    setProcessing(false);
    setConfirmRevoke(null);
    setWarnings((prev) =>
      prev.map((w) => (w.id === warningId ? { ...w, is_active: false, revoked_by: user.id } : w))
    );
  };

  const resetForm = () => {
    setTargetEmail("");
    setWarningType("warning");
    setReason("");
    setDetails("");
    setDurationHours("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">Avisos e Banimentos de Usuários</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="warning">Avisos</SelectItem>
              <SelectItem value="suspension">Suspensões</SelectItem>
              <SelectItem value="ban">Banimentos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {["active", "revoked", "all"].map((f) => {
              const labelMap: Record<string, string> = {
                active: "Ativos",
                revoked: "Revogados",
                all: "Todos",
              };
              return (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFilter(f)}>
                  {labelMap[f] || f}
                </Button>
              );
            })}
          </div>
          <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Aplicar Ação
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Emitido Por</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warnings.map((w) => {
                  const Icon = typeIcons[w.type] || AlertTriangle;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm font-medium">
                        {w.user_profile?.display_name || "Desconhecido"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${typeColors[w.type] || ""}`} variant="outline">
                          <Icon className="w-3 h-3 mr-1" />
                          {w.type === "warning" ? "Aviso" : w.type === "suspension" ? "Suspensão" : w.type === "ban" ? "Banimento" : w.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{w.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.issuer_profile?.display_name || "Sistema"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.expires_at ? new Date(w.expires_at).toLocaleDateString() : w.type === "ban" ? "Permanente" : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={w.is_active ? "destructive" : "secondary"} className="text-xs">
                          {w.is_active ? "Ativo" : "Revogado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {w.is_active && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmRevoke({ id: w.id, userId: w.user_id })} disabled={processing}>
                            <Undo2 className="w-3.5 h-3.5 mr-1" /> Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {warnings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aviso ou banimento encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Warning/Ban Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Aplicar Aviso / Suspensão / Banimento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Usuário (nome de exibição)</Label>
              <Input
                placeholder="Pesquisar por nome de exibição..."
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Tipo de Ação</Label>
              <Select value={warningType} onValueChange={setWarningType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="suspension">Suspensão</SelectItem>
                  <SelectItem value="ban">Banimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Motivo</Label>
              <Input
                placeholder="Motivo da ação..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Detalhes (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="mt-1 min-h-[60px] resize-none"
              />
            </div>
            {warningType === "suspension" && (
              <div>
                <Label className="text-sm">Duração (horas)</Label>
                <Input
                  type="number"
                  placeholder="ex: 24, 48, 168"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={processing || !reason.trim() || !targetEmail.trim()}>
                {warningType === "ban" ? <Ban className="w-4 h-4 mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                Aplicar {warningType === "warning" ? "Aviso" : warningType === "suspension" ? "Suspensão" : "Banimento"}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title="Revogar Ação"
        description="Tem certeza que deseja revogar este aviso/suspensão/banimento?"
        confirmLabel="Revogar"
        onConfirm={() => confirmRevoke && handleRevoke(confirmRevoke.id, confirmRevoke.userId)}
        loading={processing}
      />
    </div>
  );
};

export default UserWarningsBans;
